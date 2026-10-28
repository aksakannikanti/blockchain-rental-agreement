import React, { useState, useEffect } from "react";
import {
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Copy,
  Check,
  Cpu,
  FileCode,
} from "lucide-react";

export const TxInspectorModal = ({ hash, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && hash) {
      fetchTxDetails();
    } else {
      setData(null);
      setError("");
    }
  }, [isOpen, hash]);

  const fetchTxDetails = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/blockchain/tx/${hash}`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed to load transaction data");
      }
      setData(json.transaction);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyHash = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                On-Chain Blockchain Transaction Inspector
              </h3>
              <p className="text-xs text-slate-500">
                Queried live from local Hardhat blockchain RPC
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

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-mono">
              Fetching transaction receipt from node...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* Status & Block banner */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Status: {data.status}
              </span>
              <span className="font-mono text-slate-600">
                Block Number: <strong className="text-slate-900">#{data.blockNumber}</strong>
              </span>
            </div>

            {/* Hash Display */}
            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[10px]">
                <span>TRANSACTION HASH</span>
                <button
                  onClick={copyHash}
                  className="hover:text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="break-all select-all text-emerald-400 text-[11px]">{data.hash}</p>
            </div>

            {/* Key fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">From</span>
                <p className="font-mono text-[11px] text-slate-800 break-all select-all">{data.from}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">To (Contract)</span>
                <p className="font-mono text-[11px] text-slate-800 break-all select-all">{data.to}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Gas Used</span>
                <p className="font-mono text-slate-800 font-bold">{data.gasUsed}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Value</span>
                <p className="font-mono text-slate-800 font-bold">{data.valueWei} Wei</p>
              </div>
            </div>

            {/* Decoded Events */}
            {data.events && data.events.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-indigo-600" />
                  Decoded Smart Contract Event Logs:
                </span>
                {data.events.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl font-mono text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-800">Event: {evt.name}</span>
                      <span className="text-[10px] text-indigo-500">{evt.signature}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-indigo-100">
                      {Object.entries(evt.args).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-indigo-600 font-semibold">{k}:</span>
                          <span className="break-all text-slate-800">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default TxInspectorModal;
