import React, { useState } from "react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { motion } from "motion/react";
import { UserPlus, Mail, Lock, User, Loader2, AlertCircle, ShieldAlert } from "lucide-react";

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSignupSuccess: (uid: string) => void;
}

export default function SignupForm({ onSwitchToLogin, onSignupSuccess }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthHint, setShowAuthHint] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowAuthHint(false);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Create document in Firestore "staff" collection
      const staffDoc = {
        name: name.trim(),
        email: email.trim(),
        status: "pending",
        role: "staff",
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "staff", uid), staffDoc);
        
        // If owner email, immediately promote to approved owner via sysCode bypass
        const isOwnerEmail = email.trim().toLowerCase() === "tagrecruitmentagency.et@gmail.com";
        if (isOwnerEmail) {
          console.log("Immediately promoting newly signed-up owner account:", email);
          await setDoc(doc(db, "staff", uid), {
            ...staffDoc,
            status: "approved",
            role: "owner",
            sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
          });
        }
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.CREATE, `staff/${uid}`);
      }

      // 3. Callback to show pending status
      onSignupSuccess(uid);
    } catch (err: any) {
      console.error("Signup error:", err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password Authentication is not yet enabled in your Firebase console. Please use Google Sign-In below, or enable Email/Password provider in your Firebase project.");
        setShowAuthHint(true);
      } else if (err.code === "auth/email-already-in-use") {
        setError("This email address is already registered.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak.");
      } else {
        setError(err.message || "An unexpected error occurred during signup.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      onSignupSuccess(userCredential.user.uid);
    } catch (err: any) {
      console.error("Google sign-up error:", err);
      setError(err.message || "An error occurred during Google sign-up.");
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
      id="signup-container"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mb-3">
          <UserPlus className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-1.5 h-5 bg-indigo-600 rounded-full"></span>
          <h2 className="text-2xl font-bold text-slate-800">Create Staff Account</h2>
        </div>
        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Recruitment Management System</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 bg-rose-50 text-rose-600 p-3.5 rounded-xl text-sm border border-rose-100 animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {showAuthHint && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed flex items-start gap-3" id="signup-auth-hint">
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

      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <User className="w-5 h-5" />
            </span>
            <input
              type="text"
              required
              placeholder="e.g. Martha Kebede"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              type="email"
              required
              placeholder="martha@agency.com"
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
          id="btn-signup-submit"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating account...
            </>
          ) : (
            "Request Access"
          )}
        </button>
      </form>

      <div className="relative my-6 flex items-center justify-center">
        <div className="absolute inset-x-0 h-px bg-slate-100"></div>
        <span className="relative bg-white px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">Or</span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={isGoogleLoading || isLoading}
        className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        id="btn-google-signup"
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
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="text-indigo-600 hover:underline font-bold focus:outline-none cursor-pointer"
            id="btn-switch-to-login"
          >
            Log In
          </button>
        </p>
      </div>
    </motion.div>
  );
}
