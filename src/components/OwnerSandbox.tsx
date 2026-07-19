import React, { useEffect, useState } from "react";
import { AdminNotification } from "../types";
import { Mail, RefreshCw, Check, X, ShieldAlert, Trash2 } from "lucide-react";

export default function OwnerSandbox() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin-notifications");
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setNotifications(data);
        } else {
          console.warn("Expected JSON response for admin notifications, but received non-JSON content.");
        }
      }
    } catch (err) {
      console.warn("Could not fetch admin notifications (server might be starting up):", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearInbox = async () => {
    if (!window.confirm("Are you sure you want to clear all simulated notification logs?")) return;
    try {
      const res = await fetch("/api/admin-notifications/clear", { method: "POST" });
      if (res.ok) {
        setNotifications([]);
        setActionMessage("Simulated inbox cleared successfully!");
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.warn("Error clearing inbox:", err);
    }
  };

  const handleAction = async (url: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(url);
      if (res.ok) {
        setActionMessage("Action processed successfully!");
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        const text = await res.text();
        setActionMessage(`Error: ${text}`);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Action processing error:", err);
      setActionMessage(`Network error: ${err.message || err}`);
      setTimeout(() => setActionMessage(null), 4000);
    } finally {
      await fetchNotifications();
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 5 seconds to automatically show new registrations
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-5xl mt-12 bg-slate-900 text-slate-100 rounded-2xl shadow-xl border border-slate-800 overflow-hidden" id="owner-sandbox">
      <div className="bg-slate-950 p-6 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-950/50 py-1 px-2.5 rounded-md border border-indigo-900/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            Developer Sandbox
          </div>
          <h2 className="text-lg font-bold text-slate-100 mt-2">Simulated Agency Owner Inbox</h2>
          <p className="text-xs text-slate-400 mt-0.5">Simulates receiving approval request emails inside the environment.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={fetchNotifications}
            disabled={isLoading}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-lg transition-colors border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleClearInbox}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-rose-950 hover:bg-rose-900 text-rose-200 font-semibold text-xs rounded-lg transition-colors border border-rose-900/40 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear logs
          </button>
        </div>
      </div>

      <div className="p-6">
        {actionMessage && (
          <div className="mb-4 bg-emerald-950/80 border border-emerald-800/40 text-emerald-300 py-2.5 px-4 rounded-xl text-xs">
            {actionMessage}
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Mail className="w-12 h-12 mx-auto stroke-1 mb-3 text-slate-700" />
            <p className="text-sm font-medium">Your simulated inbox is empty.</p>
            <p className="text-xs mt-1">When a new user signs up, the pending registration email notification will appear here in real-time!</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-slate-950 rounded-xl border border-slate-800 p-5 transition-all hover:border-slate-700"
              >
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider mb-2">
                      New signup request
                    </span>
                    <h4 className="font-bold text-slate-200 text-sm">
                      Approval Needed: {notif.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Email: <code className="text-slate-300 font-mono">{notif.email}</code>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registered at: {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
                      notif.status === "pending"
                        ? "bg-amber-950/80 text-amber-400 border border-amber-900/50"
                        : notif.status === "approved"
                        ? "bg-emerald-950/80 text-emerald-400 border border-emerald-900/50"
                        : "bg-rose-950/80 text-rose-400 border border-rose-900/50"
                    }`}>
                      {notif.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {notif.status === "pending" && (
                  <div className="mt-4 pt-4 border-t border-slate-900 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAction(notif.approveUrl)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Staff
                    </button>
                    <button
                      onClick={() => handleAction(notif.rejectUrl)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject Staff
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
