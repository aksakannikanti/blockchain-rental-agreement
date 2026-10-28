const express = require("express");
const { ethers } = require("ethers");
const Agreement = require("../models/Agreement");
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");
const {
  provider,
  getReadOnlyContract,
  getLandlordContract,
  getTenantContract,
  getContractWithSigner,
} = require("../config/blockchain");

const router = express.Router();

// Helper to map numeric contract status to string
const STATUS_NAMES = ["Pending", "Accepted", "Rejected", "Expired", "Terminated"];

// @route   POST /api/agreements
// @desc    Create a new rental agreement (Landlord only)
router.post("/", protect, authorize("landlord"), async (req, res) => {
  try {
    const {
      propertyAddress,
      propertyType,
      description,
      tenantEmail,
      tenantAddress,
      rentAmount,
      securityDeposit,
      startDate,
      endDate,
      terms,
    } = req.body;

    if (!propertyAddress || !rentAmount || !startDate || !endDate || !terms) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields for rental agreement creation.",
      });
    }

    // Resolve tenant
    let tenantUser = null;
    let finalTenantAddress = tenantAddress;

    if (tenantEmail) {
      tenantUser = await User.findOne({ email: tenantEmail.toLowerCase() });
      if (tenantUser && tenantUser.walletAddress && !finalTenantAddress) {
        finalTenantAddress = tenantUser.walletAddress;
      }
    }

    if (!finalTenantAddress) {
      // Fallback default demo tenant address if not specified
      finalTenantAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    }

    const landlordAddress =
      req.user.walletAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    if (endTimestamp <= startTimestamp) {
      return res.status(400).json({
        success: false,
        message: "Agreement end date must be after the start date.",
      });
    }

    const rentInWei = ethers.parseEther(rentAmount.toString());
    const depositInWei = securityDeposit ? ethers.parseEther(securityDeposit.toString()) : 0n;

    // Call smart contract via Landlord signer
    console.log("[Contract] Invoking createAgreement on blockchain...");
    const contract = getLandlordContract();

    const tx = await contract.createAgreement(
      propertyAddress,
      finalTenantAddress,
      rentInWei,
      depositInWei,
      startTimestamp,
      endTimestamp,
      terms
    );

    const receipt = await tx.wait(1);
    console.log(`[Contract] createAgreement tx confirmed: ${receipt.hash}`);

    // Parse AgreementCreated event to extract agreementId
    let agreementId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog(log);
        if (parsedLog && parsedLog.name === "AgreementCreated") {
          agreementId = Number(parsedLog.args.agreementId);
          break;
        }
      } catch {
        // Continue checking other logs
      }
    }

    if (!agreementId) {
      // Fallback: check total agreements
      agreementId = Number(await contract.getTotalAgreements());
    }

    // Clean up any stale records with the same agreementId from previous chain sessions
    await Agreement.deleteMany({ agreementId });

    // Save in MongoDB
    const agreement = await Agreement.create({
      agreementId,
      propertyAddress,
      propertyType: propertyType || "Apartment",
      description: description || "",
      landlord: req.user._id,
      landlordAddress: landlordAddress.toLowerCase(),
      tenant: tenantUser ? tenantUser._id : null,
      tenantAddress: finalTenantAddress.toLowerCase(),
      tenantEmail: tenantEmail ? tenantEmail.toLowerCase() : "",
      rentAmount: Number(rentAmount),
      rentAmountWei: rentInWei.toString(),
      securityDeposit: Number(securityDeposit || 0),
      securityDepositWei: depositInWei.toString(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      terms,
      status: "Pending",
      creationTxHash: receipt.hash,
    });

    res.status(201).json({
      success: true,
      message: "Rental agreement created and recorded on blockchain!",
      agreement,
      txHash: receipt.hash,
    });
  } catch (error) {
    console.error("[Create Agreement Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/agreements
// @desc    Get agreements filtered by logged-in user role
router.get("/", protect, async (req, res) => {
  try {
    // Keep MongoDB in sync with active blockchain counter
    const readContract = getReadOnlyContract();
    try {
      const totalOnChain = Number(await readContract.getTotalAgreements());
      if (totalOnChain === 0) {
        await Agreement.deleteMany({});
      } else {
        await Agreement.deleteMany({ agreementId: { $gt: totalOnChain } });
      }
    } catch (chainErr) {
      console.warn("Chain query warning in getAgreements:", chainErr.message);
    }

    let query = {};

    if (req.user.role === "landlord") {
      const userWallet = (req.user.walletAddress || "").toLowerCase();
      query = {
        $or: [{ landlord: req.user._id }, { landlordAddress: userWallet }],
      };
    } else {
      // Tenant
      const userWallet = (req.user.walletAddress || "").toLowerCase();
      const userEmail = (req.user.email || "").toLowerCase();
      query = {
        $or: [
          { tenant: req.user._id },
          { tenantAddress: userWallet },
          { tenantEmail: userEmail },
        ],
      };
    }

    const agreements = await Agreement.find(query)
      .populate("landlord", "name email walletAddress phone")
      .populate("tenant", "name email walletAddress phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: agreements.length,
      agreements,
    });
  } catch (error) {
    console.error("[Get Agreements Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/agreements/stats/summary
// @desc    Get high-level statistics for dashboard
router.get("/stats/summary", protect, async (req, res) => {
  try {
    const totalAgreements = await Agreement.countDocuments();
    const activeAgreements = await Agreement.countDocuments({ status: "Accepted" });
    const pendingAgreements = await Agreement.countDocuments({ status: "Pending" });
    const terminatedAgreements = await Agreement.countDocuments({ status: "Terminated" });

    res.json({
      success: true,
      stats: {
        totalAgreements,
        activeAgreements,
        pendingAgreements,
        terminatedAgreements,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/agreements/:id
// @desc    Get single agreement with on-chain verification & payment history
router.get("/:id", protect, async (req, res) => {
  try {
    const agreementId = Number(req.params.id);
    const agreement = await Agreement.findOne({ agreementId })
      .populate("landlord", "name email walletAddress phone")
      .populate("tenant", "name email walletAddress phone");

    if (!agreement) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    // Query on-chain data directly
    const readContract = getReadOnlyContract();
    let onChainData = null;
    let onChainPayments = [];

    try {
      const rawAgreement = await readContract.getAgreement(agreementId);
      const rawPayments = await readContract.getPaymentHistory(agreementId);

      onChainData = {
        id: Number(rawAgreement.id),
        propertyAddress: rawAgreement.propertyAddress,
        landlord: rawAgreement.landlord,
        tenant: rawAgreement.tenant,
        rentAmountWei: rawAgreement.rentAmount.toString(),
        rentAmountEth: ethers.formatEther(rawAgreement.rentAmount),
        securityDepositWei: rawAgreement.securityDeposit.toString(),
        securityDepositEth: ethers.formatEther(rawAgreement.securityDeposit),
        startDate: new Date(Number(rawAgreement.startDate) * 1000).toISOString(),
        endDate: new Date(Number(rawAgreement.endDate) * 1000).toISOString(),
        terms: rawAgreement.terms,
        statusNumber: Number(rawAgreement.status),
        statusName: STATUS_NAMES[Number(rawAgreement.status)] || "Unknown",
      };

      onChainPayments = rawPayments.map((p) => ({
        agreementId: Number(p.agreementId),
        paymentReference: p.paymentReference,
        amountWei: p.amount.toString(),
        amountEth: ethers.formatEther(p.amount),
        paymentTimestamp: new Date(Number(p.paymentTimestamp) * 1000).toISOString(),
        recordedAt: new Date(Number(p.recordedAt) * 1000).toISOString(),
        recordedBy: p.recordedBy,
      }));
    } catch (chainErr) {
      console.warn("[On-chain Read Warning]:", chainErr.message);
    }

    res.json({
      success: true,
      agreement,
      onChainData,
      onChainPayments,
    });
  } catch (error) {
    console.error("[Get Single Agreement Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/agreements/:id/accept
// @desc    Tenant accepts rental agreement
router.post("/:id/accept", protect, authorize("tenant"), async (req, res) => {
  try {
    const agreementId = Number(req.params.id);
    const agreement = await Agreement.findOne({ agreementId });

    if (!agreement) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    if (agreement.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot accept agreement in '${agreement.status}' status.`,
      });
    }

    // Verify agreement exists on current blockchain instance before calling contract
    const readContract = getReadOnlyContract();
    const totalOnChain = Number(await readContract.getTotalAgreements());
    if (agreementId > totalOnChain || agreementId <= 0) {
      return res.status(400).json({
        success: false,
        message: `Agreement #${agreementId} was created on a previous blockchain run that was reset. Please create a new agreement to sign on the active blockchain.`,
      });
    }

    // Determine proper signer:
    // If designated on-chain tenant is default tenant signer (0x7099...), use tenantContract.
    // Otherwise, use owner relay signer (0xf39F...) which is authorized by the smart contract.
    const onChainAgr = await readContract.getAgreement(agreementId);
    const designatedTenant = (onChainAgr.tenant || "").toLowerCase();
    const tenantSigner = getTenantContract();
    const defaultTenantAddress = (await tenantSigner.runner.getAddress()).toLowerCase();

    let contractToUse;
    if (designatedTenant === defaultTenantAddress) {
      contractToUse = tenantSigner;
    } else {
      console.log(`[Contract] On-chain tenant is ${designatedTenant}. Using owner relay signer...`);
      contractToUse = getLandlordContract();
    }

    const signerAddr = await contractToUse.runner.getAddress();
    const nonce = await provider.getTransactionCount(signerAddr, "latest");
    const tx = await contractToUse.acceptAgreement(agreementId, { nonce });
    const receipt = await tx.wait(1);

    // Update MongoDB
    agreement.status = "Accepted";
    agreement.acceptanceTxHash = receipt.hash;
    if (!agreement.tenant) {
      agreement.tenant = req.user._id;
    }
    await agreement.save();

    res.json({
      success: true,
      message: "Agreement successfully accepted on the blockchain!",
      status: "Accepted",
      txHash: receipt.hash,
    });
  } catch (error) {
    console.error("[Accept Agreement Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/agreements/:id/reject
// @desc    Tenant rejects rental agreement
router.post("/:id/reject", protect, authorize("tenant"), async (req, res) => {
  try {
    const agreementId = Number(req.params.id);
    const agreement = await Agreement.findOne({ agreementId });

    if (!agreement) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    if (agreement.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot reject agreement in '${agreement.status}' status.`,
      });
    }

    const onChainAgr = await readContract.getAgreement(agreementId);
    const designatedTenant = (onChainAgr.tenant || "").toLowerCase();
    const tenantSigner = getTenantContract();
    const defaultTenantAddress = (await tenantSigner.runner.getAddress()).toLowerCase();

    let contractToUse;
    if (designatedTenant === defaultTenantAddress) {
      contractToUse = tenantSigner;
    } else {
      console.log(`[Contract] On-chain tenant is ${designatedTenant}. Using owner relay signer for rejection...`);
      contractToUse = getLandlordContract();
    }

    const signerAddr = await contractToUse.runner.getAddress();
    const nonce = await provider.getTransactionCount(signerAddr, "latest");
    const tx = await contractToUse.rejectAgreement(agreementId, { nonce });
    const receipt = await tx.wait(1);

    agreement.status = "Rejected";
    agreement.rejectionTxHash = receipt.hash;
    await agreement.save();

    res.json({
      success: true,
      message: "Agreement rejected on the blockchain.",
      status: "Rejected",
      txHash: receipt.hash,
    });
  } catch (error) {
    console.error("[Reject Agreement Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/agreements/:id/terminate
// @desc    Landlord terminates accepted rental agreement
router.post("/:id/terminate", protect, authorize("landlord"), async (req, res) => {
  try {
    const agreementId = Number(req.params.id);
    const agreement = await Agreement.findOne({ agreementId });

    if (!agreement) {
      return res.status(404).json({ success: false, message: "Agreement not found." });
    }

    if (agreement.status !== "Accepted") {
      return res.status(400).json({
        success: false,
        message: "Only Accepted agreements can be terminated.",
      });
    }

    const landlordContract = getLandlordContract();
    const tx = await landlordContract.terminateAgreement(agreementId);
    const receipt = await tx.wait(1);

    agreement.status = "Terminated";
    agreement.terminationTxHash = receipt.hash;
    await agreement.save();

    res.json({
      success: true,
      message: "Agreement terminated on the blockchain.",
      status: "Terminated",
      txHash: receipt.hash,
    });
  } catch (error) {
    console.error("[Terminate Agreement Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
