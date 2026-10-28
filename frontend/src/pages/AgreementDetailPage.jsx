import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { agreementAPI, paymentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/formatters";
import { StatusBadge } from "../components/StatusBadge";
import { TxHashLink } from "../components/TxHashLink";
import { OracleWorkflowModal } from "../components/OracleWorkflowModal";
import {
  FileText,
  CreditCard,
  Building,
  Calendar,
  User,
  Shield,
  Layers,
  CheckCircle,
  XCircle,
  Ban,
  ArrowLeft,
  DollarSign,
  ShieldCheck,
  MapPin,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const AgreementDetailPage = () => {
  const { id } = useParams();
  const { user, isLandlord, isTenant } = useAuth();
  const { addToast } = useToast();

  const [agreement, setAgreement] = useState(null);
  const [onChainData, setOnChainData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const loadAgreementData = async () => {
    try {
      setLoading(true);
      const res = await agreementAPI.getById(id);
      setAgreement(res.data.agreement);
      setOnChainData(res.data.onChainData);

      const payRes = await paymentAPI.getByAgreement(id);
      setPayments(payRes.data.dbPayments || []);
    } catch (err) {
      console.error("Fetch agreement error:", err);
      addToast(err.response?.data?.message || "Failed to load agreement details", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgreementData();
  }, [id]);

  const handleAccept = async () => {
    try {
      const res = await agreementAPI.accept(id);
      addToast("Lease agreement successfully signed and accepted on-chain!", "success");
      loadAgreementData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to accept agreement", "error");
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Are you sure you want to reject this lease agreement?")) {
      return;
    }
    try {
      const res = await agreementAPI.reject(id);
      addToast("Lease agreement was rejected on the blockchain.", "info");
      loadAgreementData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject agreement", "error");
    }
  };

  const handleTerminate = async () => {
    if (!window.confirm("Are you sure you want to terminate this active lease on the blockchain?")) {
      return;
    }
    try {
      const res = await agreementAPI.terminate(id);
      addToast("Lease terminated on the blockchain.", "success");
      loadAgreementData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to terminate agreement", "error");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">
        Loading agreement #{id}...
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-600 font-bold">Lease agreement #{id} not found.</p>
        <Link to="/" className="text-indigo-600 text-xs font-semibold hover:underline">
          Return Home
        </Link>
      </div>
    );
  }

  const isAssignedTenant =
    isTenant ||
    agreement.tenant?._id === user?.id ||
    agreement.tenantEmail?.toLowerCase() === user?.email?.toLowerCase();

  const isAgreementLandlord =
    isLandlord || agreement.landlord?._id === user?.id;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation & Status */}
      <div className="flex items-center justify-between">
        <Link
          to={isLandlord ? "/dashboard/landlord" : "/dashboard/tenant"}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>

        <StatusBadge status={agreement.status} />
      </div>

      {/* Main Official Lease Document Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-[11px] font-mono font-bold">
              Agreement ID #{agreement.agreementId}
            </span>
            <h1 className="text-2xl font-black text-white">
              {agreement.propertyAddress}
            </h1>
            <p className="text-xs text-slate-300">
              {agreement.propertyType} • {agreement.description}
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-2">
            {isAssignedTenant && agreement.status === "Pending" && (
              <>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition"
                >
                  Reject
                </button>
                <button
                  onClick={handleAccept}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Sign Lease On-Chain
                </button>
              </>
            )}

            {isAssignedTenant && agreement.status === "Accepted" && (
              <button
                onClick={() => setIsPayModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 text-white text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" /> Pay Rent
              </button>
            )}

            {isAgreementLandlord && agreement.status === "Accepted" && (
              <button
                onClick={handleTerminate}
                className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> End Lease
              </button>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Landlord (Owner)
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {agreement.landlord?.name || "Alice Vance"}
              </p>
              <p className="text-xs text-slate-500">{agreement.landlord?.email || "landlord@example.com"}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Tenant
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {agreement.tenant?.name || "Bob Martin"}
              </p>
              <p className="text-xs text-slate-500">{agreement.tenantEmail || "tenant@example.com"}</p>
            </div>
          </div>

          {/* Key Financial Terms */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs">
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Monthly Rent</span>
              <span className="text-xl font-black text-indigo-700 block mt-0.5">
                {formatINR(agreement.rentAmount)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Security Deposit</span>
              <span className="text-xl font-bold text-slate-800 block mt-0.5">
                {formatINR(agreement.securityDeposit)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">Start Date</span>
              <span className="font-semibold text-slate-800 block mt-1">
                {new Date(agreement.startDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 uppercase text-[10px] font-bold block">End Date</span>
              <span className="font-semibold text-slate-800 block mt-1">
                {new Date(agreement.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Lease Covenants & Terms */}
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Lease Terms & Conditions
            </h3>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {agreement.terms}
            </div>
          </div>

          {/* Simple Blockchain Verification Seal */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Smart Contract on Local Ethereum Ledger
            </div>
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              {showTechnicalDetails ? "Hide Technical Hashes" : "Inspect Blockchain Receipts"}
              {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Technical Proof for Auditors */}
          {showTechnicalDetails && (
            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs space-y-2">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Smart Contract Audit Trail</p>
              <div>
                <span className="text-slate-400">Creation Transaction:</span>
                <p className="text-emerald-400 break-all select-all">{agreement.creationTxHash || "N/A"}</p>
              </div>
              {agreement.acceptanceTxHash && (
                <div>
                  <span className="text-slate-400">Tenant Acceptance Tx:</span>
                  <p className="text-emerald-400 break-all select-all">{agreement.acceptanceTxHash}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Rent Payment Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Rent Payment Ledger</h2>
            <p className="text-xs text-slate-500">Every payment verified by the Oracle and permanently recorded on-chain</p>
          </div>
          {isAssignedTenant && agreement.status === "Accepted" && (
            <button
              onClick={() => setIsPayModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" /> Pay Rent
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments have been recorded for this lease yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Blockchain Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.paymentReference}
                    </td>
                    <td className="py-3 px-4 font-black text-indigo-700">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Verified & Paid
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <TxHashLink hash={p.blockchainTxHash} label="Tx" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <OracleWorkflowModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        agreement={agreement}
        onPaymentSuccess={loadAgreementData}
      />
    </div>
  );
};

export default AgreementDetailPage;
