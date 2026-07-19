# Security Specification for Standardized CV Recruitment Platform

This document details the security constraints, relational data invariants, and the adversarial "Dirty Dozen" payloads mapped against the Firestore Security rules.

## 1. Relational Data Invariants

1. **Master Gate Enforcement (Staff Approval)**: No write operations on business collections (`candidates`, `whatsappSends`) are permitted unless the requester is an authenticated user who has an active, validated record in the `staff` collection where `status == "approved"`.
2. **Immutability of Audit Fields**: Once written, audit fields (`createdAt`, `createdBy`, `refNo`) in `candidates` and `whatsappSends` cannot be modified by any tier of staff.
3. **Temporal Integrity**: All timestamp fields (`createdAt`, `updatedAt`) must strictly match `request.time` (the server timestamp) upon creation and modification.
4. **Id Poisoning Prevention**: Document ID path variables must be alphanumeric and under 128 characters, matching the pattern `^[a-zA-Z0-9_\-]+$`.
5. **Privilege Escalation Block**: Users cannot self-promote their `role` or self-approve their `status` during registration or update. Only approved Owners can modify roles and approval statuses of other staff.

---

## 2. The "Dirty Dozen" Penetration Payloads

The following payloads represent malicious requests designed to break system invariants. All 12 scenarios must be mathematically blocked by the security rules, returning `PERMISSION_DENIED`.

### Payload 1: Self-Elevation Attack (Privilege Escalation)
* **Description**: A registering user attempts to create a staff record with `role: "owner"` and `status: "approved"` to bypass the owner's manual verification queue.
* **Target Path**: `/staff/malicious_uid_123`
* **JSON Payload**:
```json
{
  "name": "Malicious Attacker",
  "email": "attacker@gmail.com",
  "status": "approved",
  "role": "owner",
  "createdAt": "2026-07-15T12:00:00Z"
}
```

### Payload 2: Account Hijack (Impersonation Write)
* **Description**: User A attempts to overwrite the profile record belonging to User B.
* **Target Path**: `/staff/user_b_uid`
* **JSON Payload**:
```json
{
  "name": "User B",
  "email": "userb@gmail.com",
  "status": "pending",
  "role": "staff",
  "createdAt": "2026-07-15T12:00:00Z"
}
```

### Payload 3: Email Spoofing Attack
* **Description**: User registers a staff profile claiming the email of the principal owner, but the current authenticated token has a different email or `email_verified` is false.
* **Target Path**: `/staff/attacker_uid`
* **JSON Payload**:
```json
{
  "name": "Attacker Impersonating Owner",
  "email": "tagrecruitmentagency.et@gmail.com",
  "status": "pending",
  "role": "staff",
  "createdAt": "2026-07-15T12:00:00Z"
}
```

### Payload 4: Unapproved Staff Write
* **Description**: A user whose registration status is still "pending" (or "rejected") attempts to create a candidate CV record.
* **Target Path**: `/candidates/cand_999`
* **JSON Payload**:
```json
{
  "id": "cand_999",
  "refNo": "WRK-999999",
  "name": "John Doe",
  "position": "HOUSEMAID",
  "nationality": "Ethiopian",
  "religion": "Christian",
  "dob": "1999-01-01",
  "birthPlace": "Addis Ababa",
  "age": 27,
  "maritalStatus": "Single",
  "numChildren": 0,
  "weightKg": 60,
  "heightCm": 165,
  "education": "High School",
  "phone": "+251911223344",
  "passportNo": "EP0000001",
  "passportIssueDate": "2020-01-01",
  "passportExpiryDate": "2030-01-01",
  "languages": { "amharic": "Excellent", "arabic": "None", "english": "Good" },
  "workExperience": { "position": "HOUSEMAID", "years": "2 Years", "previousCountry": "Kuwait" },
  "skills": { "cleaning": true, "babySitting": true, "laundry": true, "housekeeping": true, "ironing": true, "childCare": true },
  "countryId": "saudi-arabia",
  "salary": 1000,
  "contractPeriod": "2 Years",
  "photoUrl": "https://example.com/photo.jpg",
  "passportScanUrl": "https://example.com/passport.jpg",
  "status": "available",
  "createdBy": "attacker_uid",
  "createdAt": "2026-07-15T12:00:00Z",
  "updatedAt": "2026-07-15T12:00:00Z"
}
```

