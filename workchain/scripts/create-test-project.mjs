/**
 * create-test-project.mjs
 * 
 * Creates a real deployed escrow project on Sepolia via the WorkchainFactory,
 * then registers it in the local backend DB so the frontend can interact with it.
 * 
 * Run: node scripts/create-test-project.mjs
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Config ────────────────────────────────────────────────────────────────────
const RPC_URL      = 'https://eth-sepolia.g.alchemy.com/v2/BBqgWCw5DmqAkIKhZfT0h';
const PRIVATE_KEY  = '0cd2bc42c68a40e8c5a3baae0b7f2750da5bbbce38f56f23d03104a75a7877eb';
const FACTORY_ADDR = '0x4D1838574F935Da21fFF7b3a1B4d5C0477Cd30E8';
const API_URL      = 'http://localhost:8000';

// The second wallet (freelancer) — derived from a known test private key
// We'll use the address that appeared in the calldata as freelancer
const FREELANCER_ADDR = '0x29722FBD0AF423FE9D368B2EAB4FDF134B8C40D7';

// ── Load ABIs ─────────────────────────────────────────────────────────────────
const FACTORY_ABI = JSON.parse(
  readFileSync(join(__dirname, '../src/lib/abi/factory.json'), 'utf8')
).abi;

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Creating test project on Sepolia...\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('Client (deployer):', wallet.address);
  console.log('Freelancer:       ', FREELANCER_ADDR);

  const balance = await provider.getBalance(wallet.address);
  console.log('Client ETH balance:', ethers.formatEther(balance), 'ETH\n');

  if (balance < ethers.parseEther('0.001')) {
    console.error('❌ Insufficient ETH. Get Sepolia ETH from https://sepoliafaucet.com');
    process.exit(1);
  }

  const factory = new ethers.Contract(FACTORY_ADDR, FACTORY_ABI, wallet);

  // Project config
  const titles        = ['MILESTONE 1: DESIGN',   'MILESTONE 2: DEVELOPMENT'];
  const descriptions  = ['UI/UX design phase',     'Smart contract development'];
  const amounts       = [
    ethers.parseEther('0.001'),
    ethers.parseEther('0.001'),
  ];
  const deadlines     = [
    BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 3600),  // 30 days
    BigInt(Math.floor(Date.now() / 1000) + 60 * 24 * 3600),  // 60 days
  ];
  const totalEth = ethers.parseEther('0.002');

  console.log('📝 Calling factory.createProject()...');
  console.log('   ETH to lock:', ethers.formatEther(totalEth));

  let tx, receipt, escrowAddress;
  try {
    tx = await factory.createProject(
      FREELANCER_ADDR,
      titles,
      descriptions,
      amounts,
      deadlines,
      { value: totalEth, gasLimit: 3000000 }
    );
    console.log('⏳ Tx sent:', tx.hash);
    console.log('   Waiting for confirmation...');
    receipt = await tx.wait();
    console.log('✅ Confirmed in block:', receipt.blockNumber);
  } catch (err) {
    console.error('❌ Factory call failed:', err.message);
    process.exit(1);
  }

  // Parse the escrow address from the ProjectCreated event
  const iface = factory.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === 'ProjectCreated') {
        escrowAddress = parsed.args[0];
        console.log('\n🏦 Escrow deployed at:', escrowAddress);
        break;
      }
    } catch { continue; }
  }

  if (!escrowAddress) {
    console.error('❌ Could not find escrow address in receipt logs');
    process.exit(1);
  }

  // Register in backend DB
  console.log('\n💾 Registering in local DB...');

  // Upsert client user
  await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: wallet.address, role: 'client' })
  }).catch(() => {});

  // Upsert freelancer user
  await fetch(`${API_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: FREELANCER_ADDR, role: 'freelancer' })
  }).catch(() => {});

  // Create project
  const projectRes = await fetch(
    `${API_URL}/api/projects?client_wallet=${wallet.address}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:            'TEST PROJECT — ACTIVE',
        description:      'A fresh project with a real deployed escrow for testing.',
        freelancer_wallet: FREELANCER_ADDR,
        category:         'development',
        contract_address:  escrowAddress,
        tx_hash_deploy:    tx.hash,
        total_value_eth:   0.002,
        milestones: titles.map((t, i) => ({
          title:           t,
          description:     descriptions[i],
          amount_eth:      0.001,
          deadline:        null,
          milestone_index: i,
        }))
      })
    }
  );

  if (!projectRes.ok) {
    const err = await projectRes.text();
    console.error('❌ DB registration failed:', err);
    process.exit(1);
  }

  const project = await projectRes.json();
  console.log('✅ Project created in DB:', project.id);
  console.log('\n════════════════════════════════════════');
  console.log('PROJECT ID:       ', project.id);
  console.log('ESCROW ADDRESS:   ', escrowAddress);
  console.log('TX HASH:          ', tx.hash);
  console.log('ETHERSCAN:         https://sepolia.etherscan.io/address/' + escrowAddress);
  console.log('PROJECT URL:       http://localhost:3000/projects/' + project.id);
  console.log('════════════════════════════════════════\n');
  console.log('✅ Open the PROJECT URL above to test milestone submission and approval.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
