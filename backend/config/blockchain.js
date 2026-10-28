const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Load deployment info
const deploymentPath = path.join(__dirname, "RentalAgreementDeployment.json");
let deploymentInfo = null;

if (fs.existsSync(deploymentPath)) {
  deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
} else {
  console.warn("[Blockchain] Warning: RentalAgreementDeployment.json not found yet.");
}

const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(rpcUrl);

const contractAddress =
  process.env.CONTRACT_ADDRESS || (deploymentInfo ? deploymentInfo.contractAddress : "");
const contractAbi = deploymentInfo ? deploymentInfo.abi : [];

// Generic provider-connected contract (read-only)
const getReadOnlyContract = () => {
  if (!contractAddress || !contractAbi.length) {
    throw new Error("Contract address or ABI not configured");
  }
  return new ethers.Contract(contractAddress, contractAbi, provider);
};

// Oracle Signer & Contract (authorized to record payments)
const getOracleContract = () => {
  const oracleKey =
    process.env.ORACLE_PRIVATE_KEY ||
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
  const oracleWallet = new ethers.Wallet(oracleKey, provider);
  return new ethers.Contract(contractAddress, contractAbi, oracleWallet);
};

// Helper to get a contract instance connected to a specific private key (e.g. landlord or tenant)
const getContractWithSigner = (privateKey) => {
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, contractAbi, wallet);
};

// Landlord contract instance (Account #0 default)
const getLandlordContract = () => {
  const landlordKey =
    process.env.LANDLORD_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  return getContractWithSigner(landlordKey);
};

// Tenant contract instance (Account #1 default)
const getTenantContract = () => {
  const tenantKey =
    process.env.TENANT_PRIVATE_KEY ||
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  return getContractWithSigner(tenantKey);
};

module.exports = {
  provider,
  contractAddress,
  contractAbi,
  getReadOnlyContract,
  getOracleContract,
  getLandlordContract,
  getTenantContract,
  getContractWithSigner,
};
