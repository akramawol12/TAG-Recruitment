import React, { useEffect, useState } from "react";
import { StaffMember } from "./types";
import LoginForm from "./components/LoginForm";
import SignupForm from "./components/SignupForm";
import StatusScreen from "./components/StatusScreen";
import Dashboard from "./components/Dashboard";
import OwnerSandbox from "./components/OwnerSandbox";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ShieldCheck, HelpCircle, Cookie, ExternalLink, X, AlertTriangle } from "lucide-react";
import { apiAuthMe } from "./lib/api";

function getInitials(name: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [helpOpen, setHelpOpen] = useState(false);
  const [cookiesBlocked, setCookiesBlocked] = useState(false);
  const [showCookieNotice, setShowCookieNotice] = useState(true);

  // Check if cookies/storage are blocked (common in cross-origin iframes)
  useEffect(() => {
    try {
      const testKey = "__cookie_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      if (navigator.cookieEnabled === false) {
        setCookiesBlocked(true);
      }
    } catch (e) {
      setCookiesBlocked(true);
    }
  }, []);

  // 1. Session restoration on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const cachedUser = localStorage.getItem("tag_recruitment_user");
        const cachedStaff = localStorage.getItem("tag_recruitment_staff");
        
        if (cachedUser) {
          setCurrentUser(JSON.parse(cachedUser));
        }
        if (cachedStaff) {
          setStaffData(JSON.parse(cachedStaff));
        }
        
        // Always verify status on backend
        const res = await apiAuthMe();
        if (res && res.authenticated) {
          setCurrentUser(res.user);
          setStaffData(res.staff);
          localStorage.setItem("tag_recruitment_user", JSON.stringify(res.user));
          localStorage.setItem("tag_recruitment_staff", JSON.stringify(res.staff));
        } else {
          if (!cachedUser) {
            setCurrentUser(null);
            setStaffData(null);
          }
        }
      } catch (err) {
        console.error("Session restoration error:", err);
      } finally {
        setIsAuthLoading(false);
      }
    };
    
    restoreSession();
  }, []);

  // 2. Poll server for pending staff approval to automatically unlock the UI
  useEffect(() => {
    if (!currentUser || !staffData || staffData.status !== "pending") return;
    
    const checkStatus = async () => {
      try {
        const res = await apiAuthMe();
        if (res && res.authenticated && res.staff) {
          setStaffData(res.staff);
          localStorage.setItem("tag_recruitment_staff", JSON.stringify(res.staff));
        }
      } catch (err) {
        console.error("Error checking pending staff status:", err);
      }
    };
    
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [currentUser, staffData]);

  const handleAuthSuccess = (uid: string, user: any, staff: any) => {
    setCurrentUser(user);
    setStaffData(staff);
    localStorage.setItem("tag_recruitment_user", JSON.stringify(user));
    localStorage.setItem("tag_recruitment_staff", JSON.stringify(staff));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStaffData(null);
    localStorage.removeItem("tag_recruitment_user");
    localStorage.removeItem("tag_recruitment_staff");
  };

  const renderContent = () => {
    if (isAuthLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500 text-sm font-medium">Verifying credentials...</p>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <AnimatePresence mode="wait">
          {activeTab === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <LoginForm
                onSwitchToSignup={() => setActiveTab("signup")}
                onLoginSuccess={handleAuthSuccess}
              />
            </motion.div>
          ) : (
            <motion.div
              key="signup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <SignupForm
                onSwitchToLogin={() => setActiveTab("login")}
                onSignupSuccess={handleAuthSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      );
    }

    if (!staffData) {
      // Logged in but staff doc hasn't loaded or doesn't exist yet
      return (
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <h3 className="font-bold text-slate-800 mb-2">Creating Staff Session</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Please wait while we establish your security record.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm"
          >
            Cancel & Sign Out
          </button>
        </div>
      );
    }

    // Determine screen based on staff status
    if (staffData.status === "pending") {
      return (
        <StatusScreen
          status="pending"
          userName={staffData.name}
          onLogout={handleLogout}
        />
      );
    }

    if (staffData.status === "rejected") {
      return (
        <StatusScreen
          status="rejected"
          userName={staffData.name}
          onLogout={handleLogout}
        />
      );
    }

    // Status is "approved"
    return (
      <Dashboard
        userName={staffData.name}
        userEmail={staffData.email}
        userUid={currentUser.uid}
        onLogout={handleLogout}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-between p-4 sm:p-8 font-sans">
      {/* Decorative top bar */}
      <div className="w-full max-w-5xl flex justify-between items-center py-4 mb-6 border-b border-slate-200/50">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-slate-800 text-base tracking-tight leading-none">GlobeStaff</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Recruitment Management System</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {staffData && (
            <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-full pl-3 pr-1.5 py-1 shadow-sm hover:shadow transition-all duration-200">
              <span className="text-xs font-bold text-slate-700 hidden sm:inline ml-1">
                {staffData.name}
              </span>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full uppercase hidden md:inline">
                {staffData.role}
              </span>
              <div 
                className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-sm"
                title={`${staffData.name} (${staffData.email})`}
              >
                {getInitials(staffData.name)}
              </div>
            </div>
          )}

          {cookiesBlocked && (
            <button
              onClick={() => setShowCookieNotice(!showCookieNotice)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ${
                showCookieNotice
                  ? "bg-amber-100 border border-amber-300 text-amber-800"
                  : "bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 animate-pulse"
              }`}
              title="Third-Party Cookies Restricted - Click to troubleshoot"
            >
              <Cookie className="w-4 h-4" />
              <span className="hidden sm:inline">Cookie Help</span>
            </button>
          )}

          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Phase 1 Help Guide"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Third-Party Cookies Detection Alert Banner */}
      <AnimatePresence>
        {cookiesBlocked && showCookieNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm relative overflow-hidden"
            id="cookie-permission-banner"
          >
            <div className="flex items-start gap-4 pr-8">
              <div className="p-3 bg-amber-100/80 text-amber-800 rounded-xl flex-shrink-0">
                <Cookie className="w-6 h-6 animate-bounce" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                    Third-Party Cookies Restricted
                  </h3>
                  <span className="text-[10px] bg-amber-200/65 text-amber-950 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
                    Iframe Preview Environment Detected
                  </span>
                </div>
                <p className="text-amber-900/90 text-sm leading-relaxed mb-4">
                  Because this application is loaded within an iframe in Google AI Studio, your browser's cross-site cookie and third-party storage restrictions might block Firebase Authentication and database operations.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-100/30 p-4 rounded-xl border border-amber-200/40 mb-1">
                  <div>
                    <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span>💡</span> Solution A: Open in New Tab (Highly Recommended)
                    </h4>
                    <p className="text-xs text-amber-900/80 leading-relaxed mb-3">
                      Running the app in its own browser tab executes it as a first-party site, letting everything run perfectly with no cookie constraints or config!
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Application in New Tab
                    </a>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span>⚙️</span> Solution B: Grant Third-Party Cookie Permission
                    </h4>
                    <p className="text-xs text-amber-900/80 leading-relaxed">
                      Click the <strong>Eye Icon</strong> or <strong>Lock Icon</strong> on the right/left of your browser's address bar and toggle <strong>"Allow third-party cookies"</strong> or allow access for this site to authorize Firestore/Auth.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowCookieNotice(false)}
              className="absolute top-4 right-4 p-1.5 text-amber-700/60 hover:text-amber-950 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Dismiss cookie warning"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help info block */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full max-w-5xl bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-2xl p-5 mb-6 text-sm overflow-hidden shadow-inner"
          >
            <h3 className="font-bold flex items-center gap-2 mb-2 text-indigo-800">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Phase 1 Walkthrough & Verification Guide
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-indigo-950">
              <li>Click on the <b>Sign Up</b> link below to register a brand new staff member account.</li>
              <li>Once submitted, your user record is written to Firestore as <code>pending</code>.</li>
              <li>A backend listener automatically intercepts this change and generates a simulated approval email.</li>
              <li>Look at the <b>Owner Sandbox Panel</b> at the bottom of the page to find your request!</li>
              <li>Click <b>Approve</b> or <b>Reject</b> on that simulated email to test the real-time, server-side database updating!</li>
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 w-full flex items-center justify-center py-8">
        {renderContent()}
      </main>

      {/* Persistent Owner Sandbox Control Panel */}
      <footer className="w-full flex justify-center mt-12 border-t border-slate-200/40 pt-8">
        <OwnerSandbox />
      </footer>
    </div>
  );
}
