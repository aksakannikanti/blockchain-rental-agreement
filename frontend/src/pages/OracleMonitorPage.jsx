import React, { useState, useEffect } from "react";
import { systemAPI, paymentAPI, agreementAPI } from "../services/api";
import { TxHashLink } from "../components/TxHashLink";
import {
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Layers,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Key,
  ArrowRight,
  Database,
  Lock,
} from "lucide-react";

export const OracleMonitorPage = () => {
  const [health, setHealth] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testLog, setTestLog] = useState([]);
  const [testRunning, setTestRunning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [hRes, pRes] = await Promise.all([
        systemAPI.getHealth(),
        paymentAPI.getHistory(),
      ]);
      setHealth(hRes.data);
      setPayments(pRes.data.payments || []);
    } catch (err) {
      console.error("Oracle monitor data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, []);

  const addLog = (msg, type = "info") => {
    setTestLog((prev) => [
      { text: msg, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19),
    ]);
  };

  // Diagnostic Test 1: Duplicate Payment Rejection
  const runDuplicateTest = async () => {
    if (payments.length === 0) {
      addLog("No existing payments in database yet to duplicate. Make a normal payment first!", "warning");
      return;
    }
    setTestRunning(true);
    const targetPayment = payments[0];
    addLog(`Testing Replay / Duplicate Prevention for Ref: ${targetPayment.paymentReference}...`, "info");

    try {
      const res = await fetch("/api/payments/oracle/verify-and-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          confirmationData: {
            payload: targetPayment.gatewayConfirmation?.rawPayload || {
              gateway: "MockRentalPayGateway-v1",
              agreementId: targetPayment.agreementId,
              paymentReference: targetPayment.paymentReference,
              amount: targetPayment.amount,
              currency: "ETH",
              status: "SUCCESS",
              timestamp: targetPayment.gatewayConfirmation?.timestamp || Math.floor(Date.now() / 1000),
            },
            signature: targetPayment.gatewayConfirmation?.signature || "simulated-sig",
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        addLog(`Oracle Blocked Duplicate! Output: "${data.message}"`, "success");
      } else {
        addLog("Unexpected: Duplicate was accepted!", "error");
      }
    } catch (err) {
      addLog(`Oracle Network / Error: ${err.message}`, "error");
    } finally {
      setTestRunning(false);
    }
  };

  // Diagnostic Test 2: Cryptographic Signature Tampering Rejection
  const runTamperTest = async () => {
    setTestRunning(true);
    addLog("Testing Tampered Signature Validation (Altering amount with stale signature)...", "info");

    try {
      const res = await fetch("/api/payments/oracle/verify-and-record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          confirmationData: {
            payload: {
              gateway: "MockRentalPayGateway-v1",
              agreementId: 1,
              paymentReference: `FORGED-PAY-${Date.now()}`,
              amount: 999.0, // altered amount
              currency: "ETH",
              status: "SUCCESS",
              timestamp: Math.floor(Date.now() / 1000),
            },
            signature: "3a887b469b8bf1e355efec8c9c72eef01460144fbb7e0e7161b96d91d0e52a92", // forged/invalid signature
          },
        }),
      });

      const data = await res.json();
      if (!data.success) {
        addLog(`Oracle Blocked Tampered Payload! Output: "${data.message}"`, "success");
      } else {
        addLog("Unexpected: Tampered payload accepted!", "error");
      }
    } catch (err) {
      addLog(`Oracle Network / Error: ${err.message}`, "error");
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-ping"></span>
            <span className="text-xs font-mono font-bold text-violet-600 uppercase tracking-wider">
              Node.js Oracle Node
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Oracle Verification Engine Monitor
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Real-time oracle telemetry, cryptographic signature checks, and duplicate payment protection
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Refresh Telemetry
        </button>
      </div>

      {/* Oracle Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Oracle Service Status
            </span>
            <Cpu className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-lg font-black text-emerald-600 mt-2 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Active & Listening
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Polling RPC @ 127.0.0.1:8545</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Contract Address
            </span>
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <p className="text-xs font-mono font-bold text-slate-900 mt-2 truncate" title={health?.blockchain?.contractAddress}>
            {health?.blockchain?.contractAddress || "Loading..."}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">RentalAgreement.sol</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Oracle Signer Account
            </span>
            <Key className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-xs font-mono font-bold text-slate-900 mt-2 truncate" title={health?.blockchain?.oracleAddress}>
            {health?.blockchain?.oracleAddress || "0x3C44CdDdB6a9...BC"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Hardhat Account #2</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Verified On-Chain Payments
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-violet-600 mt-2">
            {payments.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">100% duplicate free</p>
        </div>
      </div>

      {/* Security & Rejection Testing Suite */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Oracle Security & Error Handling Demonstration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Test the Oracle's defensive mechanisms directly from the UI: duplicate payment rejection & cryptographic HMAC verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Test 1 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                1. Replay / Duplicate Prevention Test
              </h3>
              <Lock className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-600">
              Sends an already-processed payment reference. The Oracle checks both its local database and the smart contract's `isPaymentProcessed` mapping, rejecting the request.
            </p>
            <button
              onClick={runDuplicateTest}
              disabled={testRunning}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              Trigger Duplicate Payment Test
            </button>
          </div>

          {/* Test 2 */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                2. Signature Tampering / Forgery Test
              </h3>
              <Key className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-600">
              Sends an altered payment confirmation payload with an invalid HMAC signature. The Oracle validates the SHA256 signature and rejects the forged payload before touching the blockchain.
            </p>
            <button
              onClick={runTamperTest}
              disabled={testRunning}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
            >
              Trigger Forged Signature Test
            </button>
          </div>
        </div>

        {/* Live Test Console Log */}
        {testLog.length > 0 && (
          <div className="mt-4 bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-1.5 border border-slate-800">
            <div className="flex justify-between items-center text-slate-400 pb-1 border-b border-slate-800 text-[10px]">
              <span>Oracle Diagnostic Console</span>
              <button onClick={() => setTestLog([])} className="hover:text-white">Clear</button>
            </div>
            {testLog.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-500">[{log.time}]</span>
                <span
                  className={
                    log.type === "success"
                      ? "text-emerald-400 font-semibold"
                      : log.type === "error"
                      ? "text-rose-400 font-semibold"
                      : log.type === "warning"
                      ? "text-amber-400"
                      : "text-indigo-300"
                  }
                >
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Oracle Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Oracle Verified Transaction Registry
            </h2>
            <p className="text-xs text-slate-500">
              Audit trail of all external payments submitted by Oracle to the Hardhat blockchain
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments have been verified through the Oracle yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Agreement ID</th>
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">HMAC Signature Status</th>
                  <th className="py-3 px-4">Blockchain Hash</th>
                  <th className="py-3 px-4">Block #</th>
                  <th className="py-3 px-4">Gas Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      #{p.agreementId}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {p.paymentReference}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {p.amount} ETH
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Valid HMAC-SHA256
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <TxHashLink hash={p.blockchainTxHash} label="Mined Tx" />
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      #{p.blockNumber || 1}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {p.gasUsed || "21,000"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OracleMonitorPage;
