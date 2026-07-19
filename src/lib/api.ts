import { Candidate, StaffMember, Country, Agency } from "../types";

function getAuthHeaders(): Record<string, string> {
  const cachedUser = localStorage.getItem("tag_recruitment_user");
  if (cachedUser) {
    try {
      const u = JSON.parse(cachedUser);
      if (u && u.uid) {
        return {
          "x-user-uid": u.uid,
          "x-user-email": u.email || ""
        };
      }
    } catch (e) {
      console.error("Error parsing cached user for headers:", e);
    }
  }
  return {};
}

async function request(url: string, options: RequestInit = {}): Promise<any> {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = "Request failed";
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

// === AUTHENTICATION SERVICES ===

export async function apiAuthLogin(email: string, password: string) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function apiAuthSignup(email: string, password: string, name: string) {
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name })
  });
}

export async function apiAuthMe() {
  return request("/api/auth/me", {
    method: "GET"
  });
}

// === DATABASE SERVICES ===

export async function apiDbGetCountries(): Promise<Country[]> {
  return request("/api/db/countries");
}

export async function apiDbSaveCountry(country: Country): Promise<{ success: boolean }> {
  return request("/api/db/countries", {
    method: "POST",
    body: JSON.stringify(country)
  });
}

export async function apiDbGetAgencies(): Promise<Agency[]> {
  return request("/api/db/agencies");
}

export async function apiDbSaveAgency(agency: Agency): Promise<{ success: boolean }> {
  return request("/api/db/agencies", {
    method: "POST",
    body: JSON.stringify(agency)
  });
}

export async function apiDbGetCandidates(): Promise<Candidate[]> {
  return request("/api/db/candidates");
}

export async function apiDbSaveCandidate(candidate: Candidate): Promise<{ success: boolean }> {
  return request("/api/db/candidates", {
    method: "POST",
    body: JSON.stringify(candidate)
  });
}

export async function apiDbDeleteCandidate(id: string): Promise<{ success: boolean }> {
  return request(`/api/db/candidates/${id}`, {
    method: "DELETE"
  });
}

export async function apiDbLogWhatsAppSend(sendRecord: any): Promise<{ success: boolean }> {
  return request("/api/db/whatsapp-sends", {
    method: "POST",
    body: JSON.stringify(sendRecord)
  });
}

export async function apiDbGetStaff(): Promise<StaffMember[]> {
  return request("/api/db/staff");
}

export async function apiDbApproveStaff(uid: string): Promise<{ success: boolean }> {
  return request("/api/db/staff/approve", {
    method: "POST",
    body: JSON.stringify({ uid })
  });
}

export async function apiDbRejectStaff(uid: string): Promise<{ success: boolean }> {
  return request("/api/db/staff/reject", {
    method: "POST",
    body: JSON.stringify({ uid })
  });
}
