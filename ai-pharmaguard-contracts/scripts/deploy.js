// scripts/deploy.js

const hre = require("hardhat");

async function main() {
  console.log("Deploying PharmaRegistry contract...");

  const PharmaRegistry = await hre.ethers.getContractFactory("PharmaRegistry");
  const pharmaRegistry = await PharmaRegistry.deploy();

  await pharmaRegistry.deployed();

  console.log(
    `✅ PharmaRegistry contract deployed to: ${pharmaRegistry.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});