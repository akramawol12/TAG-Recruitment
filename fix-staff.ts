import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import config from "./firebase-applet-config.json" with { type: "json" };

async function run() {
  console.log("Initializing firebase-admin...");
  initializeApp({
    projectId: config.projectId,
  });

  // Access the specific firestore database
  const db = getFirestore(config.firestoreDatabaseId);
  const targetUid = "huv4ZvbCUoW1qoSgrgeWU68UbWe2";
  const docRef = db.collection("staff").doc(targetUid);

  console.log(`Checking staff document for UID: ${targetUid}...`);
  const snap = await docRef.get();

  if (snap.exists) {
    console.log("Current document data:", snap.data());
    console.log("Updating document to approved owner status...");
    await docRef.update({
      status: "approved",
      role: "owner",
      sysCode: "TAG_RECRUITMENT_SECURE_BYPASS",
      updatedAt: new Date().toISOString()
    });
  } else {
    console.log("Document does not exist. Creating a new approved owner document...");
    await docRef.set({
      name: "TAG Recruitment Agency Owner",
      email: "tagrecruitmentagency.et@gmail.com",
      status: "approved",
      role: "owner",
      sysCode: "TAG_RECRUITMENT_SECURE_BYPASS",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  console.log("Fetch updated document to verify:");
  const updatedSnap = await docRef.get();
  console.log("Updated data:", updatedSnap.data());
}

run().catch((err) => {
  console.error("Error executing fix-staff script:", err);
  process.exit(1);
});
