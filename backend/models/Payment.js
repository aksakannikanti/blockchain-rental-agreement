const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    agreementId: {
      type: Number,
      required: true,
      index: true,
    },
    paymentReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    tenantAddress: {
      type: String,
      lowercase: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountWei: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "Simulated Payment Gateway",
    },
    gatewayStatus: {
      type: String,
      enum: ["SUCCESS", "PENDING", "FAILED"],
      default: "SUCCESS",
    },
    gatewayConfirmation: {
      signature: String,
      timestamp: Number,
      rawPayload: Object,
    },
    oracleVerified: {
      type: Boolean,
      default: false,
    },
    oracleVerificationDetails: {
      verifiedAt: Date,
      oracleAddress: String,
      referenceUnique: Boolean,
      agreementActive: Boolean,
      amountMatches: Boolean,
      notes: String,
    },
    recordedOnChain: {
      type: Boolean,
      default: false,
    },
    blockchainTxHash: {
      type: String,
      default: "",
    },
    blockNumber: {
      type: Number,
    },
    gasUsed: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);
