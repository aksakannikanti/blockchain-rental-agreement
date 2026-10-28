import React from "react";
import { Clock, CheckCircle2, XCircle, AlertTriangle, Ban } from "lucide-react";

export const StatusBadge = ({ status }) => {
  const getBadgeConfig = (statusStr) => {
    switch (statusStr?.toLowerCase()) {
      case "accepted":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
          label: "Accepted",
        };
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
          label: "Pending Review",
        };
      case "rejected":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
          label: "Rejected",
        };
      case "expired":
        return {
          bg: "bg-gray-100 text-gray-700 border-gray-200",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-gray-500" />,
          label: "Expired",
        };
      case "terminated":
        return {
          bg: "bg-red-50 text-red-700 border-red-200",
          icon: <Ban className="w-3.5 h-3.5 text-red-500" />,
          label: "Terminated",
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
          label: status || "Unknown",
        };
    }
  };

  const config = getBadgeConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
