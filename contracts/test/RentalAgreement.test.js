const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentalAgreement Contract", function () {
  let rentalContract;
  let owner, landlord, tenant, oracle, stranger;
  const rentAmount = ethers.parseEther("1.0");
  const securityDeposit = ethers.parseEther("2.0");

  beforeEach(async function () {
    [owner, landlord, tenant, oracle, stranger] = await ethers.getSigners();

    const RentalAgreementFactory = await ethers.getContractFactory("RentalAgreement");
    rentalContract = await RentalAgreementFactory.deploy(oracle.address);
    await rentalContract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should correctly set owner and oracle address", async function () {
      expect(await rentalContract.owner()).to.equal(owner.address);
      expect(await rentalContract.oracleAddress()).to.equal(oracle.address);
      expect(await rentalContract.getTotalAgreements()).to.equal(0);
    });

    it("Should allow owner to update oracle address", async function () {
      await rentalContract.connect(owner).updateOracleAddress(stranger.address);
      expect(await rentalContract.oracleAddress()).to.equal(stranger.address);
    });
  });

  describe("Agreement Lifecycle", function () {
    const now = Math.floor(Date.now() / 1000);
    const startDate = now + 86400; // Tomorrow
    const endDate = now + 86400 * 30; // 30 days later

    it("Should create a rental agreement with Pending status", async function () {
      const tx = await rentalContract.connect(landlord).createAgreement(
        "123 Blockchain Ave, Crypto City",
        tenant.address,
        rentAmount,
        securityDeposit,
        startDate,
        endDate,
        "No pets, Rent due on 1st of each month"
      );
      await tx.wait();

      expect(await rentalContract.getTotalAgreements()).to.equal(1);

      const agreement = await rentalContract.getAgreement(1);
      expect(agreement.id).to.equal(1);
      expect(agreement.propertyAddress).to.equal("123 Blockchain Ave, Crypto City");
      expect(agreement.landlord).to.equal(landlord.address);
      expect(agreement.tenant).to.equal(tenant.address);
      expect(agreement.rentAmount).to.equal(rentAmount);
      expect(agreement.securityDeposit).to.equal(securityDeposit);
      expect(agreement.status).to.equal(0); // Pending
    });

    it("Should reject agreement creation if tenant is landlord", async function () {
      await expect(
        rentalContract.connect(landlord).createAgreement(
          "123 Blockchain Ave",
          landlord.address,
          rentAmount,
          securityDeposit,
          startDate,
          endDate,
          "Terms"
        )
      ).to.be.revertedWith("Landlord and tenant cannot be the same address");
    });

    it("Should allow designated tenant to accept agreement", async function () {
      await rentalContract.connect(landlord).createAgreement(
        "123 Blockchain Ave",
        tenant.address,
        rentAmount,
        securityDeposit,
        startDate,
        endDate,
        "Terms"
      );

      // Non-tenant fails
      await expect(
        rentalContract.connect(stranger).acceptAgreement(1)
      ).to.be.revertedWith("Only designated tenant can accept this agreement");

      // Designated tenant accepts
      await rentalContract.connect(tenant).acceptAgreement(1);
      const agreement = await rentalContract.getAgreement(1);
      expect(agreement.status).to.equal(1); // Accepted
    });

    it("Should allow designated tenant to reject agreement", async function () {
      await rentalContract.connect(landlord).createAgreement(
        "123 Blockchain Ave",
        tenant.address,
        rentAmount,
        securityDeposit,
        startDate,
        endDate,
        "Terms"
      );

      await rentalContract.connect(tenant).rejectAgreement(1);
      const agreement = await rentalContract.getAgreement(1);
      expect(agreement.status).to.equal(2); // Rejected
    });

    it("Should allow landlord or owner to terminate accepted agreement", async function () {
      await rentalContract.connect(landlord).createAgreement(
        "123 Blockchain Ave",
        tenant.address,
        rentAmount,
        securityDeposit,
        startDate,
        endDate,
        "Terms"
      );
      await rentalContract.connect(tenant).acceptAgreement(1);

      // Stranger cannot terminate
      await expect(
        rentalContract.connect(stranger).terminateAgreement(1)
      ).to.be.revertedWith("Only landlord or contract owner can terminate this agreement");

      // Landlord terminates
      await rentalContract.connect(landlord).terminateAgreement(1);
      const agreement = await rentalContract.getAgreement(1);
      expect(agreement.status).to.equal(4); // Terminated
    });
  });

  describe("Oracle Payment Recording", function () {
    const now = Math.floor(Date.now() / 1000);
    const startDate = now;
    const endDate = now + 86400 * 30;

    beforeEach(async function () {
      await rentalContract.connect(landlord).createAgreement(
        "456 Decentralized Way",
        tenant.address,
        rentAmount,
        securityDeposit,
        startDate,
        endDate,
        "Standard Residential Lease"
      );
    });

    it("Should fail recording payment if agreement is not Accepted", async function () {
      // Agreement is still Pending
      await expect(
        rentalContract.connect(oracle).recordPayment(1, "PAY-REF-001", rentAmount, now)
      ).to.be.revertedWith("Payments can only be recorded for Accepted agreements");
    });

    it("Should fail if caller is not the Oracle service", async function () {
      await rentalContract.connect(tenant).acceptAgreement(1);

      await expect(
        rentalContract.connect(tenant).recordPayment(1, "PAY-REF-001", rentAmount, now)
      ).to.be.revertedWith("Caller is not the authorized Oracle service");
    });

    it("Should allow Oracle to record verified payment and update history", async function () {
      await rentalContract.connect(tenant).acceptAgreement(1);

      const tx = await rentalContract.connect(oracle).recordPayment(
        1,
        "PAY-REF-001",
        rentAmount,
        now
      );
      await tx.wait();

      expect(await rentalContract.isPaymentProcessed("PAY-REF-001")).to.be.true;

      const history = await rentalContract.getPaymentHistory(1);
      expect(history.length).to.equal(1);
      expect(history[0].paymentReference).to.equal("PAY-REF-001");
      expect(history[0].amount).to.equal(rentAmount);
      expect(history[0].recordedBy).to.equal(oracle.address);
    });

    it("Should prevent duplicate payment references (Replay protection)", async function () {
      await rentalContract.connect(tenant).acceptAgreement(1);

      await rentalContract.connect(oracle).recordPayment(1, "PAY-REF-DUP", rentAmount, now);

      await expect(
        rentalContract.connect(oracle).recordPayment(1, "PAY-REF-DUP", rentAmount, now)
      ).to.be.revertedWith("Duplicate payment reference: Payment already recorded");
    });
  });
});
