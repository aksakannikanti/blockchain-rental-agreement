import React, { useState } from "react";
import { ExternalLink, Copy, Check, Search } from "lucide-react";
import { TxInspectorModal } from "./TxInspectorModal";

export const TxHashLink = ({ hash, truncate = true, label = "Tx" }) => {
  const [copied, setCopied] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  if (!hash) {
    return <span className="text-slate-400 text-xs italic">Pending Confirmation</span>;
  }

  const displayHash = truncate
    ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 6)}`
    : hash;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInspector = (e) => {
    e.stopPropagation();
    setIsInspectorOpen(true);
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-1 rounded transition-colors group">
        <span className="text-indigo-600 font-semibold">{label}:</span>
        <button
          type="button"
          onClick={handleOpenInspector}
          title="Click to inspect on-chain receipt and event logs"
          className="truncate select-all hover:text-indigo-700 hover:underline flex items-center gap-1 text-slate-800"
        >
          {displayHash}
          <Search className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />
        </button>
        <button
          onClick={handleCopy}
          type="button"
          title="Copy transaction hash"
          className="text-slate-400 hover:text-slate-700 focus:outline-none ml-0.5"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <TxInspectorModal
        hash={hash}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
      />
    </>
  );
};

export default TxHashLink;
