import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { paymentAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatINR } from "../utils/formatters";
import { TxHashLink } from "../components/TxHashLink";
import {
  CreditCard,
  ShieldCheck,
  Building,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  Receipt,
  CheckCircle,
} from "lucide-react";

export const PaymentsPage = () => {
  const { user, isLandlord, isTenant } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await paymentAPI.getHistory();
        setPayments(res.data.payments || []);
      } catch (err) {
        console.error("Payments load error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const totalEth = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isLandlord ? "Rent Collections" : "My Payment Receipts"}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {isLandlord
              ? "All rent payments received from your tenants, verified by Oracle and permanently stored on the blockchain."
              : "All monthly rent payments you have submitted, verified by Oracle and permanently recorded on the blockchain."}
          </p>
        </div>

        <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Volume
            </span>
            <span className="text-lg font-black text-indigo-700">
              {formatINR(totalEth)}
            </span>
          </div>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Verified Payment Records</h2>
          <p className="text-xs text-slate-400">Official digital receipts with blockchain confirmation proof</p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading records...</div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-bold text-sm">No payment records found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isTenant
                ? "Once you pay monthly rent, the Oracle verifies the confirmation and stores your permanent receipt here."
                : "Once tenants pay rent, the Oracle records each payment and lists it here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Receipt #</th>
                  <th className="py-3.5 px-4">Agreement</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Blockchain Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {p.paymentReference}
                    </td>
                    <td className="py-4 px-4">
                      <Link
                        to={`/agreements/${p.agreementId}`}
                        className="font-bold text-indigo-600 hover:underline"
                      >
                        Lease #{p.agreementId}
                      </Link>
                    </td>
                    <td className="py-4 px-4 font-black text-indigo-700 text-sm">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Oracle Verified
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString()} at{" "}
                      {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-4 px-4">
                      <TxHashLink hash={p.blockchainTxHash} label="Receipt Tx" />
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

export default PaymentsPage;
