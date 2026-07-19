export interface StaffMember {
  uid: string;
  name: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  role: "staff" | "admin" | "owner";
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  uid: string;
  name: string;
  email: string;
  approveUrl: string;
  rejectUrl: string;
  sentTo: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface Agency {
  id: string;
  name: string;
  nameArabic?: string;
  country: string;
  contactPerson: string;
  phone: string;
  email: string;
  logoUrl?: string;
}

export interface Country {
  id: string; // e.g. "saudi-arabia", "kuwait", "uae"
  name: string; // e.g. "Saudi Arabia", "Kuwait", "UAE"
  currency: string; // e.g. "SAR", "KWD", "AED"
  partnerAgencyId: string; // Reference to agencyId
}

export interface Candidate {
  id: string;
  refNo: string;
  name: string;
  position: string; // "HOUSEMAID" by default
  nationality: string;
  religion: string;
  dob: string;
  birthPlace: string;
  age: number;
  maritalStatus: string;
  numChildren: number;
  weightKg: number;
  heightCm: number;
  education: string;
  phone: string;
  passportNo: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  languages: {
    amharic: "Excellent" | "Good" | "None";
    arabic: "Excellent" | "Good" | "None";
    english: "Excellent" | "Good" | "None";
  };
  workExperience: {
    position: string;
    years: string;
    previousCountry: string;
  } | {
    position: string;
    years: string;
    previousCountry: string;
  }[];
  skills: {
    cleaning: boolean;
    babySitting: boolean;
    laundry: boolean;
    housekeeping: boolean;
    ironing: boolean;
    childCare: boolean;
  };
  countryId: string; // ref to Country.id
  salary: number;
  contractPeriod: string; // e.g., "2 Years"
  photoUrl: string;
  fullBodyPhotoUrl?: string;
  passportScanUrl: string;
  cocCertUrl?: string;
  videoUrl?: string;
  status: "available" | "placed" | "withdrawn";
  reviewEn?: string;
  reviewAr?: string;
  createdBy: string; // staff uid
  createdAt: string;
  updatedAt: string;
}

export interface WhatsappSend {
  id: string;
  candidateId: string;
  candidateName: string;
  groupId: string;
  groupName: string;
  sentBy: string;
  sentAt: string;
  status: "success" | "failed";
}

