const express = require("express");
const Payment = require("../models/Payment");
const Agreement = require("../models/Agreement");
const MockGatewayService = require("../services/mockGatewayService");
const OracleService = require("../services/oracleService");
const { protect } = require("../middleware/auth");
const { getReadOnlyContract } = require("../config/blockchain");

const router = express.Router();

// @route   POST /api/payments/simulate-gateway
// @desc    Simulate external payment gateway transaction and receive signed confirmation
router.post("/simulate-gateway", protect, async (req, res) => {
  try {
    const { agreementId, amount, shouldSimulateFailure } = req.body;

    if (!agreementId || !amount) {
      return res.status(400).json({
        success: false,
        message: "agreementId and amount are required.",
      });
    }

    const agreement = await Agreement.findOne({ agreementId: Number(agreementId) });
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: `Agreement #${agreementId} not found.`,
      });
    }

    const gatewayResult = MockGatewayService.processPayment({
      agreementId,
      amount,
      payerName: req.user.name,
      payerEmail: req.user.email,
      shouldSimulateFailure: Boolean(shouldSimulateFailure),
    });

    res.json({
      success: gatewayResult.success,
      message: gatewayResult.success
        ? "External payment confirmed by simulated payment gateway! Ready for Oracle verification."
        : "External payment failed at gateway level (simulated).",
      confirmationData: gatewayResult.confirmation,
    });
  } catch (error) {
    console.error("[Simulate Gateway Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/payments/oracle/verify-and-record
// @desc    Oracle verifies external confirmation and submits record to Smart Contract
router.post("/oracle/verify-and-record", protect, async (req, res) => {
  try {
    const { confirmationData } = req.body;

    if (!confirmationData || !confirmationData.payload || !confirmationData.signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment confirmationData (payload and signature required).",
      });
    }

    const result = await OracleService.verifyAndRecordPayment(
      confirmationData,
      req.user
    );

    res.json({
      success: true,
      message: "Payment successfully verified by Oracle and recorded on blockchain!",
      payment: result.payment,
      blockchainTxHash: result.blockchainTxHash,
      blockNumber: result.blockNumber,
      oracleAddress: result.oracleAddress,
      auditSteps: result.auditSteps,
    });
  } catch (error) {
    console.error("[Oracle Verification Error]:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/payments/pay-and-verify
// @desc    Full automated pipeline: Gateway confirmation -> Oracle verification -> Smart contract
router.post("/pay-and-verify", protect, async (req, res) => {
  try {
    const { agreementId, amount } = req.body;

    if (!agreementId || !amount) {
      return res.status(400).json({
        success: false,
        message: "agreementId and amount are required.",
      });
    }

    // Step 1: External Gateway confirmation
    const gatewayResult = MockGatewayService.processPayment({
      agreementId,
      amount,
      payerName: req.user.name,
      payerEmail: req.user.email,
    });

    // Step 2: Oracle verification and on-chain recording
    const oracleResult = await OracleService.verifyAndRecordPayment(
      gatewayResult.confirmation,
      req.user
    );

    res.json({
      success: true,
      message: "End-to-end payment completed: Gateway confirmed -> Oracle verified -> Smart contract recorded!",
      confirmation: gatewayResult.confirmation,
      payment: oracleResult.payment,
      blockchainTxHash: oracleResult.blockchainTxHash,
      blockNumber: oracleResult.blockNumber,
      auditSteps: oracleResult.auditSteps,
    });
  } catch (error) {
    console.error("[Pay and Verify Error]:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/payments/agreement/:agreementId
// @desc    Get all payments for a specific agreement (both DB & Blockchain)
router.get("/agreement/:agreementId", protect, async (req, res) => {
  try {
    const agreementId = Number(req.params.agreementId);
    const dbPayments = await Payment.find({ agreementId }).sort({ createdAt: -1 });

    let onChainPayments = [];
    try {
      const readContract = getReadOnlyContract();
      const rawPayments = await readContract.getPaymentHistory(agreementId);
      onChainPayments = rawPayments.map((p) => ({
        paymentReference: p.paymentReference,
        amountWei: p.amount.toString(),
        paymentTimestamp: new Date(Number(p.paymentTimestamp) * 1000).toISOString(),
        recordedAt: new Date(Number(p.recordedAt) * 1000).toISOString(),
        recordedBy: p.recordedBy,
      }));
    } catch (err) {
      console.warn("[On-chain payments fetch warning]:", err.message);
    }

    res.json({
      success: true,
      count: dbPayments.length,
      dbPayments,
      onChainPayments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/payments/history
// @desc    Get user's payment history
router.get("/history", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "tenant") {
      query = { tenant: req.user._id };
    } else {
      // Landlord: find agreements owned by landlord, then find payments for those
      const landlordAgreements = await Agreement.find({ landlord: req.user._id }).select("agreementId");
      const agreementIds = landlordAgreements.map((a) => a.agreementId);
      query = { agreementId: { $in: agreementIds } };
    }

    const payments = await Payment.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
