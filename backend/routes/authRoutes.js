const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || "blockchain_rental_secret_key_jwt_super_secure_2026",
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new landlord or tenant
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, walletAddress, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (name, email, password, role)",
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role,
      walletAddress: walletAddress || "",
      phone: phone || "",
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("[Auth Register Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & return JWT token
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("[Auth Login Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

// @route   GET /api/auth/users
// @desc    Get list of tenants or landlords
router.get("/users", protect, async (req, res) => {
  try {
    const roleFilter = req.query.role;
    const query = roleFilter ? { role: roleFilter } : {};
    const users = await User.find(query).select("-password");
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/seed-demo
// @desc    Seed default Landlord and Tenant demo accounts
router.post("/seed-demo", async (req, res) => {
  try {
    const defaultLandlord = {
      name: "Alice Vance (Landlord)",
      email: "landlord@example.com",
      password: "password123",
      role: "landlord",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat Account #0
      phone: "+1 (555) 234-5678",
    };

    const defaultTenant = {
      name: "Bob Martin (Tenant)",
      email: "tenant@example.com",
      password: "password123",
      role: "tenant",
      walletAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat Account #1
      phone: "+1 (555) 876-5432",
    };

    let landlord = await User.findOne({ email: defaultLandlord.email });
    if (!landlord) {
      landlord = await User.create(defaultLandlord);
    }

    let tenant = await User.findOne({ email: defaultTenant.email });
    if (!tenant) {
      tenant = await User.create(defaultTenant);
    }

    res.json({
      success: true,
      message: "Demo landlord and tenant accounts are ready!",
      demoAccounts: {
        landlord: {
          email: defaultLandlord.email,
          password: "password123",
          walletAddress: defaultLandlord.walletAddress,
        },
        tenant: {
          email: defaultTenant.email,
          password: "password123",
          walletAddress: defaultTenant.walletAddress,
        },
      },
    });
  } catch (error) {
    console.error("[Seed Demo Error]:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
