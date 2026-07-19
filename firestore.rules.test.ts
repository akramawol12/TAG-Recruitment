import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  setDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc
} from "firebase/firestore";
import * as fs from "fs";

async function runTests() {
  console.log("==================================================");
  console.log("   FIRESTORE SECURITY RULES TEST RUNNER           ");
  console.log("   Verifying the 'Dirty Dozen' Penetration Specs ");
  console.log("==================================================");

  let testEnv: RulesTestEnvironment;
  try {
    testEnv = await initializeTestEnvironment({
      projectId: "standardized-recruitment-test",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: "127.0.0.1",
        port: 8080,
      }
    });
  } catch (err) {
    console.error("Failed to initialize test environment. Is the emulator running?", err);
    process.exit(1);
  }

  // Clear previous data in emulator database
  await testEnv.clearFirestore();

  // === SEED DATABASE STATE (Security Rules Disabled) ===
  console.log("\n[1/3] Seeding initial database state...");
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

    // 1. Seed Partner Destination Country
    await setDoc(doc(adminDb, "countries/saudi-arabia"), {
      id: "saudi-arabia",
      name: "Saudi Arabia",
      currency: "SAR",
      partnerAgencyId: "agency_123"
    });

    // 2. Seed Partner Agency
    await setDoc(doc(adminDb, "agencies/agency_123"), {
      id: "agency_123",
      name: "Riyadh Recruitment Agency Ltd",
      country: "Saudi Arabia",
      contactPerson: "Ahmed Al-Mutairi",
      phone: "+966501234567",
      email: "partner@riyadhrecruit.com"
    });

    // 3. Seed Approved Owner
    await setDoc(doc(adminDb, "staff/owner_uid"), {
      name: "Principal Owner",
      email: "tagrecruitmentagency.et@gmail.com",
      status: "approved",
      role: "owner",
      createdAt: "2026-07-15T12:00:00Z"
    });

    // 4. Seed Approved Admin
    await setDoc(doc(adminDb, "staff/admin_uid"), {
      name: "Admin User",
      email: "admin@agency.com",
      status: "approved",
      role: "admin",
      createdAt: "2026-07-15T12:00:00Z"
    });

    // 5. Seed Approved Staff Member
    await setDoc(doc(adminDb, "staff/approved_staff_uid"), {
      name: "Approved Staff Member",
      email: "staff@agency.com",
      status: "approved",
      role: "staff",
      createdAt: "2026-07-15T12:00:00Z"
    });

    // 6. Seed Pending Staff Member
    await setDoc(doc(adminDb, "staff/pending_staff_uid"), {
      name: "Pending Staff Member",
      email: "pending@agency.com",
      status: "pending",
      role: "staff",
      createdAt: "2026-07-15T12:00:00Z"
    });

    // 7. Seed Existing Candidate Profile
    await setDoc(doc(adminDb, "candidates/candidate_001"), {
      id: "candidate_001",
      refNo: "WRK-000001",
      name: "Jane Doe",
      position: "HOUSEMAID",
      nationality: "Ethiopian",
      religion: "Christian",
      dob: "1999-01-01",
      birthPlace: "Addis Ababa",
      age: 27,
      maritalStatus: "Single",
      numChildren: 0,
      weightKg: 60,
      heightCm: 165,
      education: "High School",
      phone: "+251911223344",
      passportNo: "EP0000001",
      passportIssueDate: "2020-01-01",
      passportExpiryDate: "2030-01-01",
      languages: { amharic: "Excellent", arabic: "None", english: "Good" },
      workExperience: { position: "HOUSEMAID", years: "2 Years", previousCountry: "Kuwait" },
      skills: { cleaning: true, babySitting: true, laundry: true, housekeeping: true, ironing: true, childCare: true },
      countryId: "saudi-arabia",
      salary: 1000,
      contractPeriod: "2 Years",
      photoUrl: "https://example.com/photo.jpg",
      passportScanUrl: "https://example.com/passport.jpg",
      status: "available",
      createdBy: "approved_staff_uid",
      createdAt: "2026-07-15T12:00:00Z",
      updatedAt: "2026-07-15T12:00:00Z"
    });
  });

  console.log("✓ Database seeded successfully.");

  // === EXECUTING TESTS ===
  console.log("\n[2/3] Running penetration and validation tests...");

  let passedTests = 0;
  let failedTests = 0;

  async function test(name: string, assertion: Promise<any>, expectSuccess: boolean) {
    try {
      await assertion;
      if (expectSuccess) {
        console.log(`  ✓ [PASS] ${name}`);
        passedTests++;
      } else {
        console.error(`  ✗ [FAIL] ${name} (Expected block but it succeeded!)`);
        failedTests++;
      }
    } catch (err: any) {
      if (!expectSuccess && (err.code === "permission-denied" || err.message?.includes("PERMISSION_DENIED"))) {
        console.log(`  ✓ [PASS] ${name} (Successfully blocked with PERMISSION_DENIED)`);
        passedTests++;
      } else {
        console.error(`  ✗ [FAIL] ${name}`, err);
        failedTests++;
      }
    }
  }

  // Define standard valid candidate object helper
  const getValidCandidateObj = (id: string, ref: string) => ({
    id,
    refNo: ref,
    name: "Standard Candidate Name",
    position: "HOUSEMAID",
    nationality: "Ethiopian",
    religion: "Christian",
    dob: "1998-05-12",
    birthPlace: "Addis Ababa",
    age: 28,
    maritalStatus: "Single",
    numChildren: 1,
    weightKg: 58,
    heightCm: 162,
    education: "High School",
    phone: "+251912345678",
    passportNo: "EP1234567",
    passportIssueDate: "2021-02-02",
    passportExpiryDate: "2031-02-02",
    languages: { amharic: "Excellent", english: "Medium" },
    workExperience: { position: "HOUSEMAID", years: "3 Years", previousCountry: "Saudi Arabia" },
    skills: { cleaning: true, laundry: true, ironing: true },
    countryId: "saudi-arabia",
    salary: 1000,
    contractPeriod: "2 Years",
    photoUrl: "https://example.com/photo.png",
    passportScanUrl: "https://example.com/passport.png",
    status: "available",
    createdBy: "approved_staff_uid",
    createdAt: "2026-07-15T12:00:00Z",
    updatedAt: "2026-07-15T12:00:00Z"
  });

  // Define authenticated contexts
  const unauthedDb = testEnv.unauthenticatedContext().firestore();
  
  const attackerDb = testEnv.authenticatedContext("attacker_uid", {
    email: "attacker@gmail.com",
    email_verified: true
  }).firestore();

  const pendingStaffDb = testEnv.authenticatedContext("pending_staff_uid", {
    email: "pending@agency.com",
    email_verified: true
  }).firestore();

  const approvedStaffDb = testEnv.authenticatedContext("approved_staff_uid", {
    email: "staff@agency.com",
    email_verified: true
  }).firestore();

  const approvedOwnerDb = testEnv.authenticatedContext("owner_uid", {
    email: "tagrecruitmentagency.et@gmail.com",
    email_verified: true
  }).firestore();


  // --- PENETRATION TESTS (THE DIRTY DOZEN) ---

  // Payload 1: Self-Elevation Attack
  await test(
    "Payload 1: Self-Elevation Attack (Approved Owner signup by malicious user)",
    assertFails(setDoc(doc(attackerDb, "staff/attacker_uid"), {
      name: "Malicious Attacker",
      email: "attacker@gmail.com",
      status: "approved",
      role: "owner",
      createdAt: "2026-07-15T12:00:00Z"
    })),
    false
  );

  // Payload 2: Account Hijack
  await test(
    "Payload 2: Account Hijack (User A writes User B's profile)",
    assertFails(setDoc(doc(approvedStaffDb, "staff/admin_uid"), {
      name: "Admin User",
      email: "admin@agency.com",
      status: "pending",
      role: "staff",
      createdAt: "2026-07-15T12:00:00Z"
    })),
    false
  );

  // Payload 3: Email Spoofing Attack
  await test(
    "Payload 3: Email Spoofing Attack (Claiming owner's email but authenticated as attacker)",
    assertFails(setDoc(doc(attackerDb, "staff/attacker_uid"), {
      name: "Attacker Impersonating Owner",
      email: "tagrecruitmentagency.et@gmail.com",
      status: "pending",
      role: "staff",
      createdAt: "2026-07-15T12:00:00Z"
    })),
    false
  );

  // Payload 4: Unapproved Staff Write
  await test(
    "Payload 4: Unapproved Staff Write (Pending staff writes candidate profile)",
    assertFails(setDoc(doc(pendingStaffDb, "candidates/cand_999"), getValidCandidateObj("cand_999", "WRK-999999"))),
    false
  );

  // Payload 5: ID Poisoning Attack
  await test(
    "Payload 5: ID Poisoning Attack (Malformed candidate ID)",
    assertFails(setDoc(doc(approvedStaffDb, "candidates/MALFORMED_CANDIDATE_ID_THAT_EXCEEDS_MAX_CHARACTERS_OR_INJECTS_SPECIAL_CHARACTERS_$$$"), getValidCandidateObj("MALFORMED_CANDIDATE_ID_THAT_EXCEEDS_MAX_CHARACTERS_OR_INJECTS_SPECIAL_CHARACTERS_$$$", "WRK-500001"))),
    false
  );

  // Payload 6: Audit Trace Manipulation
  await test(
    "Payload 6: Audit Trace Manipulation (Modify immutable refNo/createdBy fields on candidate)",
    assertFails(updateDoc(doc(approvedStaffDb, "candidates/candidate_001"), {
      refNo: "MUTATED-REF-99999",
      createdBy: "malicious_admin_uid",
      name: "JANE DOE"
    })),
    false
  );

  // Payload 7: Type Poisoning
  await test(
    "Payload 7: Type Poisoning (Age passed as a string string instead of number)",
    assertFails(setDoc(doc(approvedStaffDb, "candidates/cand_555"), {
      ...getValidCandidateObj("cand_555", "WRK-555555"),
      age: "ONE_MILLION_YEARS"
    })),
    false
  );

  // Payload 8: Direct Admin Notification Creation
  await test(
    "Payload 8: Direct Admin Notification Creation (Staff bypass write to admin notifications)",
    assertFails(setDoc(doc(approvedStaffDb, "admin_notifications/fake_notif"), {
      id: "fake_notif",
      uid: "attacker_uid",
      name: "Fake Notification",
      email: "attacker@gmail.com",
      status: "approved",
      approveUrl: "http://malicious-server.com",
      rejectUrl: "http://malicious-server.com",
      createdAt: "2026-07-15T12:00:00Z"
    })),
    false
  );

  // Payload 9: Audit Trail Spoofing
  await test(
    "Payload 9: Audit Trail Spoofing (Pending staff logs WhatsApp dispatch)",
    assertFails(setDoc(doc(pendingStaffDb, "whatsappSends/log_777"), {
      candidateId: "candidate_001",
      candidateName: "Jane Doe",
      groupId: "group_xyz",
      groupName: "RIYADH DEPLOYMENTS",
      sentBy: "Principal Owner",
      sentAt: "2026-07-15T12:00:00Z",
      status: "success"
    })),
    false
  );

  // Payload 10: Metadata Sabotage
  await test(
    "Payload 10: Metadata Sabotage (Staff deletes destination country record)",
    assertFails(deleteDoc(doc(approvedStaffDb, "countries/saudi-arabia"))),
    false
  );

  // Payload 11: Temporal Sync Exploitation
  await test(
    "Payload 11: Temporal Sync Exploitation (Backdated createdAt year 2010)",
    assertFails(setDoc(doc(approvedStaffDb, "candidates/cand_333"), {
      ...getValidCandidateObj("cand_333", "WRK-333333"),
      createdAt: "2010-01-01T00:00:00Z"
    })),
    false
  );

  // Payload 12: Phantom Field Insertion
  await test(
    "Payload 12: Phantom Field Insertion (Add unrequested field isPreApproved: true on update)",
    assertFails(updateDoc(doc(approvedStaffDb, "candidates/candidate_001"), {
      isPreApproved: true
    })),
    false
  );


  // --- POSITIVE (VALID STATE) TESTING ---

  // Positive 1: Valid staff creation request (pending status)
  await test(
    "Positive 1: Valid new staff profile creation (Should succeed)",
    assertSucceeds(setDoc(doc(attackerDb, "staff/attacker_uid"), {
      name: "New Recruiter",
      email: "attacker@gmail.com",
      status: "pending",
      role: "staff",
      createdAt: "2026-07-15T12:00:00Z"
    })),
    true
  );

  // Positive 2: Valid candidate creation by approved staff
  await test(
    "Positive 2: Valid candidate profile write by approved staff (Should succeed)",
    assertSucceeds(setDoc(doc(approvedStaffDb, "candidates/cand_perfect"), getValidCandidateObj("cand_perfect", "WRK-100002"))),
    true
  );

  // Positive 3: Valid candidate status update by approved staff
  await test(
    "Positive 3: Valid fast-action candidate status transition (Should succeed)",
    assertSucceeds(updateDoc(doc(approvedStaffDb, "candidates/candidate_001"), {
      status: "placed",
      updatedAt: "2026-07-15T13:00:00Z"
    })),
    true
  );


  // === CLEANUP & SCOREBOARD ===
  console.log("\n[3/3] Shutting down testing contexts...");
  await testEnv.cleanup();

  console.log("\n==================================================");
  console.log(`   TEST RESULT SCOREBOARD                         `);
  console.log(`   Total Tests Run: ${passedTests + failedTests}`);
  console.log(`   Passed Tests:    ${passedTests}`);
  console.log(`   Failed Tests:    ${failedTests}`);
  console.log("==================================================");

  if (failedTests > 0) {
    console.error("❌ Test run failed: Some security constraints were breached or invalid operations failed!");
    process.exit(1);
  } else {
    console.log("💚 All security rules tests passed perfectly. The fortress remains impenetrable!");
    process.exit(0);
  }
}

runTests();
