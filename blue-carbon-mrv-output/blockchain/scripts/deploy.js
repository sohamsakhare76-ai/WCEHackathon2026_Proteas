// blockchain/scripts/deploy.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🚀 Deploying BlueCarbonToken...");
  console.log("   Deployer:", deployer.address);
  console.log("   Balance: ", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  const BCT = await ethers.getContractFactory("BlueCarbonToken");
  const bct = await BCT.deploy();
  await bct.waitForDeployment();

  const address = await bct.getAddress();
  console.log("✅ BlueCarbonToken deployed to:", address);

  // Save address to backend config
  const config = {
    contractAddress: address,
    deployer: deployer.address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../../backend/src/contractAddress.json");
  fs.writeFileSync(outPath, JSON.stringify(config, null, 2));
  console.log("💾 Contract address saved to backend/src/contractAddress.json");

  // Also update .env
  const envPath = path.join(__dirname, "../../backend/.env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    env = env.replace(/CONTRACT_ADDRESS=.*/, `CONTRACT_ADDRESS=${address}`);
    fs.writeFileSync(envPath, env);
    console.log("🔧 .env updated with contract address");
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
