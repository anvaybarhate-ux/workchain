import { run } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const deploymentsPath = path.join(process.cwd(), "deployments", "sepolia.json");
  if (!fs.existsSync(deploymentsPath)) {
    console.error("No deployment found. Please deploy first.");
    return;
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
  
  console.log("Verifying WorkchainReputation...");
  try {
    await run("verify:verify", {
      address: deployments.WorkchainReputation,
      constructorArguments: [],
    });
  } catch (e: any) {
    console.error(e.message);
  }

  console.log("\nVerifying WorkchainFactory...");
  try {
    await run("verify:verify", {
      address: deployments.WorkchainFactory,
      constructorArguments: [deployments.WorkchainReputation],
    });
  } catch (e: any) {
    console.error(e.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
