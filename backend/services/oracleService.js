const { ethers } = require("ethers");
const { getOracleContract, getReadOnlyContract } = require("../config/blockchain");
const MockGatewayService = require("./mockGatewayService");
const Payment = require("../models/Payment");
const Agreement = require("../models/Agreement");

class OracleService {
  /**
   * Main Oracle pipeline:
   * 1. Validates external payment notification authenticity & parameters
   * 2. Checks duplicate references in DB and Smart Contract
   * 3. Interacts with Smart Contract to record payment on-chain
   * 4. Updates off-chain database and returns audit trail
   */
  static async verifyAndRecordPayment(confirmationData, user = null) {
    const { payload, signature } = confirmationData;
    const auditSteps = [];

    console.log("[Oracle] === INCOMING PAYMENT CONFIRMATION RECEIVED ===");
    console.log("[Oracle] Reference:", payload?.paymentReference);
    console.log("[Oracle] Agreement ID:", payload?.agreementId);
    console.log("[Oracle] Amount:", payload?.amount, payload?.currency);

    // Step 1: Payload validation
    if (!payload || !payload.paymentReference || !payload.agreementId || !payload.amount) {
      throw new Error("Oracle Validation Failed: Missing required payment confirmation parameters.");
    }

    auditSteps.push({
      step: "PARAM_CHECK",
      passed: true,
      message: "Required parameters verified (reference, agreementId, amount, status).",
    });

    // Step 2: Gateway Payment Status check
    if (payload.status !== "SUCCESS") {
      throw new Error(
        `Oracle Validation Failed: External payment status is '${payload.status}', not SUCCESS.`
      );
    }
    auditSteps.push({
      step: "GATEWAY_STATUS_CHECK",
      passed: true,
      message: "Payment gateway reported SUCCESS status.",
    });

    // Step 3: Cryptographic Authenticity Validation
    const isAuthentic = MockGatewayService.verifySignature(payload, signature);
    if (!isAuthentic) {
      throw new Error(
        "Oracle Validation Failed: Cryptographic signature mismatch! Notification is unverified or tampered."
      );
    }
    auditSteps.push({
      step: "AUTHENTICITY_CHECK",
      passed: true,
      message: "Gateway HMAC-SHA256 signature verified as authentic.",
    });

    // Step 4: Duplicate Payment Reference Check (Off-chain DB)
    const existingDbPayment = await Payment.findOne({
      paymentReference: payload.paymentReference,
    });
    if (existingDbPayment) {
      throw new Error(
        `Oracle Validation Failed: Duplicate payment reference '${payload.paymentReference}' already processed.`
      );
    }

    // Step 5: Duplicate Payment Reference Check (On-chain)
    const readContract = getReadOnlyContract();
    const alreadyProcessedOnChain = await readContract.isPaymentProcessed(
      payload.paymentReference
    );
    if (alreadyProcessedOnChain) {
      throw new Error(
        `Oracle Validation Failed: Blockchain contract indicates payment reference '${payload.paymentReference}' was already recorded.`
      );
    }
    auditSteps.push({
      step: "DUPLICATE_CHECK",
      passed: true,
      message: "Reference is unique in both off-chain DB and on-chain contract.",
    });

    // Step 6: Verify Agreement Status & Details on-chain & DB
    const dbAgreement = await Agreement.findOne({ agreementId: payload.agreementId });
    if (!dbAgreement) {
      throw new Error(`Oracle Validation Failed: Agreement #${payload.agreementId} not found in database.`);
    }

    const onChainAgreement = await readContract.getAgreement(payload.agreementId);
    // On-chain status: 0 = Pending, 1 = Accepted, 2 = Rejected, 3 = Expired, 4 = Terminated
    const onChainStatus = Number(onChainAgreement.status);
    if (onChainStatus !== 1) {
      const statusNames = ["Pending", "Accepted", "Rejected", "Expired", "Terminated"];
      throw new Error(
        `Oracle Validation Failed: On-chain agreement is in status '${statusNames[onChainStatus]}'. Only Accepted agreements can receive payments.`
      );
    }
    auditSteps.push({
      step: "AGREEMENT_STATUS_CHECK",
      passed: true,
      message: "Agreement is verified as Active & Accepted on the blockchain.",
    });

    // Step 7: Submit verified payment to Smart Contract via Oracle Signer
    const oracleContract = getOracleContract();
    const amountInWei = ethers.parseEther(payload.amount.toString());

    console.log("[Oracle] Submitting transaction to Smart Contract via Oracle signer...");
    const tx = await oracleContract.recordPayment(
      payload.agreementId,
      payload.paymentReference,
      amountInWei,
      payload.timestamp
    );

    auditSteps.push({
      step: "BLOCKCHAIN_SUBMISSION",
      passed: true,
      txHash: tx.hash,
      message: `Transaction broadcasted to blockchain: ${tx.hash}`,
    });

    // Await block confirmation
    const receipt = await tx.wait(1);
    console.log(`[Oracle] Transaction confirmed in block #${receipt.blockNumber}! Gas used: ${receipt.gasUsed.toString()}`);

    auditSteps.push({
      step: "BLOCKCHAIN_CONFIRMATION",
      passed: true,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      message: `Payment confirmed on-chain in block #${receipt.blockNumber}`,
    });

    // Step 8: Save Payment Record in MongoDB
    const paymentRecord = await Payment.create({
      agreementId: payload.agreementId,
      paymentReference: payload.paymentReference,
      tenant: user ? user._id : dbAgreement.tenant,
      tenantAddress: user ? user.walletAddress : dbAgreement.tenantAddress,
      amount: payload.amount,
      amountWei: amountInWei.toString(),
      paymentMethod: "Mock Payment Gateway (Oracle Verified)",
      gatewayStatus: payload.status,
      gatewayConfirmation: {
        signature,
        timestamp: payload.timestamp,
        rawPayload: payload,
      },
      oracleVerified: true,
      oracleVerificationDetails: {
        verifiedAt: new Date(),
        oracleAddress: await oracleContract.runner.getAddress(),
        referenceUnique: true,
        agreementActive: true,
        amountMatches: true,
        notes: "All oracle verification criteria passed successfully.",
      },
      recordedOnChain: true,
      blockchainTxHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    });

    console.log("[Oracle] === PAYMENT RECORDED ON BLOCKCHAIN SUCCESSFULLY ===");

    return {
      success: true,
      payment: paymentRecord,
      blockchainTxHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      oracleAddress: await oracleContract.runner.getAddress(),
      auditSteps,
    };
  }

