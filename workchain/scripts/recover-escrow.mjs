#!/usr/bin/env node
/**
 * recover-escrow.mjs
 *
 * For projects stuck in "mock mode" (no contract_address in DB):
 *   1. Queries WorkchainFactory.getClientProjects() on Sepolia to find deployed escrow addresses
 *   2. Matches them to DB projects (by total_value_eth / milestone count)
 *   3. PATCHes the production API to save contract_address
 *   4. Resets mock-approved milestones back to the on-chain state
 *      (submitted → active, released → pending) so the real on-chain flow can proceed
 *
 * Usage:
 *   node scripts/recover-escrow.mjs
 *
 * Set API_BASE to your production backend URL:
 *   API_BASE=https://workchain-api.onrender.com node scripts/recover-escrow.mjs
 */

import { ethers } from "ethers";

// ── CONFIG ──────────────────────────────────────────────────────────────────
const RPC_URL       = "https://eth-sepolia.g.alchemy.com/v2/BBqgWCw5DmqAkIKhZfT0h";
const FACTORY_ADDR  = "0xc8596bbbF270C4E54752ddE1D4b4e67F81b9b4F0";
const API_BASE      = process.env.API_BASE || "http://localhost:8000";

// ── ABI fragments we need ────────────────────────────────────────────────────
const FACTORY_ABI = [
  "function getClientProjects(address client) view returns (address[])",
];
const ESCROW_ABI = [
  "function getProject() view returns (address client, address freelancer, address arbiter, uint256 totalBudget, uint256 currentMilestone, uint8 state, uint256 balance)",
  "function getMilestoneCount() view returns (uint256)",
  "function getMilestone(uint256 index) view returns (string title, string description, uint256 amount, uint256 deadline, uint8 status, string ipfsHash, string[] proofLinks)",
];

