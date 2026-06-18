import "@nomicfoundation/hardhat-toolbox";
import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", 
    ethers.formatEther(
      await deployer.provider.getBalance(deployer.address)
    ), "ETH");

  // 1. Deploy WorkchainReputation
  console.log("\nDeploying WorkchainReputation...");
  const Reputation = await ethers.getContractFactory("WorkchainReputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  const repAddress = await reputation.getAddress();
  console.log("WorkchainReputation:", repAddress);

  // 2. Deploy WorkchainFactory
  console.log("\nDeploying WorkchainFactory...");
  const Factory = await ethers.getContractFactory("WorkchainFactory");
  const factory = await Factory.deploy(repAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("WorkchainFactory:", factoryAddress);

  // 3. Link factory to reputation
  console.log("\nLinking contracts...");
  await reputation.setFactory(factoryAddress);
  console.log("Factory set in reputation contract");

  // 4. Write deployments.json
  const deployments = {
    network: "sepolia",
    chainId: 11155111,
    deployer: deployer.address,
    WorkchainFactory: factoryAddress,
    WorkchainReputation: repAddress,
    deployedAt: new Date().toISOString(),
    blockNumber: await deployer.provider.getBlockNumber()
  };

  const dir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  
  fs.writeFileSync(
    path.join(dir, "sepolia.json"),
    JSON.stringify(deployments, null, 2)
  );

  console.log("\n✅ Deployment complete!");
  console.log("─────────────────────────────");
  console.log("WorkchainFactory:   ", factoryAddress);
  console.log("WorkchainReputation:", repAddress);
  console.log("deployments/sepolia.json written");
  console.log("\nAdd to backend .env:");
  console.log(`CONTRACT_FACTORY=${factoryAddress}`);
  console.log(`CONTRACT_REPUTATION=${repAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
