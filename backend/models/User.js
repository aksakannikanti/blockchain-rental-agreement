const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ethers } = require("ethers");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["landlord", "tenant"],
      default: "tenant",
      required: true,
    },
    walletAddress: {
      type: String,
      trim: true,
      default: () => ethers.Wallet.createRandom().address,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  // Ensure wallet address is never empty
  if (!this.walletAddress || this.walletAddress.trim() === "") {
    this.walletAddress = ethers.Wallet.createRandom().address;
  }
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