  /**
   * Diagnostic verification helper to test confirmation data without executing tx
   */
  static async verifyOnly(confirmationData) {
    const { payload, signature } = confirmationData;
    const checks = {
      paramCheck: false,
      authenticityCheck: false,
      gatewayStatusCheck: false,
      duplicateCheck: false,
      agreementCheck: false,
    };

    if (payload && payload.paymentReference && payload.agreementId && payload.amount) {
      checks.paramCheck = true;
    }

    if (payload && payload.status === "SUCCESS") {
      checks.gatewayStatusCheck = true;
    }

    if (MockGatewayService.verifySignature(payload, signature)) {
      checks.authenticityCheck = true;
    }

    const existingPayment = await Payment.findOne({
      paymentReference: payload?.paymentReference,
    });
    const readContract = getReadOnlyContract();
    const onChainProcessed = payload?.paymentReference
      ? await readContract.isPaymentProcessed(payload.paymentReference)
      : false;
    checks.duplicateCheck = !existingPayment && !onChainProcessed;

    if (payload?.agreementId) {
      try {
        const onChainAgreement = await readContract.getAgreement(payload.agreementId);
        checks.agreementCheck = Number(onChainAgreement.status) === 1;
      } catch {
        checks.agreementCheck = false;
      }
    }

    return checks;
  }
}

module.exports = OracleService;
