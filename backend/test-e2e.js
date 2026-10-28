const { ethers } = require("ethers");

const BASE_URL = "http://localhost:5000/api";

async function runEndToEndTests() {
  console.log("====================================================================");
  console.log("Starting End-to-End Test Suite: Blockchain Based Rental Agreement");
  console.log("====================================================================");

  let landlordToken, tenantToken, testAgreementId, paymentRef;

  // Test 1: Health Check
  console.log("\n[TEST 1] Verifying System Health & Blockchain Connection...");
  const healthRes = await fetch(`${BASE_URL}/health`).then((r) => r.json());
  if (!healthRes.blockchain?.connected) {
    throw new Error("Blockchain node is not connected!");
  }
  console.log("  ✔ Health OK. Connected to Hardhat node at block #" + healthRes.blockchain.blockNumber);
  console.log("  ✔ Contract Address: " + healthRes.blockchain.contractAddress);
  console.log("  ✔ Oracle Address:   " + healthRes.blockchain.oracleAddress);

  // Test 2: Authentication
  console.log("\n[TEST 2] Authenticating Landlord & Tenant Demo Accounts...");
  const landlordLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "landlord@example.com", password: "password123" }),
  }).then((r) => r.json());

  const tenantLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "tenant@example.com", password: "password123" }),
  }).then((r) => r.json());

  if (!landlordLogin.token || !tenantLogin.token) {
    throw new Error("Authentication failed for landlord or tenant demo accounts!");
  }
  landlordToken = landlordLogin.token;
  tenantToken = tenantLogin.token;
  console.log("  ✔ Landlord logged in: " + landlordLogin.user.name + " (" + landlordLogin.user.walletAddress + ")");
  console.log("  ✔ Tenant logged in:   " + tenantLogin.user.name + " (" + tenantLogin.user.walletAddress + ")");

  // Test 3: Agreement Creation by Landlord
  console.log("\n[TEST 3] Creating Rental Agreement on-chain via Landlord Signer...");
  const createRes = await fetch(`${BASE_URL}/agreements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${landlordToken}`,
    },
    body: JSON.stringify({
      propertyAddress: "999 Satoshi Nakamoto Lane, Block #42",
      propertyType: "Apartment",
      description: "Automated E2E Test Property with smart contract lease",
      tenantEmail: "tenant@example.com",
      tenantAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      rentAmount: 25000,
      securityDeposit: 50000,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
      terms: "1. Rent payable monthly in Indian Rupees (₹25,000). 2. Verified via Node.js Oracle.",
    }),
  }).then((r) => r.json());

  if (!createRes.success) {
    throw new Error("Agreement creation failed: " + createRes.message);
  }
  testAgreementId = createRes.agreement.agreementId;
  console.log("  ✔ Agreement #" + testAgreementId + " created successfully!");
  console.log("  ✔ Blockchain Tx Hash: " + createRes.txHash);
  console.log("  ✔ Status: " + createRes.agreement.status + " (Pending)");

  // Test 4: Tenant Accepts Agreement on-chain
  console.log(`\n[TEST 4] Tenant Accepting Agreement #${testAgreementId} on Blockchain...`);
  const acceptRes = await fetch(`${BASE_URL}/agreements/${testAgreementId}/accept`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tenantToken}` },
  }).then((r) => r.json());

  if (!acceptRes.success) {
    throw new Error("Agreement acceptance failed: " + acceptRes.message);
  }
  console.log("  ✔ Agreement successfully Accepted by tenant!");
  console.log("  ✔ Blockchain Acceptance Tx Hash: " + acceptRes.txHash);

  // Test 5: Verify Agreement On-Chain State Sync
  console.log(`\n[TEST 5] Reading Agreement #${testAgreementId} On-Chain State from Smart Contract...`);
  const verifyRes = await fetch(`${BASE_URL}/agreements/${testAgreementId}`, {
    headers: { Authorization: `Bearer ${tenantToken}` },
  }).then((r) => r.json());

  if (verifyRes.onChainData?.statusName !== "Accepted") {
    throw new Error("Expected on-chain status 'Accepted', got: " + verifyRes.onChainData?.statusName);
  }
  console.log("  ✔ Smart Contract confirms status is 'Accepted' (status enum 1)");

  // Test 6: External Payment Gateway Simulation
  console.log(`\n[TEST 6] Simulating External Payment Gateway Transaction...`);
  const gatewayRes = await fetch(`${BASE_URL}/payments/simulate-gateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      agreementId: testAgreementId,
      amount: 25000,
    }),
  }).then((r) => r.json());

  if (!gatewayRes.success) {
    throw new Error("Gateway payment failed: " + gatewayRes.message);
  }
  paymentRef = gatewayRes.confirmationData.payload.paymentReference;
  console.log("  ✔ Gateway confirmation generated. Reference: " + paymentRef);
  console.log("  ✔ Cryptographic HMAC Signature: " + gatewayRes.confirmationData.signature);

  // Test 7: Oracle Verification & Submission to Smart Contract
  console.log(`\n[TEST 7] Oracle Verifying Confirmation and Submitting to Blockchain...`);
  const oracleRes = await fetch(`${BASE_URL}/payments/oracle/verify-and-record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      confirmationData: gatewayRes.confirmationData,
    }),
  }).then((r) => r.json());

  if (!oracleRes.success) {
    throw new Error("Oracle verification failed: " + oracleRes.message);
  }
  console.log("  ✔ Oracle verification passed!");
  console.log("  ✔ Submitted on-chain by Oracle: " + oracleRes.oracleAddress);
  console.log("  ✔ Blockchain Tx Hash: " + oracleRes.blockchainTxHash);
  console.log("  ✔ Confirmed in Block #" + oracleRes.blockNumber);

  // Test 8: Replay / Duplicate Payment Prevention
  console.log(`\n[TEST 8] Testing Duplicate Payment Replay Prevention with Reference: ${paymentRef}...`);
  const dupRes = await fetch(`${BASE_URL}/payments/oracle/verify-and-record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      confirmationData: gatewayRes.confirmationData, // exact same confirmationData
    }),
  }).then((r) => r.json());

  if (dupRes.success) {
    throw new Error("SECURITY FAILURE: Duplicate payment was accepted!");
  }
  console.log("  ✔ Security test passed! Oracle rejected duplicate reference: " + dupRes.message);

  // Test 9: Tampered Cryptographic Signature Rejection
  console.log(`\n[TEST 9] Testing Cryptographic Authenticity Validation (Tampered payload)...`);
  const tamperedConfirmation = {
    ...gatewayRes.confirmationData,
    payload: {
      ...gatewayRes.confirmationData.payload,
      amount: 9999.0, // altered amount with old signature
      paymentReference: "TAMPERED-REF-" + Date.now(),
    },
  };
  const tamperRes = await fetch(`${BASE_URL}/payments/oracle/verify-and-record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tenantToken}`,
    },
    body: JSON.stringify({
      confirmationData: tamperedConfirmation,
    }),
  }).then((r) => r.json());

  if (tamperRes.success) {
    throw new Error("SECURITY FAILURE: Tampered payment was accepted!");
  }
  console.log("  ✔ Security test passed! Oracle rejected tampered payload: " + tamperRes.message);

  // Test 10: On-chain Payment Ledger Verification
  console.log(`\n[TEST 10] Reading On-Chain Payment History for Agreement #${testAgreementId}...`);
  const agreementDetail = await fetch(`${BASE_URL}/agreements/${testAgreementId}`, {
    headers: { Authorization: `Bearer ${landlordToken}` },
  }).then((r) => r.json());

  const recordedPayments = agreementDetail.onChainPayments || [];
  const found = recordedPayments.find((p) => p.paymentReference === paymentRef);
  if (!found) {
    throw new Error("Payment record not found in smart contract payment history!");
  }
  console.log("  ✔ Found verified payment on smart contract ledger: " + found.paymentReference + " (₹" + Number(found.amountEth).toLocaleString("en-IN") + ")");

  // Test 11: Agreement Termination on Blockchain
  console.log(`\n[TEST 11] Landlord Terminating Agreement #${testAgreementId} on Blockchain...`);
  const terminateRes = await fetch(`${BASE_URL}/agreements/${testAgreementId}/terminate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${landlordToken}` },
  }).then((r) => r.json());

  if (!terminateRes.success) {
    throw new Error("Termination failed: " + terminateRes.message);
  }
  console.log("  ✔ Agreement successfully Terminated on blockchain! Tx: " + terminateRes.txHash);

  console.log("\n====================================================================");
  console.log("ALL 11 END-TO-END TESTS PASSED SUCCESSFULLY! 🚀");
  console.log("====================================================================");
}

runEndToEndTests().catch((err) => {
  console.error("\n❌ E2E Test Failed:", err);
  process.exit(1);
});
