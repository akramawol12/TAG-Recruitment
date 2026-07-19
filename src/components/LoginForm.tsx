import React, { useState } from "react";
import { motion } from "motion/react";
import { LogIn, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { apiAuthLogin } from "../lib/api";

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onLoginSuccess: (uid: string, user: any, staff: any) => void;
}

export default function LoginForm({ onSwitchToSignup, onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await apiAuthLogin(email, password);
      onLoginSuccess(res.user.uid, res.user, res.staff);
    } catch (err: any) {
      console.error("Login error via proxy:", err);
      setError(err.message || "Invalid email address or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8"
      id="login-container"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mb-3">
          <LogIn className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
          <h2 className="text-2xl font-bold text-slate-800">Staff Login</h2>
        </div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Recruitment Management System</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 bg-rose-50 text-rose-600 p-3.5 rounded-xl text-sm border border-rose-100" id="login-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              type="email"
              required
              placeholder="staff@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 cursor-pointer"
          id="btn-login-submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log In"
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-600">
          Don't have an account?{" "}
          <button
            onClick={onSwitchToSignup}
            className="text-indigo-600 hover:underline font-bold focus:outline-none cursor-pointer"
            id="btn-switch-to-signup"
          >
            Sign Up
          </button>
        </p>
      </div>
    </motion.div>
  );
}
