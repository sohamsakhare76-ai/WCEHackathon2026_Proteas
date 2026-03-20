// blockchain/scripts/interact.js
// Usage: npx hardhat run scripts/interact.js --network localhost
const { ethers } = require("hardhat");
const config = require("../../backend/src/contractAddress.json");

async function main() {
  const [admin, verifier, ngo] = await ethers.getSigners();

  console.log("🔗 Connecting to BlueCarbonToken at:", config.contractAddress);
  const BCT = await ethers.getContractAt("BlueCarbonToken", config.contractAddress);

  // --- Add verifier ---
  console.log("\n1️⃣  Adding verifier:", verifier.address);
  await (await BCT.connect(admin).addVerifier(verifier.address)).wait();
  console.log("   ✅ Verifier added");

  // --- Register a project ---
  console.log("\n2️⃣  Registering project as NGO...");
  const tx = await BCT.connect(ngo).registerProject(
    "Godavari Delta Mangroves",
    "Kakinada, Andhra Pradesh",
    16924000,   // lat × 1e6
    82193000,   // lon × 1e6
    45,         // area hectares
    0,          // MANGROVE
    8,          // growth years
    1240,       // carbon tonnes
    "QmXt8j2kKzN7p1m5abc123def456"
  );
  const receipt = await tx.wait();
  console.log("   ✅ Project registered. Tx:", receipt.hash);

  // --- Verify project ---
  console.log("\n3️⃣  Verifying project as verifier...");
  await (await BCT.connect(verifier).verifyProject(1)).wait();
  console.log("   ✅ Project verified");

  // --- Mint credits ---
  console.log("\n4️⃣  Minting carbon credits...");
  const mintTx = await BCT.connect(verifier).mintCarbonCredits(1);
  const mintReceipt = await mintTx.wait();
  console.log("   ✅ Credits minted. Tx:", mintReceipt.hash);

  // --- Check balance ---
  const balance = await BCT.balanceOf(ngo.address);
  console.log("\n💰 NGO BCT Balance:", balance.toString(), "BCT");

  const supply = await BCT.totalSupply();
  console.log("📊 Total Supply:   ", supply.toString(), "BCT");
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