### Payload 5: ID Poisoning Attack (Resource Bloating)
* **Description**: A user tries to write a candidate document with a malformed or excessively long document path identifier (ID Poisoning) to bloat indexes or cause Denial of Wallet.
* **Target Path**: `/candidates/MALFORMED_CANDIDATE_ID_THAT_EXCEEDS_MAX_CHARACTERS_OR_INJECTS_SPECIAL_CHARACTERS_$$$`
* **Payload**: Standard candidate object.

### Payload 6: Audit Trace Manipulation (Immortality Breach)
* **Description**: Standard staff member updates an existing candidate and changes the immutable fields `createdBy` or `refNo` or the original `createdAt`.
* **Target Path**: `/candidates/candidate_001`
* **Update Payload**:
```json
{
  "refNo": "MUTATED-REF-99999",
  "createdBy": "malicious_admin_uid",
  "name": "JANE DOE"
}
```

### Payload 7: Type Poisoning (Value Injection)
* **Description**: Standard staff member attempts to register a candidate but sets `age` to a malicious string `"ONE_MILLION_YEARS"` or `skills` to a giant raw string instead of a valid Map object.
* **Target Path**: `/candidates/cand_555`
* **JSON Payload**: Standard candidate payload but with `age` set to `"ONE_MILLION_YEARS"`.

### Payload 8: Direct Admin Notification Creation
* **Description**: An authenticated staff member tries to write a custom notification directly into `/admin_notifications` without using the secure server-side registration flow.
* **Target Path**: `/admin_notifications/fake_notif`
* **JSON Payload**:
```json
{
  "id": "fake_notif",
  "uid": "attacker_uid",
  "name": "Fake Notification",
  "email": "attacker@gmail.com",
  "status": "approved",
  "approveUrl": "http://malicious-server.com",
  "rejectUrl": "http://malicious-server.com",
  "createdAt": "2026-07-15T12:00:00Z"
}
```

### Payload 9: Audit Trail Spoofing (WhatsApp Dispatches)
* **Description**: A staff member logs a WhatsApp dispatch claiming they are the admin "Principal Owner" (`sentBy: "Principal Owner"`), while their authenticated profile is actually "Pending Staff".
* **Target Path**: `/whatsappSends/log_777`
* **JSON Payload**:
```json
{
  "candidateId": "cand_123",
  "candidateName": "Sara Bekele",
  "groupId": "group_xyz",
  "groupName": "RIYADH DEPLOYMENTS",
  "sentBy": "Principal Owner",
  "sentAt": "2026-07-15T12:00:00Z",
  "status": "success"
}
```

### Payload 10: Metadata Sabotage (Countries / Agencies Modification)
* **Description**: Standard staff member attempts to delete or update supported countries or agency records, altering critical partner contract information.
* **Target Path**: `/countries/saudi-arabia`
* **Update Payload**:
```json
{
  "partnerAgencyId": "malicious_agency_id_99"
}
```

### Payload 11: Temporal Sync Exploitation
* **Description**: A staff member tries to submit a candidate with a falsified backdated timestamp (`createdAt: "2010-01-01T00:00:00Z"`).
* **Target Path**: `/candidates/cand_333`
* **Payload**: Standard candidate object but with `createdAt` set to `"2010-01-01T00:00:00Z"`.

### Payload 12: Phantom Field Insertion (Shadow Update)
* **Description**: A standard staff member tries to append an unrequested `isPreApproved: true` field to the candidate's record.
* **Target Path**: `/candidates/cand_444`
* **Update Payload**:
```json
{
  "isPreApproved": true
}
```

---

## 3. The Test Runner Spec

The testing logic is built in our test runner framework (`firestore.rules.test.ts`) using the standard Firebase security rules unit test module. All "Dirty Dozen" payloads will return `PERMISSION_DENIED` to prevent visual state leaks, escalation, or wallet depletion.
