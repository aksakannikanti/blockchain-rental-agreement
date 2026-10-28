require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { provider, contractAddress, getOracleContract, getReadOnlyContract } = require("./config/blockchain");
const User = require("./models/User");
const Agreement = require("./models/Agreement");
const Payment = require("./models/Payment");

// Import Routes
const authRoutes = require("./routes/authRoutes");
const agreementRoutes = require("./routes/agreementRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for debugging & demonstration
app.use((req, res, next) => {
  console.log(`[HTTP ${req.method}] ${req.url}`);
  next();
});

// Auto-seed Demo Users on startup
const autoSeedDemoUsers = async () => {
  try {
    const landlordExists = await User.findOne({ email: "landlord@example.com" });
    if (!landlordExists) {
      await User.create({
        name: "Alice Landlord",
        email: "landlord@example.com",
        password: "password123",
        role: "landlord",
        walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        phone: "+1 (555) 234-5678",
      });
      console.log("[Demo Seed] Created default Landlord: landlord@example.com / password123");
    }

    const tenantExists = await User.findOne({ email: "tenant@example.com" });
    if (!tenantExists) {
      await User.create({
        name: "Bob Tenant",
        email: "tenant@example.com",
        password: "password123",
        role: "tenant",
        walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        phone: "+1 (555) 876-5432",
      });
      console.log("[Demo Seed] Created default Tenant: tenant@example.com / password123");
    }
  } catch (err) {
    console.warn("[Demo Seed Error]:", err.message);
  }
};

setTimeout(autoSeedDemoUsers, 2000);

// Auto-sync database with active blockchain state
const syncBlockchainWithDB = async () => {
  try {
    const readContract = getReadOnlyContract();
    const totalOnChain = Number(await readContract.getTotalAgreements());
    console.log(`[Sync] Active smart contract agreements on blockchain: ${totalOnChain}`);

    if (totalOnChain === 0) {
      const resAgr = await Agreement.deleteMany({});
      const resPay = await Payment.deleteMany({});
      if (resAgr.deletedCount > 0) {
        console.log(`[Sync] Cleared ${resAgr.deletedCount} outdated agreements from previous chain run.`);
      }
    } else {
      const res = await Agreement.deleteMany({ agreementId: { $gt: totalOnChain } });
      if (res.deletedCount > 0) {
        console.log(`[Sync] Cleaned ${res.deletedCount} stale agreements beyond on-chain count.`);
      }
    }
  } catch (err) {
    console.warn("[Blockchain Sync Warning]:", err.message);
  }
};

setTimeout(syncBlockchainWithDB, 2500);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/agreements", agreementRoutes);
app.use("/api/payments", paymentRoutes);

// In-App Blockchain Transaction Inspector Route
app.get("/api/blockchain/tx/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    if (!hash || !hash.startsWith("0x")) {
      return res.status(400).json({ success: false, message: "Invalid transaction hash" });
    }

    const [tx, receipt] = await Promise.all([
      provider.getTransaction(hash),
      provider.getTransactionReceipt(hash),
    ]);

    if (!tx || !receipt) {
      return res.status(404).json({ success: false, message: "Transaction not found on chain" });
    }

    let parsedEvents = [];
    const readContract = require("./config/blockchain").getReadOnlyContract();
    for (const log of receipt.logs) {
      try {
        const parsed = readContract.interface.parseLog(log);
        if (parsed) {
          const argsClean = {};
          for (const key of Object.keys(parsed.args)) {
            if (isNaN(key)) {
              argsClean[key] = parsed.args[key].toString();
            }
          }
          parsedEvents.push({
            name: parsed.name,
            signature: parsed.signature,
            args: argsClean,
          });
        }
      } catch {
        // Log is not from this contract
      }
    }

    res.json({
      success: true,
      transaction: {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? "SUCCESS" : "REVERTED",
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.gasPrice ? receipt.gasPrice.toString() : "0",
        valueWei: tx.value.toString(),
        events: parsedEvents,
      },
    });
  } catch (error) {
    console.error("[Tx Inspector Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Health & System Info Route
app.get("/api/health", async (req, res) => {
  let blockchainConnected = false;
  let blockNumber = null;
  let oracleAddress = null;

  try {
    blockNumber = await provider.getBlockNumber();
    blockchainConnected = true;
    const oracle = getOracleContract();
    oracleAddress = await oracle.runner.getAddress();
  } catch (err) {
    console.warn("[Health Check] Blockchain connection error:", err.message);
  }

  res.json({
    status: "ok",
    application: "Blockchain Based Rental Agreement API & Oracle Service",
    timestamp: new Date().toISOString(),
    blockchain: {
      connected: blockchainConnected,
      blockNumber,
      contractAddress,
      oracleAddress,
      network: "Hardhat Localhost (31337)",
    },
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Blockchain Based Rental Agreement API & Oracle is running.");
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`“Blockchain Based Rental Agreement” Server & Oracle`);
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Contract: ${contractAddress}`);
  console.log(`=======================================================`);
});
