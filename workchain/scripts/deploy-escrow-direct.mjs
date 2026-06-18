/**
 * deploy-escrow-direct.mjs
 * 
 * Deploys WorkchainEscrow directly (without factory), initializes it,
 * and saves the project to the local backend DB.
 * 
 * Run: node scripts/deploy-escrow-direct.mjs
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const RPC_URL         = 'https://eth-sepolia.g.alchemy.com/v2/BBqgWCw5DmqAkIKhZfT0h';
const PRIVATE_KEY     = '0cd2bc42c68a40e8c5a3baae0b7f2750da5bbbce38f56f23d03104a75a7877eb';
const API_URL         = 'http://localhost:8000';
const FREELANCER_ADDR = '0x29722FBD0AF423FE9D368B2EAB4FDF134B8C40D7';

// ── Load compiled artifact ────────────────────────────────────────────────────
const artifact = JSON.parse(
  readFileSync(
    join(__dirname, '../contracts/artifacts/contracts/WorkchainEscrow.sol/WorkchainEscrow.json'),
    'utf8'
  )
);
const ESCROW_ABI      = artifact.abi;
const ESCROW_BYTECODE = artifact.bytecode;

// ── Project config ────────────────────────────────────────────────────────────
const MILESTONE_TITLES = ['MILESTONE 1: DESIGN', 'MILESTONE 2: IMPLEMENTATION'];
const MILESTONE_DESCS  = ['UI/UX design and wireframes', 'Full smart contract + frontend dev'];
const MILESTONE_AMOUNTS = [
  ethers.parseEther('0.001'),
  ethers.parseEther('0.001'),
];
const now = BigInt(Math.floor(Date.now() / 1000));
const MILESTONE_DEADLINES = [
  now + BigInt(30 * 24 * 3600),
  now + BigInt(60 * 24 * 3600),
];
const TOTAL_ETH = ethers.parseEther('0.002');

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Deploying WorkchainEscrow directly to Sepolia...\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log('Deployer (client):', wallet.address);
  console.log('Freelancer:       ', FREELANCER_ADDR);

  const balance = await provider.getBalance(wallet.address);
  console.log('ETH balance:      ', ethers.formatEther(balance), 'ETH\n');

  if (balance < ethers.parseEther('0.005')) {
    console.error('❌ Need at least 0.005 ETH for deployment + ETH lock');
    process.exit(1);
  }

  // ── Step 1: Deploy the escrow contract ─────────────────────────────────────
  console.log('📦 Deploying WorkchainEscrow contract...');
  const factory = new ethers.ContractFactory(ESCROW_ABI, ESCROW_BYTECODE, wallet);

  let escrow;
  try {
    escrow = await factory.deploy({ gasLimit: 3000000 });
    console.log('   Deploy tx:', escrow.deploymentTransaction()?.hash);
    await escrow.waitForDeployment();
  } catch (err) {
    console.error('❌ Deploy failed:', err.message);
    process.exit(1);
  }

  const escrowAddress = await escrow.getAddress();
  console.log('✅ Escrow deployed at:', escrowAddress);

  // ── Step 2: Initialize the escrow (lock ETH + set parties) ─────────────────
  console.log('\n🔐 Initializing escrow with milestones and ETH...');
  try {
    const initTx = await escrow.initialize(
      wallet.address,    // client = deployer
      FREELANCER_ADDR,   // freelancer
      MILESTONE_TITLES,
      MILESTONE_DESCS,
      MILESTONE_AMOUNTS,
      MILESTONE_DEADLINES,
      { value: TOTAL_ETH, gasLimit: 1000000 }
    );
    console.log('   Init tx:', initTx.hash);
    await initTx.wait();
    console.log('✅ Escrow initialized. ETH locked:', ethers.formatEther(TOTAL_ETH));
  } catch (err) {
    console.error('❌ Initialize failed:', err.message);
    process.exit(1);
  }

  // ── Step 3: Verify on-chain state ─────────────────────────────────────────
  console.log('\n🔍 Verifying on-chain state...');
  try {
    const proj = await escrow.getProject();
    const count = await escrow.getMilestoneCount();
    console.log('   client:', proj[0]);
    console.log('   freelancer:', proj[1]);
    console.log('   totalValue:', ethers.formatEther(proj[3]), 'ETH');
    console.log('   isInitialized:', proj[4]);
    console.log('   activeMilestoneIndex:', proj[7].toString());
    console.log('   milestoneCount:', count.toString());
  } catch (err) {
    console.warn('   Warning: verify read failed:', err.message.slice(0, 100));
  }

  // ── Step 4: Register users and project in backend DB ───────────────────────
  console.log('\n💾 Registering in backend DB...');

  for (const [addr, role] of [[wallet.address, 'client'], [FREELANCER_ADDR, 'freelancer']]) {
    await fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: addr, role })
    }).catch(() => {});
  }

  const deployTxHash = escrow.deploymentTransaction()?.hash ?? '';
  const projectRes = await fetch(
    `${API_URL}/api/projects?client_wallet=${wallet.address}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:             'TEST PROJECT — LIVE ESCROW',
        description:       'A project with a real deployed WorkchainEscrow for end-to-end testing.',
        freelancer_wallet: FREELANCER_ADDR,
        category:          'development',
        contract_address:  escrowAddress,
        tx_hash_deploy:    deployTxHash,
        total_value_eth:   0.002,
        milestones: MILESTONE_TITLES.map((t, i) => ({
          title:           t,
          description:     MILESTONE_DESCS[i],
          amount_eth:      0.001,
          deadline:        null,
          milestone_index: i,
        }))
      })
    }
  );

  if (!projectRes.ok) {
    const errText = await projectRes.text();
    console.error('❌ DB registration failed:', errText);
    process.exit(1);
  }

  const project = await projectRes.json();

  // ── Final output ───────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════════════');
  console.log('✅  PROJECT DEPLOYED AND REGISTERED SUCCESSFULLY!');
  console.log('════════════════════════════════════════════════════════');
  console.log('PROJECT ID:    ', project.id);
  console.log('ESCROW ADDR:   ', escrowAddress);
  console.log('ETHERSCAN:      https://sepolia.etherscan.io/address/' + escrowAddress);
  console.log('PROJECT URL:    http://localhost:3000/projects/' + project.id);
  console.log('════════════════════════════════════════════════════════');
  console.log();
  console.log('NEXT STEPS TO TEST:');
  console.log('1. Open the PROJECT URL above in the browser (client wallet)');
  console.log('2. Switch to FREELANCER wallet (0x29722FBD...) and submit Milestone 1');
  console.log('3. Switch back to CLIENT wallet and click APPROVE & RELEASE');
  console.log();
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message ?? err);
  process.exit(1);
});
