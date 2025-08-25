// scripts/deploy.js

const hre = require("hardhat");

async function main() {
  console.log("Deploying PharmaRegistry contract...");

  const PharmaRegistry = await hre.ethers.getContractFactory("PharmaRegistry");
  const pharmaRegistry = await PharmaRegistry.deploy();

  await pharmaRegistry.waitForDeployment();

  console.log(
    `✅ PharmaRegistry contract deployed to: ${pharmaRegistry.target}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});