import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ShieldCheck,
  Building,
  Calendar,
  AlertCircle,
  ArrowRight,
  Cpu,
  Layers,
  Sparkles,
  MapPin,
  DollarSign,
  LayoutGrid,
  List,
  UserCheck,
  Copy,
} from "lucide-react";

export const TenantDashboard = () => {
  const [agreements, setAgreements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("cards"); // "cards" or "table"
  const [selectedAgreementForPay, setSelectedAgreementForPay] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [agrRes, payRes] = await Promise.all([
        agreementAPI.getAll(),
        paymentAPI.getHistory(),
      ]);
      setAgreements(agrRes.data.agreements || []);
      setPayments(payRes.data.payments || []);
    } catch (err) {
      console.error("Tenant dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAccept = async (agreementId) => {
    try {
      const res = await agreementAPI.accept(agreementId);
      addToast(
        `Agreement #${agreementId} successfully Signed & Accepted on Blockchain!`,
        "success"
      );
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to accept agreement", "error");
    }
  };

  const handleReject = async (agreementId) => {
    if (!window.confirm(`Are you sure you want to reject Agreement #${agreementId}?`)) {
      return;
    }
    try {
      const res = await agreementAPI.reject(agreementId);
      addToast(`Agreement #${agreementId} rejected on blockchain.`, "info");
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject agreement", "error");
    }
  };

  const openPayModal = (agreement) => {
    setSelectedAgreementForPay(agreement);
    setIsPayModalOpen(true);
  };

  const pendingAgreements = agreements.filter((a) => a.status === "Pending");
  const acceptedAgreements = agreements.filter((a) => a.status === "Accepted");
  const totalEthPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-200 text-xs font-semibold">
            <UserCheck className="w-3.5 h-3.5 text-violet-300" />
            <span>Tenant Portal • {user?.name || "Tenant"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Tenant Dashboard
          </h1>
          <p className="text-violet-200/80 text-xs sm:text-sm max-w-xl">
            Review lease agreements assigned to you, sign on the blockchain, and pay monthly rent with automated Oracle verification.
          </p>

          {/* Tenant Ethereum Wallet Info */}
          {user?.walletAddress && (
            <div className="pt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/30 border border-white/10 text-xs font-mono text-violet-200">
                <span className="text-violet-400 font-bold font-sans">My Ethereum Wallet:</span>
                <span className="text-white font-medium">{user.walletAddress}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(user.walletAddress);
                  addToast("Wallet address copied to clipboard!", "success");
                }}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                title="Copy Ethereum address to share with Landlord"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          )}
        </div>

        {/* Quick action stat */}
        <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-xs text-violet-100 flex items-center gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-violet-300 font-bold block">
              Total Rent Paid
            </span>
            <span className="text-lg font-black text-white">{formatINR(totalEthPaid)}</span>
          </div>
          <div className="h-8 w-px bg-white/20"></div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-violet-300 font-bold block">
              Active Leases
            </span>
            <span className="text-lg font-black text-emerald-400">{acceptedAgreements.length}</span>
          </div>
        </div>
      </div>

      {/* Prominent Action Required Banner if Pending Agreement exists */}
      {pendingAgreements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
            <h2 className="text-base font-bold text-slate-900">
              Action Required ({pendingAgreements.length} Agreement Awaiting Your Signature)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {pendingAgreements.map((agreement) => (
              <div
                key={agreement._id}
                className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-xs font-mono">
                      Agreement #{agreement.agreementId}
                    </span>
                    <span className="text-xs font-semibold text-amber-800">
                      Pending Your Signature
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {agreement.propertyAddress}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      Rent: <strong className="text-indigo-600 font-bold text-sm">{formatINR(agreement.rentAmount)}</strong>/month
                    </span>
                    <span>•</span>
                    <span>Deposit: {formatINR(agreement.securityDeposit)}</span>
                    <span>•</span>
                    <span>Landlord: {agreement.landlord?.name || "Landlord"}</span>
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                  <Link
                    to={`/agreements/${agreement.agreementId}`}
                    className="flex-1 md:flex-initial px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 text-center transition"
                  >
                    Review Terms
                  </Link>
                  <button
                    onClick={() => handleReject(agreement.agreementId)}
                    className="flex-1 md:flex-initial px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAccept(agreement.agreementId)}
                    className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept & Sign On-Chain
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Leases Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">My Rental Agreements</h2>
            <p className="text-xs text-slate-500">Agreements assigned to your tenant account</p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                viewMode === "cards" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                viewMode === "table" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading your leases...</div>
        ) : agreements.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No rental agreements assigned yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No rental agreements assigned to your account yet. When a landlord creates a lease with your email, it will appear here for you to review and sign.
            </p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agreements.map((agr) => (
              <div
                key={agr._id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-br from-slate-50 to-white">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Lease #{agr.agreementId}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-1 line-clamp-1" title={agr.propertyAddress}>
                      {agr.propertyAddress}
                    </h3>
                    <span className="text-xs text-slate-400">{agr.propertyType}</span>
                  </div>
                  <StatusBadge status={agr.status} />
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Monthly Rent</span>
                      <span className="font-black text-indigo-700 text-base">{formatINR(agr.rentAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Security Deposit</span>
                      <span className="font-bold text-slate-700 text-base">{formatINR(agr.securityDeposit)}</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-medium">
                        {new Date(agr.startDate).toLocaleDateString()} - {new Date(agr.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Landlord:</span>
                      <span className="font-medium truncate max-w-[150px]">{agr.landlord?.name || "Landlord"}</span>
                    </div>
                  </div>

                  <div>
                    <TxHashLink hash={agr.creationTxHash} label="Deploy Tx" />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/agreements/${agr.agreementId}`}
                    className="px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition"
                  >
                    View Details
                  </Link>

                  {agr.status === "Pending" && (
                    <button
                      onClick={() => handleAccept(agr.agreementId)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Sign Lease
                    </button>
                  )}

                  {agr.status === "Accepted" && (
                    <button
                      onClick={() => openPayModal(agr)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay Rent (Via Oracle)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Rent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tx Hash</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agreements.map((agr) => (
                    <tr key={agr._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold">#{agr.agreementId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{agr.propertyAddress}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{formatINR(agr.rentAmount)}</td>
                      <td className="py-3 px-4"><StatusBadge status={agr.status} /></td>
                      <td className="py-3 px-4"><TxHashLink hash={agr.creationTxHash} label="Deploy" /></td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link to={`/agreements/${agr.agreementId}`} className="text-slate-600 hover:text-indigo-600 font-bold">
                          Details
                        </Link>
                        {agr.status === "Accepted" && (
                          <button
                            onClick={() => openPayModal(agr)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Payment History & Oracle Ledger</h2>
            <p className="text-xs text-slate-500">Every payment confirmed by the Oracle and permanently stored on-chain</p>
          </div>
          <Link to="/payments" className="text-xs font-bold text-indigo-600 hover:underline">
            All Payments →
          </Link>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments recorded yet. Click "Pay Rent" on any accepted agreement to simulate a payment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Lease ID</th>
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4">Blockchain Hash</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">#{p.agreementId}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{p.paymentReference}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">{formatINR(p.amount)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Oracle Verified
                      </span>
                    </td>
                    <td className="py-3 px-4"><TxHashLink hash={p.blockchainTxHash} label="On-Chain Tx" /></td>
                    <td className="py-3 px-4 text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay Modal */}
      <OracleWorkflowModal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        agreement={selectedAgreementForPay}
        onPaymentSuccess={loadData}
      />
    </div>
  );
};

export default TenantDashboard;
