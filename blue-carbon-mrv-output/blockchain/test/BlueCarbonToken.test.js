// blockchain/test/BlueCarbonToken.test.js
const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("BlueCarbonToken", function () {
  let BCT, admin, verifier, ngo, buyer;

  beforeEach(async () => {
    [admin, verifier, ngo, buyer] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BlueCarbonToken");
    BCT = await Factory.deploy();
    await BCT.waitForDeployment();
  });

  // ── Deployment ─────────────────────────────────────────────────
  it("sets admin correctly", async () => {
    expect(await BCT.admin()).to.equal(admin.address);
  });

  it("admin is verifier by default", async () => {
    expect(await BCT.isVerifier(admin.address)).to.be.true;
  });

  // ── Verifier Management ────────────────────────────────────────
  it("admin can add verifier", async () => {
    await BCT.addVerifier(verifier.address);
    expect(await BCT.isVerifier(verifier.address)).to.be.true;
  });

  it("non-admin cannot add verifier", async () => {
    await expect(BCT.connect(ngo).addVerifier(verifier.address))
      .to.be.revertedWith("Only NCCR admin");
  });

  // ── Project Registration ───────────────────────────────────────
  it("NGO can register a project", async () => {
    await expect(
      BCT.connect(ngo).registerProject(
        "Godavari Delta Mangroves", "Kakinada, AP",
        16924000, 82193000, 45, 0, 8, 1240, "QmTest"
      )
    ).to.emit(BCT, "ProjectRegistered").withArgs(1, ngo.address, "Godavari Delta Mangroves");
  });

  it("rejects project with empty name", async () => {
    await expect(
      BCT.connect(ngo).registerProject("", "Location", 0, 0, 10, 0, 1, 100, "")
    ).to.be.revertedWith("Name required");
  });

  // ── Project Verification ───────────────────────────────────────
  it("verifier can verify a pending project", async () => {
    await BCT.connect(ngo).registerProject("Test", "Loc", 0, 0, 10, 0, 1, 100, "QmX");
    await expect(BCT.verifyProject(1))
      .to.emit(BCT, "ProjectVerified").withArgs(1, admin.address);

    const p = await BCT.getProject(1);
    expect(p.status).to.equal(1); // VERIFIED
  });

  it("cannot verify a non-pending project twice", async () => {
    await BCT.connect(ngo).registerProject("Test", "Loc", 0, 0, 10, 0, 1, 100, "QmX");
    await BCT.verifyProject(1);
    await expect(BCT.verifyProject(1)).to.be.revertedWith("Not in PENDING state");
  });

  // ── Minting ────────────────────────────────────────────────────
  it("verifier can mint credits for verified project", async () => {
    await BCT.connect(ngo).registerProject("Test", "Loc", 0, 0, 10, 0, 1, 100, "QmX");
    await BCT.verifyProject(1);
    await expect(BCT.mintCarbonCredits(1))
      .to.emit(BCT, "CreditsMinted").withArgs(1, ngo.address, 100);

    expect(await BCT.balanceOf(ngo.address)).to.equal(100);
    expect(await BCT.totalSupply()).to.equal(100);
  });

  it("cannot mint for unverified project", async () => {
    await BCT.connect(ngo).registerProject("Test", "Loc", 0, 0, 10, 0, 1, 100, "QmX");
    await expect(BCT.mintCarbonCredits(1)).to.be.revertedWith("Project not verified");
  });

  // ── Token Transfer ─────────────────────────────────────────────
  it("token holder can transfer BCT", async () => {
    await BCT.connect(ngo).registerProject("Test", "Loc", 0, 0, 10, 0, 1, 100, "QmX");
    await BCT.verifyProject(1);
    await BCT.mintCarbonCredits(1);

    await expect(BCT.connect(ngo).transfer(buyer.address, 40))
      .to.emit(BCT, "Transfer").withArgs(ngo.address, buyer.address, 40);

    expect(await BCT.balanceOf(ngo.address)).to.equal(60);
    expect(await BCT.balanceOf(buyer.address)).to.equal(40);
  });

  it("cannot transfer more than balance", async () => {
    await BCT.connect(ngo).registerProject("Test", "Loc", 0, 0, 10, 0, 1, 100, "QmX");
    await BCT.verifyProject(1);
    await BCT.mintCarbonCredits(1);
    await expect(BCT.connect(ngo).transfer(buyer.address, 9999))
      .to.be.revertedWith("Insufficient balance");
  });
});
