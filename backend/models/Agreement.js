const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema(
  {
    agreementId: {
      type: Number,
      required: true,
      unique: true,
    },
    propertyAddress: {
      type: String,
      required: [true, "Property address is required"],
      trim: true,
    },
    propertyType: {
      type: String,
      default: "Apartment",
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    landlord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    landlordAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    tenant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    tenantAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    tenantEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    rentAmount: {
      type: Number,
      required: [true, "Rent amount is required"],
    },
    rentAmountWei: {
      type: String,
      required: true,
    },
    securityDeposit: {
      type: Number,
      required: true,
      default: 0,
    },
    securityDepositWei: {
      type: String,
      required: true,
      default: "0",
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    terms: {
      type: String,
      required: [true, "Terms and conditions are required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected", "Expired", "Terminated"],
      default: "Pending",
    },
    creationTxHash: {
      type: String,
      default: "",
    },
    acceptanceTxHash: {
      type: String,
      default: "",
    },
    rejectionTxHash: {
      type: String,
      default: "",
    },
    terminationTxHash: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Agreement", agreementSchema);
