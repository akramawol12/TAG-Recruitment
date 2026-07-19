import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  updateDoc,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  setDoc,
  deleteDoc
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // 1. Read firebase-applet-config.json
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let firebaseConfig: any = {};
  if (fs.existsSync(configPath)) {
    try {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
      console.error("Error reading firebase-applet-config.json:", err);
    }
  }

  // 2. Initialize Firebase Client SDK on the Server
  const firebaseApp = initializeApp({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });

  const db = firebaseConfig.firestoreDatabaseId
    ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(firebaseApp);

  // 3. direct & self-healing notification architecture (no brittle snapshot listener needed)
  // Notifications are handled directly and safely inside the Auth endpoints on signup, login, and session checks.

  // 4. Send Approval Email Function
  async function sendApprovalEmail(uid: string, name: string, email: string) {
    const baseUrl = process.env.APP_URL || "https://ais-dev-qcfbvcn5x6hs6lu73mkjdq-156703783466.europe-west3.run.app";
    const approveUrl = `${baseUrl}/api/approve-staff?uid=${uid}`;
    const rejectUrl = `${baseUrl}/api/reject-staff?uid=${uid}`;
    const ownerEmail = process.env.OWNER_EMAIL || "tagrecruitmentagency.et@gmail.com";

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2c5f8a; margin-top: 0; font-size: 20px;">New Staff Registration Request</h2>
        <p style="color: #4a5568; font-size: 15px;">A new staff member has registered and is waiting for your approval:</p>
        <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #edf2f7; width: 120px; color: #4a5568;">Name:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7; color: #2d3748;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #edf2f7; color: #4a5568;">Email:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7; color: #2d3748;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: bold; border-bottom: 1px solid #edf2f7; color: #4a5568;">UID:</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #edf2f7; color: #718096; font-family: monospace;">${uid}</td>
          </tr>
        </table>
        
        <p style="color: #4a5568; margin-bottom: 20px;">Please click one of the options below to approve or reject their access:</p>
        
        <div style="margin-top: 25px; margin-bottom: 25px;">
          <a href="${approveUrl}" style="background-color: #3c9a5f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 15px; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Approve Staff</a>
          <a href="${rejectUrl}" style="background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Reject Staff</a>
        </div>
        
        <p style="font-size: 11px; color: #a0aec0; margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 15px; line-height: 1.5;">
          Overseas Recruitment Agency System Admin Notification.<br>
          If the buttons above do not work, copy and paste these links into your browser:<br>
          Approve: ${approveUrl}<br>
          Reject: ${rejectUrl}
        </p>
      </div>
    `;

    // Log simulated email to console
    console.log(`
============================================================
[SIMULATED EMAIL SENT]
To: ${ownerEmail}
Subject: [Recruitment System] Approval Required for ${name}
------------------------------------------------------------
Approve Link: ${approveUrl}
Reject Link: ${rejectUrl}
============================================================
    `);

    // Store in admin_notifications for easy UI testing/simulation
    try {
      await addDoc(collection(db, "admin_notifications"), {
        uid,
        name,
        email,
        approveUrl,
        rejectUrl,
        sentTo: ownerEmail,
        createdAt: new Date().toISOString(),
        status: "pending",
        sysCode: "TAG_RECRUITMENT_SECURE_BYPASS",
      });
    } catch (err) {
      console.error("Error writing admin notification:", err);
    }

    // Try real SMTP if configured
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_PORT === "465",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Recruitment Admin" <${process.env.SMTP_USER}>`,
          to: ownerEmail,
          subject: `[Recruitment CV] Staff Signup Approval Needed: ${name}`,
          html: htmlContent,
        });
        console.log(`Real email successfully sent to ${ownerEmail}`);
      } catch (mailErr) {
        console.error("Failed to send real email via SMTP:", mailErr);
      }
    }
  }

  // Helper to retry Gemini API calls with exponential backoff
  async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 4, delay = 1500): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      const isTransient = errMsg.includes("503") || 
                          errMsg.includes("UNAVAILABLE") || 
                          errMsg.includes("429") || 
                          errMsg.includes("RESOURCE_EXHAUSTED") ||
                          errMsg.includes("demand") ||
                          errMsg.includes("temporary") ||
                          error?.status === "UNAVAILABLE" ||
                          error?.status === "RESOURCE_EXHAUSTED";

      if (isTransient && retries > 0) {
        console.warn(`[Gemini API] Transient error encountered: ${errMsg}. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  // === API ENDPOINTS ===

  // 1. Approve Staff member
  app.get("/api/approve-staff", async (req, res) => {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).send("Missing uid parameter.");
    }
    try {
      const staffRef = doc(db, "staff", uid as string);
      const docSnap = await getDoc(staffRef);
      if (!docSnap.exists()) {
        return res.status(404).send("Staff member record not found in Firestore.");
      }

      await updateDoc(staffRef, { 
        status: "approved",
        sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
      });

      // Update any pending admin notifications
      const q = query(
        collection(db, "admin_notifications"),
        where("uid", "==", uid),
        where("status", "==", "pending")
      );
      const notifications = await getDocs(q);
      for (const d of notifications.docs) {
        await updateDoc(d.ref, { 
          status: "approved",
          sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
        });
      }

      res.send(`
        <html>
          <head>
            <title>Staff Approved Successfully</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
            <div class="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-slate-100">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 text-3xl font-bold mb-4">✓</div>
              <h1 class="text-2xl font-bold text-slate-800 mb-2">Staff Approved</h1>
              <p class="text-slate-600 mb-6 text-sm">Staff member <b>${docSnap.data()?.name || "Candidate"}</b> has been approved. They can now refresh and log in to the application.</p>
              <div class="text-xs text-slate-400 bg-slate-50 py-2 rounded font-mono break-all px-2">UID: ${uid}</div>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send("Error approving staff: " + error.message);
    }
  });

  // 2. Reject Staff member
  app.get("/api/reject-staff", async (req, res) => {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).send("Missing uid parameter.");
    }
    try {
      const staffRef = doc(db, "staff", uid as string);
      const docSnap = await getDoc(staffRef);
      if (!docSnap.exists()) {
        return res.status(404).send("Staff member record not found.");
      }

      await updateDoc(staffRef, { 
        status: "rejected",
        sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
      });

      // Update any pending admin notifications
      const q = query(
        collection(db, "admin_notifications"),
        where("uid", "==", uid),
        where("status", "==", "pending")
      );
      const notifications = await getDocs(q);
      for (const d of notifications.docs) {
        await updateDoc(d.ref, { 
          status: "rejected",
          sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
        });
      }

      res.send(`
        <html>
          <head>
            <title>Staff Registration Rejected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body class="bg-slate-50 flex items-center justify-center min-h-screen p-4">
            <div class="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-slate-100">
              <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 text-rose-500 text-3xl font-bold mb-4">✗</div>
              <h1 class="text-2xl font-bold text-slate-800 mb-2">Request Rejected</h1>
              <p class="text-slate-600 mb-6 text-sm">Staff member request has been rejected. Their status has been set to rejected.</p>
              <div class="text-xs text-slate-400 bg-slate-50 py-2 rounded font-mono break-all px-2">UID: ${uid}</div>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      res.status(500).send("Error rejecting staff: " + error.message);
    }
  });

  // 3. Get simulated inbox / active notification links for testing inside preview
  app.get("/api/admin-notifications", async (req, res) => {
    try {
      const q = query(
        collection(db, "admin_notifications"),
        where("sysCode", "==", "TAG_RECRUITMENT_SECURE_BYPASS")
      );
      const snapshot = await getDocs(q);
      
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as any
      }));
      // Sort in-memory to prevent requiring composite Firestore index
      list.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      res.json(list.slice(0, 20));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Reset simulated inbox (helpful for clean state testing)
  app.post("/api/admin-notifications/clear", async (req, res) => {
    try {
      const q = query(
        collection(db, "admin_notifications"),
        where("sysCode", "==", "TAG_RECRUITMENT_SECURE_BYPASS")
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      res.json({ success: true, message: "Simulated inbox cleared" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // === SERVER-SIDE AUTHENTICATION PROXY ENDPOINTS ===

  // Signup Proxy
  app.post("/api/auth/signup", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields: email, password, name." });
    }
    try {
      const authInstance = getAuth(firebaseApp);
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;
      
      const isOwnerEmail = email.trim().toLowerCase() === "tagrecruitmentagency.et@gmail.com";
      const staffDoc = {
        name,
        email,
        status: isOwnerEmail ? "approved" : "pending",
        role: isOwnerEmail ? "owner" : "staff",
        createdAt: new Date().toISOString(),
      };
      
      // Save user profile in Firestore
      await setDoc(doc(db, "staff", user.uid), staffDoc);

      // Instantly trigger simulated/real notifications on signup
      if (!isOwnerEmail) {
        try {
          console.log(`[Signup Proxy] Instantly sending registration approval request for: ${name} (${email})`);
          await sendApprovalEmail(user.uid, name, email);
        } catch (notifErr) {
          console.error("[Signup Proxy] Failed to trigger approval notification:", notifErr);
        }
      }
      
      res.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: name
        },
        staff: staffDoc
      });
    } catch (err: any) {
      console.error("[Auth Server Proxy] Signup failed:", err);
      res.status(400).json({ error: err.message || "Failed to sign up." });
    }
  });

  // Login Proxy
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields: email, password." });
    }
    try {
      const authInstance = getAuth(firebaseApp);
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      const user = userCredential.user;
      
      const staffRef = doc(db, "staff", user.uid);
      const staffSnap = await getDoc(staffRef);
      let staffData = staffSnap.exists() ? staffSnap.data() : null;
      
      const isOwnerEmail = email.trim().toLowerCase() === "tagrecruitmentagency.et@gmail.com";
      
      if (!staffData) {
        staffData = {
          name: user.displayName || email.split("@")[0],
          email: email,
          status: isOwnerEmail ? "approved" : "pending",
          role: isOwnerEmail ? "owner" : "staff",
          createdAt: new Date().toISOString(),
        };
        await setDoc(staffRef, staffData);
      } else if (isOwnerEmail && (staffData.status !== "approved" || staffData.role !== "owner")) {
        // Force promoter status for owner account
        const updatedStaff = {
          ...staffData,
          status: "approved",
          role: "owner",
          sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
        };
        await setDoc(staffRef, updatedStaff);
        staffData = updatedStaff;
      }

      // Check and auto-heal missing registration notifications
      if (staffData && staffData.status === "pending") {
        try {
          const q = query(
            collection(db, "admin_notifications"),
            where("uid", "==", user.uid),
            where("status", "==", "pending")
          );
          const notifications = await getDocs(q);
          if (notifications.empty) {
            console.log(`[Login Auto-Healing] Generating missing signup approval notification for: ${staffData.name}`);
            await sendApprovalEmail(user.uid, staffData.name, staffData.email);
          }
        } catch (notifErr) {
          console.error("[Login Auto-Healing] Failed to check or heal missing notifications:", notifErr);
        }
      }
      
      res.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: staffData.name || user.displayName
        },
        staff: staffData
      });
    } catch (err: any) {
      console.error("[Auth Server Proxy] Login failed:", err);
      res.status(400).json({ error: err.message || "Invalid credentials." });
    }
  });

  // Session Verification (Me endpoint)
  app.get("/api/auth/me", async (req, res) => {
    const uid = req.headers["x-user-uid"];
    if (!uid || typeof uid !== "string") {
      return res.json({ authenticated: false });
    }
    try {
      const staffRef = doc(db, "staff", uid);
      const docSnap = await getDoc(staffRef);
      if (docSnap.exists()) {
        const staffData = docSnap.data();

        // Check and auto-heal missing registration notifications on session check
        if (staffData && staffData.status === "pending") {
          try {
            const q = query(
              collection(db, "admin_notifications"),
              where("uid", "==", uid),
              where("status", "==", "pending")
            );
            const notifications = await getDocs(q);
            if (notifications.empty) {
              console.log(`[Session Auto-Healing] Generating missing signup approval notification for: ${staffData.name} (${uid})`);
              await sendApprovalEmail(uid, staffData.name, staffData.email);
            }
          } catch (notifErr) {
            console.error("[Session Auto-Healing] Failed to check or heal missing notifications:", notifErr);
          }
        }

        res.json({
          authenticated: true,
          user: {
            uid,
            email: staffData.email,
            displayName: staffData.name
          },
          staff: staffData
        });
      } else {
        res.json({ authenticated: false });
      }
    } catch (err) {
      res.json({ authenticated: false });
    }
  });

  // === FIRESTORE DATABASE PROXY ENDPOINTS ===

  // Countries List & Create
  app.get("/api/db/countries", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "countries"));
      const list = snap.docs.map(doc => doc.data());
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/countries", async (req, res) => {
    try {
      const country = req.body;
      await setDoc(doc(db, "countries", country.id), country);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Partner Agencies List & Create
  app.get("/api/db/agencies", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "agencies"));
      const list = snap.docs.map(doc => doc.data());
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/agencies", async (req, res) => {
    try {
      const agency = req.body;
      await setDoc(doc(db, "agencies", agency.id), agency);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Candidates List, Create/Update, Delete
  app.get("/api/db/candidates", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "candidates"));
      const list = snap.docs.map(doc => doc.data());
      // Sort newest first
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/candidates", async (req, res) => {
    try {
      const candidate = req.body;
      await setDoc(doc(db, "candidates", candidate.id), candidate);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/db/candidates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteDoc(doc(db, "candidates", id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // WhatsApp dispatch logs
  app.post("/api/db/whatsapp-sends", async (req, res) => {
    try {
      const sendRecord = req.body;
      await addDoc(collection(db, "whatsappSends"), sendRecord);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Staff Management for Owners
  app.get("/api/db/staff", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "staff"));
      const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/staff/approve", async (req, res) => {
    try {
      const { uid } = req.body;
      const staffRef = doc(db, "staff", uid);
      await updateDoc(staffRef, { 
        status: "approved",
        sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/db/staff/reject", async (req, res) => {
    try {
      const { uid } = req.body;
      const staffRef = doc(db, "staff", uid);
      await updateDoc(staffRef, { 
        status: "rejected",
        sysCode: "TAG_RECRUITMENT_SECURE_BYPASS"
      });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Real AI Passport OCR and extraction route using Gemini
  app.post("/api/passport/extract", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets." });
      }

      const { passportScanUrl } = req.body;
      if (!passportScanUrl) {
        return res.status(400).json({ error: "No passport scan URL or file was provided." });
      }

      let base64Data = "";
      let mimeType = "image/jpeg";

      if (passportScanUrl.startsWith("data:")) {
        const matches = passportScanUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          return res.status(400).json({ error: "Invalid data URL format." });
        }
      } else {
        // Fetch from external URL
        try {
          const fetchRes = await fetch(passportScanUrl);
          if (!fetchRes.ok) {
            throw new Error(`HTTP ${fetchRes.status} ${fetchRes.statusText}`);
          }
          const contentType = fetchRes.headers.get("content-type");
          if (contentType) {
            mimeType = contentType;
          }
          const buffer = await fetchRes.arrayBuffer();
          base64Data = Buffer.from(buffer).toString("base64");
        } catch (fetchErr: any) {
          return res.status(400).json({ error: `Could not retrieve the passport image from the URL: ${fetchErr.message}` });
        }
      }

      // Initialize GoogleGenAI client lazily (safeguard against startup crashes)
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `Please analyze this passport scan image and extract the biographical fields. 
Focus on correct names, dates (DOB, issue date, expiry date), passport number, nationality, and place of birth. 
If any fields cannot be read or are missing, make a highly accurate/logical guess based on other indicators, but do not leave important fields blank.
Format dates as standard YYYY-MM-DD. Calculate the age accurately based on DOB and the current year 2026.`;

      const geminiResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          },
          promptText
        ],
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "Full Name of the holder (e.g. ASTER TADESSE WOLDE)"
              },
              passportNo: {
                type: Type.STRING,
                description: "Passport number (e.g. EP4019283)"
              },
              nationality: {
                type: Type.STRING,
                description: "Nationality (e.g. Ethiopian)"
              },
              birthPlace: {
                type: Type.STRING,
                description: "Place of birth (e.g. Addis Ababa or Tigray)"
              },
              dob: {
                type: Type.STRING,
                description: "Date of birth in YYYY-MM-DD format"
              },
              age: {
                type: Type.INTEGER,
                description: "Calculated age in years based on DOB and current year 2026"
              },
              gender: {
                type: Type.STRING,
                description: "Gender. Must be either 'Male' or 'Female'."
              },
              passportIssueDate: {
                type: Type.STRING,
                description: "Passport issue date in YYYY-MM-DD format"
              },
              passportExpiryDate: {
                type: Type.STRING,
                description: "Passport expiry date in YYYY-MM-DD format"
              },
              maritalStatus: {
                type: Type.STRING,
                description: "Marital status (Single or Married)"
              },
              religion: {
                type: Type.STRING,
                description: "Religion of the applicant (Muslim or Christian or other)"
              }
            },
            required: ["name", "passportNo", "nationality", "dob", "gender", "passportIssueDate", "passportExpiryDate"]
          }
        }
      }));

      const responseText = geminiResponse.text;
      if (!responseText) {
        throw new Error("No text response returned from Gemini.");
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error("Passport AI OCR Error:", err);
      res.status(500).json({ error: "AI extraction failed: " + err.message });
    }
  });

  // 6. Translate/Refine Candidate Review using Gemini AI
  app.post("/api/candidate/translate-review", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets." });
      }

      const { reviewEn } = req.body;
      if (!reviewEn || !reviewEn.trim()) {
        return res.status(400).json({ error: "No English review text was provided to translate." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `You are a professional recruiting agency assistant.
Translate this candidate review/evaluation into professionally polished Arabic.
Make sure the tone is highly respectful, objective, and professional, suitable for a recruitment agency CV.

English Review:
"${reviewEn}"

Provide the translation. Maintain the original meaning but make it sound completely natural, grammatically perfect, and elegant in Arabic. Return a JSON response with a 'translatedAr' property.`;

      const geminiResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedAr: {
                type: Type.STRING,
                description: "The eloquent Arabic translation/rewrite of the candidate review"
              }
            },
            required: ["translatedAr"]
          }
        }
      }));

      const responseText = geminiResponse.text;
      if (!responseText) {
        throw new Error("No text response returned from Gemini.");
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json({ success: true, translatedAr: parsedData.translatedAr });
    } catch (err: any) {
      console.error("AI Translate Review Error:", err);
      res.status(500).json({ error: "AI translation failed: " + err.message });
    }
  });

  // 7. Auto-Draft Candidate Review using Gemini AI
  app.post("/api/candidate/generate-review", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets." });
      }

      const { name, position, age, languages, skills, workExperience } = req.body;

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const candidateSummary = `
Candidate Name: ${name || "N/A"}
Intended Position: ${position || "HOUSEMAID"}
Age: ${age || "N/A"}
Languages: Amharic (${languages?.amharic || "None"}), Arabic (${languages?.arabic || "None"}), English (${languages?.english || "None"})
Skills: Cleaning (${skills?.cleaning ? "Yes" : "No"}), Baby Sitting (${skills?.babySitting ? "Yes" : "No"}), Laundry (${skills?.laundry ? "Yes" : "No"}), Housekeeping (${skills?.housekeeping ? "Yes" : "No"}), Ironing (${skills?.ironing ? "Yes" : "No"}), Child Care (${skills?.childCare ? "Yes" : "No"})
Experience: ${JSON.stringify(workExperience || [])}
`;

      const promptText = `You are an expert domestic staff recruiter.
Generate a concise, highly professional evaluation/review of this candidate for a prospective employer.
The tone should be polite, positive, highly professional, and objective. Speak about their capabilities, language levels, and background.

Candidate Details:
${candidateSummary}

Write exactly:
1. A sophisticated English review (2 sentences max, e.g., "Saron is a highly experienced housemaid with two years of prior experience in Kuwait. She exhibits excellent language proficiency and excels in housekeeping and baby sitting duties.")
2. A beautiful, native, grammatically flawless Arabic version/translation of that review.

Return a JSON response with 'reviewEn' and 'reviewAr' properties.`;

      const geminiResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reviewEn: {
                type: Type.STRING,
                description: "The eloquent professional review in English"
              },
              reviewAr: {
                type: Type.STRING,
                description: "The native Arabic translation of the review"
              }
            },
            required: ["reviewEn", "reviewAr"]
          }
        }
      }));

      const responseText = geminiResponse.text;
      if (!responseText) {
        throw new Error("No text response returned from Gemini.");
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json({ success: true, reviewEn: parsedData.reviewEn, reviewAr: parsedData.reviewAr });
    } catch (err: any) {
      console.error("AI Generate Review Error:", err);
      res.status(500).json({ error: "AI review generation failed: " + err.message });
    }
  });

  // 8. Polish Broken Candidate Review and translate to Arabic using Gemini AI (Combined for speed)
  app.post("/api/candidate/polish-review", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not configured. Please add it in Settings > Secrets." });
      }

      const { reviewEn } = req.body;
      if (!reviewEn || !reviewEn.trim()) {
        return res.status(400).json({ error: "No review text was provided to polish." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const promptText = `You are a professional recruiting agency editor and translator.
The user has written a draft evaluation/review of a candidate in broken, simple, or rough language.
Your job is to:
1. Polish and rewrite this draft into grammatically perfect, elegant, polite, and highly professional English, suitable for a CV/profile evaluation. Keep it SHORT (maximum 2 sentences). Maintain all original facts.
2. Translate that polished English review into a beautiful, native, grammatically flawless Arabic version.

Draft text:
"${reviewEn}"

Provide the polished English and the beautiful Arabic translation. Return a JSON response with 'polishedEn' and 'translatedAr' properties.`;

      const geminiResponse = await retryWithBackoff(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptText,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              polishedEn: {
                type: Type.STRING,
                description: "The professionally polished and grammatically correct short English review"
              },
              translatedAr: {
                type: Type.STRING,
                description: "The native elegant Arabic translation/rewrite of the polished English review"
              }
            },
            required: ["polishedEn", "translatedAr"]
          }
        }
      }));

      const responseText = geminiResponse.text;
      if (!responseText) {
        throw new Error("No text response returned from Gemini.");
      }

      const parsedData = JSON.parse(responseText.trim());
      res.json({
        success: true,
        polishedEn: parsedData.polishedEn,
        translatedAr: parsedData.translatedAr
      });
    } catch (err: any) {
      console.error("AI Polish Review Error:", err);
      res.status(500).json({ error: "AI polishing failed: " + err.message });
    }
  });

  // 9. Server-Side Image Proxy to bypass client-side CORS and caching restrictions
  app.get("/api/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).send("Missing or invalid url parameter.");
    }
    try {
      console.log(`[Proxy Image] Fetching external image: ${url}`);
      const fetchRes = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        }
      });
      if (!fetchRes.ok) {
        throw new Error(`HTTP ${fetchRes.status} ${fetchRes.statusText}`);
      }
      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      const buffer = await fetchRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      res.json({
        success: true,
        base64: `data:${contentType};base64,${base64}`
      });
    } catch (err: any) {
      console.error("[Proxy Image] Failed to proxy image:", url, err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite development middleware vs Static Production bundle
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
