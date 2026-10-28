# Blockchain Based Rental Agreement

A full-stack, enterprise-grade decentralized application for creating and managing rental agreements using Ethereum smart contracts and an automated Node.js Oracle service for external payment verification.

---

## Table of Contents
1. [Overview & Architecture](#overview--architecture)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [User Modules](#user-modules)
5. [Smart Contract & Statuses](#smart-contract--statuses)
6. [Oracle Integration](#oracle-integration)
7. [Getting Started & Installation](#getting-started--installation)
8. [Running the Application](#running-the-application)
9. [Running Tests](#running-tests)
10. [Demo Accounts](#demo-accounts)

---

## Overview & Architecture

**Blockchain Based Rental Agreement** bridges traditional rental agreements and blockchain immutability. The core workflow for rent payments is:

```
[Tenant] ──▶ [External Payment Gateway Simulator]
                      │ (Confirmation + HMAC Signature)
                      ▼
              [Node.js Oracle Service]
                      │ 1. Validate HMAC signature
                      │ 2. Check duplicate references (DB + Blockchain)
                      │ 3. Check active agreement status on-chain
                      │ 4. Sign and execute recordPayment()
                      ▼
           [Solidity Smart Contract]
                      │
                      ▼
           [Local Hardhat Blockchain]
```

---

## Tech Stack

- **Smart Contracts:** Solidity `^0.8.24`, Hardhat, ethers.js v6
- **Backend & Oracle:** Node.js, Express.js, Mongoose (MongoDB), JWT, bcryptjs, crypto (HMAC-SHA256)
- **Database:** MongoDB
- **Frontend:** React.js (Vite), Tailwind CSS, Lucide Icons, Axios

---

## Folder Structure

```
blockchain-rental-agreement/
├── contracts/                     # Hardhat blockchain project
│   ├── contracts/
│   │   └── RentalAgreement.sol    # Smart contract with agreement & payment ledger
│   ├── scripts/
│   │   └── deploy.js              # Deployment script exporting ABI & address
│   ├── test/
│   │   └── RentalAgreement.test.js# Hardhat unit tests (11 passing)
│   ├── hardhat.config.js
│   └── package.json
├── backend/                       # Node.js Express server & Oracle engine
│   ├── config/
│   │   ├── db.js                  # MongoDB connection
│   │   ├── blockchain.js          # ethers.js provider & wallet signers
│   │   └── RentalAgreementDeployment.json
│   ├── models/
│   │   ├── User.js                # User accounts & roles
│   │   ├── Agreement.js           # Off-chain agreement metadata & cache
│   │   └── Payment.js             # Payment records & oracle audit trail
│   ├── middleware/
│   │   └── auth.js                # JWT verification & role authorization
│   ├── routes/
│   │   ├── authRoutes.js          # Register, login, demo seed
│   │   ├── agreementRoutes.js     # Create, accept, reject, terminate
│   │   └── paymentRoutes.js       # Gateway simulation & Oracle verification
│   ├── services/
│   │   ├── mockGatewayService.js  # External payment gateway simulation
│   │   └── oracleService.js       # Core Oracle verification & submission pipeline
│   ├── test-e2e.js                # Automated 11-step end-to-end integration test
│   ├── server.js                  # Express API server entry point
│   ├── .env.example
│   └── package.json
├── frontend/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # Navigation bar & system status
│   │   │   ├── StatusBadge.jsx    # Status pills (Pending, Accepted, etc.)
│   │   │   ├── TxHashLink.jsx     # Clickable transaction hash display
│   │   │   └── OracleWorkflowModal.jsx # Live Oracle payment verification modal
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Authentication & demo switch state
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       # Landing page with architecture diagram
│   │   │   ├── LoginPage.jsx      # Login page with 1-click demo logins
│   │   │   ├── RegisterPage.jsx   # Registration with role picker
│   │   │   ├── LandlordDashboard.jsx # Leases & payments management
│   │   │   ├── TenantDashboard.jsx   # Review, sign, and pay rent
│   │   │   ├── CreateAgreementPage.jsx # Lease creation form
│   │   │   ├── AgreementDetailPage.jsx # Real-time on-chain inspection
│   │   │   ├── OracleMonitorPage.jsx # Oracle telemetry & security testing
│   │   │   └── PaymentsPage.jsx   # Complete payment ledger
│   │   ├── services/
│   │   │   └── api.js             # Axios client with JWT interceptor
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── .env.example
└── README.md
```

---

## User Modules

### 1. Landlord
- Register and log in.
- Create rental agreements with property details, tenant email/address, monthly rent, security deposit, start/end dates, and covenants.
- View created agreements and their real-time status.
- Terminate active agreements on the blockchain.
- View payment records and blockchain transaction receipts.

### 2. Tenant
- Register and log in.
- View agreements assigned to their email or Ethereum address.
- Review agreement terms and **Accept** or **Reject** on-chain.
- Pay rent via the **Oracle Payment Modal** (simulates payment confirmation -> verifies with Oracle -> records in smart contract).
- View full payment history and transaction hashes.

---

## Smart Contract & Statuses

Contract: `RentalAgreement.sol`
Deployed Address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Statuses:
- `Pending` (0): Agreement created by Landlord; waiting for Tenant review.
- `Accepted` (1): Signed on-chain by Tenant; active lease.
- `Rejected` (2): Tenant rejected the agreement.
- `Expired` (3): Agreement passed its end date.
- `Terminated` (4): Landlord or owner terminated the lease.

### Permissions & Safeguards:
- `onlyOracle`: Only the designated Oracle address (`0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`) can execute `recordPayment()`.
- `isPaymentProcessed[paymentReference]`: Mapping prevents replay attacks and duplicate payment records.
- Acceptance and rejection restricted to the designated tenant address.

---

## Oracle Integration

The Oracle service operates as an independent node:
1. **Verification**: Checks payload integrity, payment status (`SUCCESS`), and agreement state (`Accepted`).
2. **Authenticity Validation**: Verifies the HMAC-SHA256 signature generated by the payment provider.
3. **Replay Protection**: Verifies the payment reference does not already exist in the database or on the smart contract.
4. **On-Chain Recording**: Uses the Oracle's funded Ethereum private key to call `RentalAgreement.recordPayment()`.
5. **Audit Trail**: Saves transaction hash, block number, gas used, and verification logs in MongoDB.

---

## Getting Started & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on port 27017

### 1. Install Dependencies
```bash
# Contracts
cd contracts
npm install

# Backend
cd ../backend
npm install

# Frontend
cd ../frontend
npm install
```

---

## Running the Application

### Step 1: Start Hardhat Local Blockchain Node
```bash
cd contracts
npx hardhat node
```
*Runs on `http://127.0.0.1:8545` (Chain ID: 31337).*

### Step 2: Deploy the Smart Contract
In a new terminal:
```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```
*Exports `RentalAgreementDeployment.json` to both backend and frontend.*

### Step 3: Start the Backend & Oracle Service
In a new terminal:
```bash
cd backend
npm start
```
*Runs on `http://localhost:5000`.*

### Step 4: Start the React Frontend
In a new terminal:
```bash
cd frontend
npm run dev
```
*Access web interface at `http://localhost:3000`.*

---

## Running Tests

### 1. Smart Contract Unit Tests (Hardhat)
```bash
cd contracts
npx hardhat test
```
*Executes all 11 unit tests covering deployment, acceptance, rejection, termination, oracle payments, and duplicate prevention.*

### 2. Full End-to-End System Tests
With the Hardhat node and backend server running:
```bash
cd backend
node test-e2e.js
```
*Runs all 11 automated integration tests verifying the full flow from authentication to blockchain mining, oracle verification, and duplicate payment rejection.*

---

## Demo Accounts

| Role | Email | Password | Hardhat Account | Wallet Address |
|---|---|---|---|---|
| **Landlord** | `landlord@example.com` | `password123` | Account #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| **Tenant** | `tenant@example.com` | `password123` | Account #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| **Oracle** | *Internal Service* | *N/A* | Account #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` |

*(Instant 1-Click Demo login buttons are also provided directly on the UI for quick testing).*
