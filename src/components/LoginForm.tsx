import React, { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../lib/firebase";
import { motion } from "motion/react";
import { LogIn, Mail, Lock, Loader2, AlertCircle, ShieldAlert } from "lucide-react";

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onLoginSuccess: (uid: string) => void;
}

export default function LoginForm({ onSwitchToSignup, onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthHint, setShowAuthHint] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowAuthHint(false);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLoginSuccess(userCredential.user.uid);
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password Authentication is not yet enabled in your Firebase console. Please use Google Sign-In below, or enable Email/Password provider in your Firebase project.");
        setShowAuthHint(true);
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("Invalid email address or password.");
      } else {
        setError(err.message || "An unexpected error occurred during login.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      onLoginSuccess(userCredential.user.uid);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "An error occurred during Google sign-in.");
    } finally {
      setIsGoogleLoading(false);
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
          <span>{error}</span>
        </div>
      )}

      {showAuthHint && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed flex items-start gap-3" id="login-auth-hint">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1 text-amber-900">Firebase Setup Required:</p>
            <p className="mb-2">
              Email/Password provider is not enabled in this Firebase project yet. To enable it:
            </p>
            <ol className="list-decimal list-inside space-y-1 font-semibold text-amber-900">
              <li>Open your Firebase Console</li>
              <li>Go to Build &rarr; Authentication &rarr; Sign-in method</li>
              <li>Click "Add new provider" and select "Email/Password"</li>
              <li>Toggle "Enable" and click "Save"</li>
            </ol>
            <p className="mt-2 text-amber-900">
              Or bypass this by clicking <strong>Continue with Google</strong> below!
            </p>
          </div>
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
          disabled={isLoading || isGoogleLoading}
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

      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-x-0 h-px bg-slate-100"></div>
        <span className="relative bg-white px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">Or</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
        className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        id="btn-google-login"
      >
        {isGoogleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        ) : (
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
        )}
        <span>Continue with Google</span>
      </button>

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
