import React, { useState } from "react";
import { motion } from "motion/react";
import { Clock, XCircle, LogOut, RefreshCw, CheckCircle } from "lucide-react";

interface StatusScreenProps {
  status: "pending" | "rejected";
  userName: string;
  onLogout: () => void;
  onRefreshStatus?: () => Promise<void>;
}

export default function StatusScreen({ status, userName, onLogout, onRefreshStatus }: StatusScreenProps) {
  const isPending = status === "pending";
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = async () => {
    if (!onRefreshStatus) return;
    setIsRefreshing(true);
    try {
      await onRefreshStatus();
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
    } catch (err) {
      console.error("Refresh status failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center"
      id="status-screen-container"
    >
      <div className="flex justify-center mb-6">
        {isPending ? (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 text-amber-600 rounded-full animate-pulse border border-amber-200">
            <Clock className="w-8 h-8" />
          </div>
        ) : (
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-50 text-rose-600 rounded-full border border-rose-200">
            <XCircle className="w-8 h-8" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
        <h1 className="text-2xl font-bold text-slate-800">
          Hello, {userName || "Staff Member"}
        </h1>
      </div>

      <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
        Account Status:{" "}
        <span className={isPending ? "text-amber-600" : "text-rose-600"}>
          {status.toUpperCase()}
        </span>
      </p>

      <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left border border-slate-200">
        {isPending ? (
          <div>
            <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-amber-500 rounded-full"></span>
              Approval Required
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account is waiting for approval from the agency owner. An approval request email has been simulated and sent to the owner.
            </p>
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg text-xs text-indigo-900 border border-indigo-100">
              💡 <b>Developer Sandbox Note:</b> You can scroll down to the <b>Owner Sandbox Control Panel</b> below to instantly approve your request for testing!
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-bold text-rose-800 mb-1 flex items-center gap-2">
              <span className="w-1 h-3 bg-rose-500 rounded-full"></span>
              Request Declined
            </h3>
            <p className="text-sm text-rose-700 leading-relaxed">
              Your account request was not approved by the agency owner. Please contact the administrator if you believe this is a mistake.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {onRefreshStatus && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-500/10 text-sm"
            id="btn-refresh-status"
          >
            {refreshSuccess ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            )}
            {refreshSuccess ? "Checked!" : isRefreshing ? "Checking..." : "Refresh/Check Status"}
          </button>
        )}

        <button
          onClick={onLogout}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all cursor-pointer shadow-sm text-sm"
          id="btn-logout"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          Log Out of Account
        </button>
      </div>
    </motion.div>
  );
}
