import React, { useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Building,
  DollarSign,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
  Receipt,
  Download,
} from "lucide-react";
import { TxHashLink } from "./TxHashLink";
import { formatINR } from "../utils/formatters";

export const OracleWorkflowModal = ({
  isOpen,
  onClose,
  agreement,
  onPaymentSuccess,
}) => {
  const [stage, setStage] = useState("IDLE"); // IDLE, PROCESSING, SUCCESS, ERROR
  const [stepText, setStepText] = useState("");
  const [oracleResult, setOracleResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [simulateTampering, setSimulateTampering] = useState(false);

  if (!isOpen) return null;

  const rentAmountEth = agreement?.rentAmount || 0.5;
  const approxUsd = (rentAmountEth * 3000).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const handlePayRent = async () => {
    try {
      setErrorMessage("");
      setStage("PROCESSING");
      setStepText("Step 1: Contacting payment gateway provider...");

      // 1. Request simulated external payment from Mock Gateway
      const gatewayRes = await fetch("/api/payments/simulate-gateway", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          agreementId: agreement.agreementId,
          amount: Number(rentAmountEth),
        }),
      });

      const gatewayData = await gatewayRes.json();
      if (!gatewayData.success) {
        throw new Error(gatewayData.message || "Payment gateway processing failed.");
      }

      let confirmation = gatewayData.confirmationData;

      if (simulateTampering) {
        confirmation = {
          ...confirmation,
          payload: {
            ...confirmation.payload,
            amount: Number(rentAmountEth) + 999, // tampered amount
          },
        };
      }

      setStepText("Step 2: Oracle verifying digital HMAC confirmation and checking active lease...");
      await new Promise((r) => setTimeout(r, 900));

      setStepText("Step 3: Submitting verified payment record to Ethereum smart contract...");

      // 2. Oracle Service verification and Smart Contract submission
      const oracleRes = await fetch("/api/payments/oracle/verify-and-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          confirmationData: confirmation,
        }),
      });

      const oracleData = await oracleRes.json();
      if (!oracleData.success) {
        throw new Error(oracleData.message || "Oracle rejected the payment verification.");
      }

      setOracleResult(oracleData);
      setStage("SUCCESS");
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      setStage("ERROR");
    }
  };

  const handleReset = () => {
    setStage("IDLE");
    setOracleResult(null);
    setErrorMessage("");
    setSimulateTampering(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Pay Monthly Rent
              </h3>
              <p className="text-xs text-slate-500">
                Official rent payment for Lease #{agreement?.agreementId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Stage 1: Checkout Form */}
        {stage === "IDLE" && (
          <div className="space-y-5">
            {/* Payment Summary Box */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex justify-between items-start text-xs">
                <span className="text-slate-500 font-medium">Property:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px] truncate">
                  {agreement?.propertyAddress}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Landlord:</span>
                <span className="font-semibold text-slate-800">
                  {agreement?.landlord?.name || "Alice Vance"}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Total Amount Due:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-indigo-700 block">
                    {formatINR(rentAmountEth)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    (In Indian Rupees ₹)
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Payment Method:
              </label>
              <div className="p-3 bg-white rounded-2xl border-2 border-indigo-600/40 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    💳
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Credit / Debit Card (Simulated Gateway)
                    </p>
                    <p className="text-[10px] text-slate-500">Instant external confirmation</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              type="button"
              onClick={handlePayRent}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              Authorize & Pay {formatINR(rentAmountEth)}
            </button>

            {/* Optional Auditor Testing Dropdown */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1 transition"
              >
                {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                Auditor & Security Testing Options
              </button>

              {showTechnicalDetails && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simulateTampering}
                      onChange={(e) => setSimulateTampering(e.target.checked)}
                      className="rounded text-rose-600"
                    />
                    <span className="text-[11px] text-rose-700 font-semibold">
                      [Test Security] Tamper notification payload (Oracle will reject)
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stage 2: Processing Animation */}
        {stage === "PROCESSING" && (
          <div className="py-10 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-slate-900">
                Processing Rent Payment...
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                {stepText}
              </p>
            </div>
          </div>
        )}

        {/* Stage 3: Payment Success & Receipt */}
        {stage === "SUCCESS" && oracleResult && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">
                Rent Payment Successful!
              </h4>
              <p className="text-xs text-slate-500">
                Your payment was verified by the Oracle and permanently recorded on the blockchain.
              </p>
            </div>

            {/* Official Digital Rent Receipt */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200 font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" /> Rent Receipt
                </span>
                <span className="text-emerald-700">PAID & VERIFIED</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-slate-900">
                  {oracleResult.payment?.paymentReference}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-black text-indigo-700 text-sm">
                  {formatINR(oracleResult.payment?.amount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mined in Block:</span>
                <span className="font-mono font-bold text-slate-800">
                  #{oracleResult.blockNumber}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 block mb-0.5">Blockchain Tx Hash:</span>
                <TxHashLink hash={oracleResult.blockchainTxHash} label="Receipt Tx" />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-xs transition"
            >
              Done & Return to Dashboard
            </button>
          </div>
        )}

        {/* Stage 4: Error State */}
        {stage === "ERROR" && (
          <div className="space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">
                Payment Verification Failed
              </h4>
              <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-mono">
                {errorMessage}
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OracleWorkflowModal;
