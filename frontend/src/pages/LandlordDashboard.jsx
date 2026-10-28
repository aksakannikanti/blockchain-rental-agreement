import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { agreementAPI, paymentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatINR } from "../utils/formatters";
import { StatusBadge } from "../components/StatusBadge";
import { TxHashLink } from "../components/TxHashLink";
import {
  PlusCircle,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Ban,
  Building,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Search,
  LayoutGrid,
  List,
  Sparkles,
} from "lucide-react";

export const LandlordDashboard = () => {
  const [agreements, setAgreements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cards");
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
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTerminate = async (agreementId) => {
    if (
      !window.confirm(
        `Are you sure you want to terminate Agreement #${agreementId} on the blockchain?`
      )
    ) {
      return;
    }
    try {
      const res = await agreementAPI.terminate(agreementId);
      addToast(
        `Agreement #${agreementId} successfully Terminated on Blockchain!`,
        "success"
      );
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to terminate agreement.", "error");
    }
  };

  const filteredAgreements = agreements.filter((item) => {
    const matchesFilter =
      filter === "all" || item.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.propertyAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tenant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tenantEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const activeCount = agreements.filter((a) => a.status === "Accepted").length;
  const pendingCount = agreements.filter((a) => a.status === "Pending").length;
  const totalEthCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold">
            <Building className="w-3.5 h-3.5 text-indigo-300" />
            <span>Landlord Portal • {user?.name || "Landlord"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Landlord Dashboard
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
            Create smart lease agreements, track tenant signatures on the blockchain, and verify rent payments recorded by the Oracle.
          </p>
        </div>

        <Link
          to="/agreements/create"
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
        >
          <PlusCircle className="w-5 h-5" />
          Create New Agreement
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Leases
            </span>
            <Building className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{agreements.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Smart contracts deployed</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Leases
            </span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{activeCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Signed by tenant</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pending Signatures
            </span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting tenant signature</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Rent Recorded
            </span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {formatINR(totalEthCollected)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Oracle verified on-chain</p>
        </div>
      </div>

      {/* Agreements Section */}
      <div className="space-y-4">
        {/* Controls Bar: Search, Filters, and View Toggle */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search property or tenant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
            {["all", "pending", "accepted", "terminated"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                  filter === f
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {f === "all" ? "All Leases" : f}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
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

        {/* Agreements Display */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading agreements...</div>
        ) : filteredAgreements.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4">
            <Building className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-base">No agreements found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click 'Create Agreement' below to create your first rental agreement on the blockchain.
            </p>
            <Link
              to="/agreements/create"
              className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
            >
              <PlusCircle className="w-4 h-4" /> Create Agreement
            </Link>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgreements.map((agreement) => (
              <div
                key={agreement._id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-br from-slate-50 to-white">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      Lease #{agreement.agreementId}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-1 line-clamp-1" title={agreement.propertyAddress}>
                      {agreement.propertyAddress}
                    </h3>
                    <span className="text-xs text-slate-400">{agreement.propertyType}</span>
                  </div>
                  <StatusBadge status={agreement.status} />
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Monthly Rent</span>
                      <span className="font-black text-indigo-700 text-base">{formatINR(agreement.rentAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Security Deposit</span>
                      <span className="font-bold text-slate-700 text-base">{formatINR(agreement.securityDeposit)}</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tenant:</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                        {agreement.tenant?.name || agreement.tenantEmail || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-medium">
                        {new Date(agreement.startDate).toLocaleDateString()} -{" "}
                        {new Date(agreement.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div>
                    <TxHashLink hash={agreement.creationTxHash} label="Deploy Tx" />
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/agreements/${agreement.agreementId}`}
                    className="px-3.5 py-2 text-slate-700 hover:text-indigo-600 font-bold text-xs rounded-xl hover:bg-slate-100 transition"
                  >
                    View Details
                  </Link>

                  {agreement.status === "Accepted" && (
                    <button
                      onClick={() => handleTerminate(agreement.agreementId)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Terminate Lease
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Tenant</th>
                    <th className="py-3 px-4">Rent</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Deploy Tx</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAgreements.map((agreement) => (
                    <tr key={agreement._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">#{agreement.agreementId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{agreement.propertyAddress}</td>
                      <td className="py-3 px-4">{agreement.tenant?.name || agreement.tenantEmail}</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{formatINR(agreement.rentAmount)}</td>
                      <td className="py-3 px-4"><StatusBadge status={agreement.status} /></td>
                      <td className="py-3 px-4"><TxHashLink hash={agreement.creationTxHash} label="Deploy" /></td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link to={`/agreements/${agreement.agreementId}`} className="text-slate-600 hover:text-indigo-600 font-bold">
                          Details
                        </Link>
                        {agreement.status === "Accepted" && (
                          <button
                            onClick={() => handleTerminate(agreement.agreementId)}
                            className="text-rose-600 hover:text-rose-800 font-bold"
                          >
                            Terminate
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

      {/* Recent Payments Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Oracle-Verified Payment Ledger</h2>
            <p className="text-xs text-slate-500">Rent payments confirmed by Oracle and mined on the blockchain</p>
          </div>
          <Link to="/payments" className="text-xs font-bold text-indigo-600 hover:underline">
            All Payments →
          </Link>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No payments received yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Lease ID</th>
                  <th className="py-3 px-4">Payment Reference</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Oracle Verification</th>
                  <th className="py-3 px-4">Blockchain Tx</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.slice(0, 5).map((p) => (
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
    </div>
  );
};

export default LandlordDashboard;