async function run() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Workchain Escrow Recovery Tool");
  console.log(`  API: ${API_BASE}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const factory  = new ethers.Contract(FACTORY_ADDR, FACTORY_ABI, provider);

  // 1. Fetch all DB projects without a contract_address
  const projRes = await fetch(`${API_BASE}/api/projects`);
  if (!projRes.ok) throw new Error("Failed to fetch projects: " + await projRes.text());
  const allProjects = await projRes.json();

  const stuck = allProjects.filter((p) => !p.contract_address);
  if (stuck.length === 0) {
    console.log("✓ No stuck projects found (all have contract_address).\n");
    return;
  }

  console.log(`Found ${stuck.length} project(s) missing contract_address:\n`);
  stuck.forEach((p) => {
    console.log(`  • [${p.id.slice(0,8)}...] "${p.title}" — client: ${p.client_wallet?.slice(0,10)}...`);
  });
  console.log();

  // 2. Collect unique client wallets
  const clients = [...new Set(stuck.map((p) => p.client_wallet).filter(Boolean))];

  // 3. For each client, get their on-chain deployed escrows
  const escrowMap = {}; // escrowAddress → on-chain data
  for (const client of clients) {
    console.log(`Querying factory for client ${client.slice(0,10)}...`);
    try {
      const addrs = await factory.getClientProjects(client);
      console.log(`  → ${addrs.length} escrow contract(s) found on-chain`);
      for (const addr of addrs) {
        try {
          const escrow = new ethers.Contract(addr, ESCROW_ABI, provider);
          const proj   = await escrow.getProject();
          const bal    = await provider.getBalance(addr);
          const count  = Number(await escrow.getMilestoneCount());
          const milestones = [];
          for (let i = 0; i < count; i++) {
            const m = await escrow.getMilestone(i);
            milestones.push({
              index:  i,
              title:  m[0],
              amount: ethers.formatEther(m[2]),
              status: Number(m[4]),
              ipfsHash: m[5],
            });
          }
          escrowMap[addr.toLowerCase()] = {
            address:          addr,
            client:           proj[0],
            freelancer:       proj[1],
            totalBudget:      ethers.formatEther(proj[3]),
            currentMilestone: Number(proj[4]),
            contractState:    Number(proj[5]),
            balance:          ethers.formatEther(bal),
            milestones,
          };
          console.log(`    ✓ ${addr} — balance: ${ethers.formatEther(bal)} ETH — state: ${Number(proj[5])}`);
        } catch (e) {
          console.log(`    ✗ ${addr} — failed to read (${e.message.slice(0, 60)})`);
        }
      }
    } catch (e) {
      console.log(`  ✗ Factory query failed: ${e.message.slice(0, 80)}`);
    }
  }
  console.log();

  // 4. Match stuck projects to escrow contracts and patch
  for (const proj of stuck) {
    console.log(`\n── Recovering "${proj.title}" [${proj.id.slice(0,8)}...] ──`);
    const totalEth = parseFloat(proj.total_value_eth);

    // Find escrow whose totalBudget ≈ project.total_value_eth and freelancer matches
    const match = Object.values(escrowMap).find((e) => {
      const budgetMatch = Math.abs(parseFloat(e.totalBudget) - totalEth) < 0.0001;
      const freelancerMatch = proj.freelancer_wallet &&
        e.freelancer.toLowerCase() === proj.freelancer_wallet.toLowerCase();
      return budgetMatch && freelancerMatch;
    });

    if (!match) {
      console.log(`  ✗ No matching on-chain escrow found for this project.`);
      console.log(`    Total: ${totalEth} ETH, freelancer: ${proj.freelancer_wallet?.slice(0,10)}...`);
      console.log(`  → Manual fix needed. Check Etherscan for client wallet to find the contract address.`);
      continue;
    }

    console.log(`  ✓ Matched escrow: ${match.address}`);
    console.log(`    On-chain balance: ${match.balance} ETH`);
    console.log(`    On-chain milestones: ${match.milestones.length}`);
    match.milestones.forEach((m) => {
      const labels = ['PENDING','ACTIVE','SUBMITTED','RELEASED','DISPUTED'];
      console.log(`      M-${m.index}: "${m.title}" — ${labels[m.status] ?? m.status} — ${m.amount} ETH`);
    });

    // Patch project with contract_address
    console.log(`\n  Patching contract_address in DB...`);
    const patchRes = await fetch(`${API_BASE}/api/projects/${proj.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contract_address: match.address }),
    });
    if (!patchRes.ok) {
      const err = await patchRes.text();
      console.log(`  ✗ PATCH failed: ${err}`);
      continue;
    }
    console.log(`  ✓ contract_address saved: ${match.address}`);

    // Reset any milestones that were mock-approved to their real on-chain state
    for (const dbMs of (proj.milestones || [])) {
      const onChainMs = match.milestones.find((m) => m.index === dbMs.milestone_index);
      if (!onChainMs) continue;

      const onChainStatusStr = ['pending','active','submitted','released','disputed'][onChainMs.status] ?? 'pending';
      const dbStatusStr = dbMs.status?.toLowerCase();

      if (dbStatusStr !== onChainStatusStr) {
        console.log(`  Resetting milestone ${dbMs.milestone_index} DB="${dbStatusStr}" → on-chain="${onChainStatusStr}"...`);
        const msRes = await fetch(`${API_BASE}/api/milestones/${dbMs.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: onChainStatusStr }),
        });
        if (msRes.ok) {
          console.log(`  ✓ Milestone ${dbMs.milestone_index} reset to "${onChainStatusStr}"`);
        } else {
          const err = await msRes.text();
          console.log(`  ✗ Milestone reset failed: ${err}`);
        }
      } else {
        console.log(`  ✓ Milestone ${dbMs.milestone_index} status matches (${dbStatusStr})`);
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Recovery complete.");
  console.log("\n  NEXT STEPS to release real ETH:");
  console.log("  1. Reload the project page — it will now read the real on-chain state");
  console.log("  2. Freelancer: click SIGN & SUBMIT TRANSACTION to submit on-chain");
  console.log("  3. Client: click APPROVE — RELEASE ETH to call the smart contract");
  console.log("  4. MetaMask will open — sign the transaction");
  console.log("  5. ETH is released to the freelancer's wallet automatically");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

run().catch((e) => {
  console.error("\n[ERROR]", e.message);
  process.exit(1);
});
