#!/usr/bin/env node
/**
 * Backfill contract_address for a stuck project that was saved without one.
 *
 * Usage:
 *   node scripts/backfill-contract-address.mjs <projectId> <contractAddress>
 *
 * Example:
 *   node scripts/backfill-contract-address.mjs \
 *     68cd2ecf-9e79-4a5a-b60e-eade1b5f8d62 \
 *     0xYourEscrowContractAddress
 *
 * Finding the escrow address:
 *   1. Go to https://sepolia.etherscan.io
 *   2. Search the client wallet address (0x29722...40d7 or 0x53a3e...FC0)
 *   3. Look for "Contract Creation" internal txns around the project creation date
 *   4. The newly deployed contract address is the escrow address
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function backfill(projectId, contractAddress) {
  if (!projectId || !contractAddress) {
    console.error("Usage: node backfill-contract-address.mjs <projectId> <contractAddress>");
    process.exit(1);
  }

  // Normalise UUID format (add dashes if missing)
  const uuid = projectId.includes("-")
    ? projectId
    : `${projectId.slice(0,8)}-${projectId.slice(8,12)}-${projectId.slice(12,16)}-${projectId.slice(16,20)}-${projectId.slice(20)}`;

  console.log(`\n[Backfill] Project ID:        ${uuid}`);
  console.log(`[Backfill] Contract Address:  ${contractAddress}`);
  console.log(`[Backfill] API:               ${API_BASE}\n`);

  const res = await fetch(`${API_BASE}/api/projects/${uuid}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contract_address: contractAddress })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("[Backfill] FAILED:", res.status, JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("[Backfill] SUCCESS ✓");
  console.log(`  Project title:    ${data.title}`);
  console.log(`  contract_address: ${data.contract_address}`);
  console.log(`  status:           ${data.status}`);
  console.log(`\nRefresh the project page — escrow balance and milestones should now load from chain.\n`);
}

const [,, projectId, contractAddress] = process.argv;
backfill(projectId, contractAddress).catch(err => {
  console.error("[Backfill] Error:", err.message);
  process.exit(1);
});
