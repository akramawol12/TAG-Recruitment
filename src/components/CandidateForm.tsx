import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  X, Save, AlertCircle, FileText, Upload, Sparkles, User, 
  BookOpen, Globe, Heart, Shield, Check, RefreshCw, Download, Loader2, Plus, Trash2
} from "lucide-react";
import { Candidate, Country, Agency } from "../types";
import { apiDbSaveCandidate } from "../lib/api";
import { generateCandidatePdf } from "../lib/pdfGenerator";

interface CandidateFormProps {
  candidate?: Candidate | null;
  countries: Country[];
  agencies: Agency[];
  staffId: string;
  onClose: () => void;
  onSuccess: () => void;
  isInline?: boolean;
}

const DEMO_PASSPORTS = [
  {
    id: "demo1",
    label: "Demo Passport: Saron Bekele (Amhara, ET)",
    data: {
      name: "SARON BEKELE GEDA",
      passportNo: "EP5641289",
      nationality: "Ethiopian",
      birthPlace: "Addis Ababa",
      dob: "1998-05-12",
      age: 28,
      gender: "Female",
      passportIssueDate: "2024-06-15",
      passportExpiryDate: "2029-06-14",
      phone: "+251 911 234567",
      maritalStatus: "Single",
      numChildren: 0,
      weightKg: 58,
      heightCm: 162,
      education: "High School",
      religion: "Christian"
    }
  },
  {
    id: "demo2",
    label: "Demo Passport: Hana Yesuf (Oromia, ET)",
    data: {
      name: "HANA YESUF AMIN",
      passportNo: "EP9182347",
      nationality: "Ethiopian",
      birthPlace: "Adama",
      dob: "1995-11-23",
      age: 30,
      gender: "Female",
      passportIssueDate: "2023-08-10",
      passportExpiryDate: "2028-08-09",
      phone: "+251 922 890123",
      maritalStatus: "Married",
      numChildren: 2,
      weightKg: 62,
      heightCm: 165,
      education: "Elementary",
      religion: "Muslim"
    }
  },
  {
    id: "demo3",
    label: "Demo Passport: Aster Tadesse (Tigray, ET)",
    data: {
      name: "ASTER TADESSE WOLDE",
      passportNo: "EP4019283",
      nationality: "Ethiopian",
      birthPlace: "Mekelle",
      dob: "2000-02-05",
      age: 26,
      gender: "Female",
      passportIssueDate: "2025-01-20",
      passportExpiryDate: "2030-01-19",
      phone: "+251 944 765432",
      maritalStatus: "Single",
      numChildren: 1,
      weightKg: 54,
      heightCm: 159,
      education: "Junior High",
      religion: "Christian"
    }
  }
];

// Helper to generate custom work references
function generateRefNo(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return "WRK-" + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function CandidateForm({
  candidate,
  countries,
  agencies,
  staffId,
  onClose,
  onSuccess,
  isInline = false
}: CandidateFormProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "passport" | "skills" | "deployment" | "attachments">("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsingMRZ, setIsParsingMRZ] = useState(false);
  const [isExtractingAI, setIsExtractingAI] = useState(false);
  const [mrzSuccessMessage, setMrzSuccessMessage] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [position, setPosition] = useState("HOUSEMAID");
  const [nationality, setNationality] = useState("Ethiopian");
  const [religion, setReligion] = useState("Christian");
  const [dob, setDob] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [age, setAge] = useState<number>(25);
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [numChildren, setNumChildren] = useState<number>(0);
  const [weightKg, setWeightKg] = useState<number>(55);
  const [heightCm, setHeightCm] = useState<number>(160);
  const [education, setEducation] = useState("High School");
  const [phone, setPhone] = useState("");

  const [passportNo, setPassportNo] = useState("");
  const [passportIssueDate, setPassportIssueDate] = useState("");
  const [passportExpiryDate, setPassportExpiryDate] = useState("");

  const [langAmharic, setLangAmharic] = useState<"Excellent" | "Good" | "None">("Excellent");
  const [langArabic, setLangArabic] = useState<"Excellent" | "Good" | "None">("None");
  const [langEnglish, setLangEnglish] = useState<"Excellent" | "Good" | "None">("Good");

  const [expPosition, setExpPosition] = useState("");
  const [expYears, setExpYears] = useState("");
  const [expCountry, setExpCountry] = useState("");
  const [experiences, setExperiences] = useState<{ position: string; years: string; previousCountry: string }[]>([
    { position: "", years: "", previousCountry: "" }
  ]);

  const [skillCleaning, setSkillCleaning] = useState(true);
  const [skillBabySitting, setSkillBabySitting] = useState(false);
  const [skillLaundry, setSkillLaundry] = useState(true);
  const [skillHousekeeping, setSkillHousekeeping] = useState(true);
  const [skillIroning, setSkillIroning] = useState(true);
  const [skillChildCare, setSkillChildCare] = useState(false);

  const [countryId, setCountryId] = useState("saudi_arabia");
  const [salary, setSalary] = useState<number>(1000);
  const [contractPeriod, setContractPeriod] = useState("2 Years");

  const [photoUrl, setPhotoUrl] = useState("");
  const [fullBodyPhotoUrl, setFullBodyPhotoUrl] = useState("");
  const [passportScanUrl, setPassportScanUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<"available" | "placed" | "withdrawn">("available");

  // Optional candidate review state
  const [reviewEn, setReviewEn] = useState("");
  const [reviewAr, setReviewAr] = useState("");
  const [isTranslatingReview, setIsTranslatingReview] = useState(false);

  // Local file browser and compression states
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingFullBodyPhoto, setIsUploadingFullBodyPhoto] = useState(false);
  const [isUploadingPassport, setIsUploadingPassport] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const compressAndSetImage = async (
    file: File,
    setter: (val: string) => void,
    setLoading: (loading: boolean) => void,
    maxDimension: number = 800
  ) => {
    setLoading(true);
    setUploadError(null);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Compress via Canvas to keep document size light
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.70);
      setter(compressedBase64);
    } catch (err) {
      console.error("Failed to process local image:", err);
      setUploadError("Failed to read or compress image. Please try another file.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocalVideoUpload = async (file: File) => {
    setIsUploadingVideo(true);
    setUploadError(null);
    try {
      // Warn if video file is too large for Firestore limit (1MB)
      if (file.size > 1024 * 1024) {
        setUploadError("Local video file is too large! For PDF QR codes, we highly recommend pasting a URL link instead.");
        setIsUploadingVideo(false);
        return;
      }
      
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
      setVideoUrl(base64);
    } catch (err) {
      console.error("Failed to process local video:", err);
      setUploadError("Failed to read video file.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Load existing data if editing
  useEffect(() => {
    if (candidate) {
      setName(candidate.name || "");
      setPosition(candidate.position || "HOUSEMAID");
      setNationality(candidate.nationality || "Ethiopian");
      setReligion(candidate.religion || "Christian");
      setDob(candidate.dob || "");
      setBirthPlace(candidate.birthPlace || "");
      setAge(candidate.age || 25);
      setMaritalStatus(candidate.maritalStatus || "Single");
      setNumChildren(candidate.numChildren || 0);
      setWeightKg(candidate.weightKg || 55);
      setHeightCm(candidate.heightCm || 160);
      setEducation(candidate.education || "High School");
      setPhone(candidate.phone || "");

      setPassportNo(candidate.passportNo || "");
      setPassportIssueDate(candidate.passportIssueDate || "");
      setPassportExpiryDate(candidate.passportExpiryDate || "");

      if (candidate.languages) {
        setLangAmharic(candidate.languages.amharic || "Excellent");
        setLangArabic(candidate.languages.arabic || "None");
        setLangEnglish(candidate.languages.english || "Good");
      }

      if (candidate.workExperience) {
        if (Array.isArray(candidate.workExperience)) {
          setExperiences(
            candidate.workExperience.length > 0
              ? candidate.workExperience
              : [{ position: "", years: "", previousCountry: "" }]
          );
          if (candidate.workExperience.length > 0) {
            setExpPosition(candidate.workExperience[0].position || "");
            setExpYears(candidate.workExperience[0].years || "");
            setExpCountry(candidate.workExperience[0].previousCountry || "");
          }
        } else {
          const single = candidate.workExperience as any;
          setExperiences([{
            position: single.position || "",
            years: single.years || "",
            previousCountry: single.previousCountry || ""
          }]);
          setExpPosition(single.position || "");
          setExpYears(single.years || "");
          setExpCountry(single.previousCountry || "");
        }
      } else {
        setExperiences([{ position: "", years: "", previousCountry: "" }]);
      }

      if (candidate.skills) {
        setSkillCleaning(!!candidate.skills.cleaning);
        setSkillBabySitting(!!candidate.skills.babySitting);
        setSkillLaundry(!!candidate.skills.laundry);
        setSkillHousekeeping(!!candidate.skills.housekeeping);
        setSkillIroning(!!candidate.skills.ironing);
        setSkillChildCare(!!candidate.skills.childCare);
      }

      setCountryId(candidate.countryId || "");
      setSalary(candidate.salary || 1000);
      setContractPeriod(candidate.contractPeriod || "2 Years");

      setPhotoUrl(candidate.photoUrl || "");
      setFullBodyPhotoUrl(candidate.fullBodyPhotoUrl || candidate.photoUrl || "");
      setPassportScanUrl(candidate.passportScanUrl || "");
      setVideoUrl(candidate.videoUrl || "");
      setStatus(candidate.status || "available");
      setReviewEn(candidate.reviewEn || "");
      setReviewAr(candidate.reviewAr || "");
    } else {
      // Default country to Saudi Arabia if available, otherwise first available
      if (countries.length > 0) {
        const saudi = countries.find(c => c.id === "saudi_arabia" || c.name.toLowerCase().includes("saudi"));
        setCountryId(saudi ? saudi.id : countries[0].id);
      }
      
      // Reset all basic candidate bio details
      setName("");
      setPosition("HOUSEMAID");
      setNationality("Ethiopian");
      setReligion("Christian");
      setDob("");
      setBirthPlace("");
      setAge(25);
      setMaritalStatus("Single");
      setNumChildren(0);
      setWeightKg(55);
      setHeightCm(160);
      setEducation("High School");
      setPhone("");

      // Reset travel details
      setPassportNo("");
      setPassportIssueDate("");
      setPassportExpiryDate("");

      // Reset language scores
      setLangAmharic("Excellent");
      setLangArabic("None");
      setLangEnglish("Good");

      // Reset experiences list
      setExperiences([{ position: "", years: "", previousCountry: "" }]);
      setExpPosition("");
      setExpYears("");
      setExpCountry("");

      // Reset skills checks
      setSkillCleaning(true);
      setSkillBabySitting(false);
      setSkillLaundry(true);
      setSkillHousekeeping(true);
      setSkillIroning(true);
      setSkillChildCare(false);

      // Reset status
      setStatus("available");
      
      // Auto pre-fill with realistic default links to showcase beautiful layout initially
      setPhotoUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=400");
      setFullBodyPhotoUrl("https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500");
      setPassportScanUrl("https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=800&h=500");
      setVideoUrl("");
      setReviewEn("");
      setReviewAr("");
    }
  }, [candidate, countries]);

  // Handle Country Switching
  const handleCountryChange = (cId: string) => {
    setCountryId(cId);
    const selectedCountry = countries.find(c => c.id === cId);
    if (selectedCountry) {
      if (selectedCountry.currency === "SAR") setSalary(1000);
      else if (selectedCountry.currency === "KWD") setSalary(85);
      else if (selectedCountry.currency === "AED") setSalary(1000);
    }
  };

  // Run simulated passport MRZ parse
  const handleSimulateMRZ = (demoId: string) => {
    if (!demoId) return;
    setIsParsingMRZ(true);
    setMrzSuccessMessage(null);
    setError(null);

    const demo = DEMO_PASSPORTS.find(d => d.id === demoId);
    if (!demo) return;

    setTimeout(() => {
      setName(demo.data.name);
      setPassportNo(demo.data.passportNo);
      setNationality(demo.data.nationality);
      setBirthPlace(demo.data.birthPlace);
      setDob(demo.data.dob);
      setAge(demo.data.age);
      setPassportIssueDate(demo.data.passportIssueDate);
      setPassportExpiryDate(demo.data.passportExpiryDate);
      setPhone(demo.data.phone);
      setMaritalStatus(demo.data.maritalStatus);
      setNumChildren(demo.data.numChildren);
      setWeightKg(demo.data.weightKg);
      setHeightCm(demo.data.heightCm);
      setEducation(demo.data.education);
      setReligion(demo.data.religion);

      // Populate realistic passport scan
      setPassportScanUrl("https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=800&h=500");

      setIsParsingMRZ(false);
      setMrzSuccessMessage(`Successfully parsed MRZ from passport: ${demo.data.passportNo}! 12 fields auto-filled.`);
    }, 150);
  };

  const safeFetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const contentType = res.headers.get("content-type");
    if (!res.ok) {
      if (contentType && contentType.includes("application/json")) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      throw new Error(`HTTP error ${res.status}`);
    }
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Received non-JSON response from server (system might be restarting, please try again).");
    }
    return res.json();
  };

  // Run real passport extraction using server-side Gemini AI
  const handleRealAIExtract = async (imageUrlOrBase64: string) => {
    if (!imageUrlOrBase64) {
      setError("Please provide or upload a passport image scan first.");
      return;
    }
    setIsExtractingAI(true);
    setMrzSuccessMessage(null);
    setError(null);

    try {
      const result = await safeFetchJson("/api/passport/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passportScanUrl: imageUrlOrBase64 }),
      });

      if (result.success && result.data) {
        const d = result.data;
        if (d.name) setName(d.name);
        if (d.passportNo) setPassportNo(d.passportNo);
        if (d.nationality) setNationality(d.nationality);
        if (d.birthPlace) setBirthPlace(d.birthPlace);
        if (d.dob) setDob(d.dob);
        if (typeof d.age === "number") setAge(d.age);
        if (d.passportIssueDate) setPassportIssueDate(d.passportIssueDate);
        if (d.passportExpiryDate) setPassportExpiryDate(d.passportExpiryDate);
        
        // Auto guess/normalize from extra properties
        if (d.maritalStatus) {
          const statusLower = d.maritalStatus.toLowerCase();
          if (statusLower.includes("marr")) setMaritalStatus("Married");
          else if (statusLower.includes("divor")) setMaritalStatus("Divorced");
          else if (statusLower.includes("widow")) setMaritalStatus("Widowed");
          else setMaritalStatus("Single");
        }
        if (d.religion) {
          const relLower = d.religion.toLowerCase();
          if (relLower.includes("mus")) setReligion("Muslim");
          else if (relLower.includes("chr") || relLower.includes("orth") || relLower.includes("prot")) setReligion("Christian");
          else setReligion("Other");
        }

        // Set the active tab back to 'personal' so the user immediately sees all the filled details
        setActiveTab("personal");
        setMrzSuccessMessage(`Successfully extracted and verified details using Gemini AI! 12 fields populated automatically.`);
      } else {
        throw new Error("Invalid response format from AI extraction service.");
      }
    } catch (err: any) {
      console.error("AI extraction error:", err);
      setError(`AI Passport extraction failed: ${err.message}`);
    } finally {
      setIsExtractingAI(false);
    }
  };

  // Translate/polish English review to Arabic via backend Gemini AI
  const handleTranslateReview = async () => {
    if (!reviewEn.trim()) {
      setError("Please write an English review first to translate.");
      return;
    }
    setIsTranslatingReview(true);
    setError(null);
    try {
      const json = await safeFetchJson("/api/candidate/translate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewEn }),
      });
      if (json.success && json.translatedAr) {
        setReviewAr(json.translatedAr);
      } else {
        throw new Error(json.error || "Failed to translate review.");
      }
    } catch (err: any) {
      console.error("Translate review error:", err);
      setError(`AI translation failed: ${err.message}`);
    } finally {
      setIsTranslatingReview(false);
    }
  };

  // Polish English review via backend Gemini AI and auto-translate to Arabic (Streamlined to 1 fast API call)
  const [isPolishingReview, setIsPolishingReview] = useState(false);
  const handlePolishReview = async () => {
    if (!reviewEn.trim()) {
      setError("Please write some draft text in the English review first to polish.");
      return;
    }
    setIsPolishingReview(true);
    setError(null);
    try {
      const json = await safeFetchJson("/api/candidate/polish-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewEn }),
      });
      if (json.success && json.polishedEn && json.translatedAr) {
        setReviewEn(json.polishedEn);
        setReviewAr(json.translatedAr);
      } else {
        throw new Error(json.error || "Failed to polish review.");
      }
    } catch (err: any) {
      console.error("Polish review error:", err);
      setError(`AI polishing failed: ${err.message}`);
    } finally {
      setIsPolishingReview(false);
    }
  };

  // Auto-Draft professional English and Arabic review based on candidate state
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const handleGenerateReview = async () => {
    setIsGeneratingReview(true);
    setError(null);
    try {
      const json = await safeFetchJson("/api/candidate/generate-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          position,
          age,
          languages: {
            amharic: langAmharic,
            arabic: langArabic,
            english: langEnglish,
          },
          skills: {
            cleaning: skillCleaning,
            babySitting: skillBabySitting,
            laundry: skillLaundry,
            housekeeping: skillHousekeeping,
            ironing: skillIroning,
            childCare: skillChildCare,
          },
          workExperience: experiences.filter(exp => exp.position.trim() !== "" || exp.years.trim() !== "" || exp.previousCountry.trim() !== ""),
        }),
      });
      if (json.success && json.reviewEn && json.reviewAr) {
        setReviewEn(json.reviewEn);
        setReviewAr(json.reviewAr);
      } else {
        throw new Error(json.error || "Failed to generate review.");
      }
    } catch (err: any) {
      console.error("Generate review error:", err);
      setError(`AI review generation failed: ${err.message}`);
    } finally {
      setIsGeneratingReview(false);
    }
  };

  // Submit Candidate
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Candidate Full Name is required");
      setActiveTab("personal");
      return;
    }
    if (!passportNo.trim()) {
      setError("Passport Number is required");
      setActiveTab("passport");
      return;
    }
    if (!photoUrl.trim()) {
      setError("Candidate Passport-Sized Headshot / Photo URL is required");
      setActiveTab("attachments");
      return;
    }
    if (!fullBodyPhotoUrl.trim()) {
      setError("Candidate Full-Body Photo URL is required");
      setActiveTab("attachments");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const isNew = !candidate;
      const cId = candidate ? candidate.id : `candidate_${Date.now()}`;
      const refNo = candidate ? candidate.refNo : generateRefNo();

      const savedCandidate: Candidate = {
        id: cId,
        refNo,
        name: name.trim().toUpperCase(),
        position,
        nationality,
        religion,
        dob,
        birthPlace,
        age: Number(age) || 25,
        maritalStatus,
        numChildren: Number(numChildren) || 0,
        weightKg: Number(weightKg) || 55,
        heightCm: Number(heightCm) || 160,
        education,
        phone,
        passportNo: passportNo.trim().toUpperCase(),
        passportIssueDate,
        passportExpiryDate,
        languages: {
          amharic: langAmharic,
          arabic: langArabic,
          english: langEnglish,
        },
        workExperience: experiences.filter(exp => exp.position.trim() !== "" || exp.years.trim() !== "" || exp.previousCountry.trim() !== ""),
        skills: {
          cleaning: skillCleaning,
          babySitting: skillBabySitting,
          laundry: skillLaundry,
          housekeeping: skillHousekeeping,
          ironing: skillIroning,
          childCare: skillChildCare,
        },
        countryId,
        salary: Number(salary) || 1000,
        contractPeriod,
        photoUrl,
        fullBodyPhotoUrl,
        passportScanUrl,
        videoUrl: videoUrl || "",
        status,
        reviewEn: reviewEn.trim() || "",
        reviewAr: reviewAr.trim() || "",
        createdBy: candidate ? candidate.createdBy : staffId,
        createdAt: candidate ? candidate.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await apiDbSaveCandidate(savedCandidate);
      onSuccess();
    } catch (err: any) {
      console.error("Save candidate error:", err);
      setError(err.message || "An error occurred while saving the candidate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to PDF directly from the CV Builder Form state
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setError(null);
    try {
      const activeCountry = countries.find(c => c.id === countryId) || null;
      const activeAgency = activeCountry ? agencies.find(a => a.id === activeCountry.partnerAgencyId) || null : null;
      const ourAgency = {
        name: "TAG RECRUITMENT OVERSEAS AGENCY",
        address: "Bole Road, Mega Building 5th Floor, Addis Ababa, Ethiopia",
        phone: "+251 116 673245"
      };

      const refNo = candidate ? candidate.refNo : "DRAFT";

      const tempCandidate: Candidate = {
        id: candidate?.id || "temp-id",
        refNo,
        name: name.trim().toUpperCase() || "CANDIDATE DRAFT",
        position,
        nationality,
        religion,
        dob,
        birthPlace,
        age: Number(age) || 25,
        maritalStatus,
        numChildren: Number(numChildren) || 0,
        weightKg: Number(weightKg) || 55,
        heightCm: Number(heightCm) || 160,
        education,
        phone,
        passportNo: passportNo.trim().toUpperCase() || "PASSPORT DRAFT",
        passportIssueDate,
        passportExpiryDate,
        languages: {
          amharic: langAmharic,
          arabic: langArabic,
          english: langEnglish,
        },
        workExperience: experiences.filter(exp => exp.position.trim() !== "" || exp.years.trim() !== "" || exp.previousCountry.trim() !== ""),
        skills: {
          cleaning: skillCleaning,
          babySitting: skillBabySitting,
          laundry: skillLaundry,
          housekeeping: skillHousekeeping,
          ironing: skillIroning,
          childCare: skillChildCare,
        },
        countryId,
        salary: Number(salary) || 1000,
        contractPeriod,
        photoUrl,
        fullBodyPhotoUrl,
        passportScanUrl,
        videoUrl: videoUrl || "",
        status,
        reviewEn: reviewEn.trim() || "",
        reviewAr: reviewAr.trim() || "",
        createdBy: candidate ? candidate.createdBy : staffId,
        createdAt: candidate ? candidate.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docObj = await generateCandidatePdf({
        candidate: tempCandidate,
        country: activeCountry,
        agency: activeAgency,
        ourAgency
      });

      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      const fileName = `CV_${tempCandidate.name.replace(/\s+/g, "_")}_${refNo}_${timestamp}.pdf`;
      docObj.save(fileName);
    } catch (err: any) {
      console.error("PDF Export error:", err);
      setError(err.message || "Failed to generate and export PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const selectedCountry = countries.find(c => c.id === countryId);

  const renderFormBody = () => (
    <div className={`bg-white rounded-3xl border border-slate-200/80 shadow-md w-full flex flex-col overflow-hidden ${isInline ? "h-[740px]" : "max-w-4xl max-h-[90vh]"}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex justify-between items-center flex-shrink-0">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase bg-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-full">
            {candidate ? "Modify CV Record" : "Standardized CV Intake Form"}
          </span>
          <h2 className="text-xl font-bold mt-1">
            {candidate ? `Edit Candidate: ${candidate.refNo}` : "Standardize New Domestic Candidate"}
          </h2>
        </div>
        {!isInline && (
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Passport Scanning Section */}
      <div className="bg-indigo-50 border-b border-indigo-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Gemini AI Passport Extractor (OCR)</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Browse local passport scan or use url to instantly extract & auto-fill biographical fields</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Real Upload & Extract Button */}
          <label className="text-xs font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs">
            {isUploadingPassport ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Reading file...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                Upload & Auto-Fill with AI
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              disabled={isUploadingPassport || isExtractingAI}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Compress and immediately trigger AI extraction
                  setIsUploadingPassport(true);
                  try {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      reader.onload = (ev) => resolve(ev.target?.result as string);
                      reader.onerror = (err) => reject(err);
                      reader.readAsDataURL(file);
                    });

                    // Compress via canvas
                    const img = new Image();
                    img.src = dataUrl;
                    await new Promise((resolve) => { img.onload = resolve; });

                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 600;
                    if (width > height) {
                      if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                      }
                    } else {
                      if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                      }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);

                    const compressedBase64 = canvas.toDataURL("image/jpeg", 0.45);
                    setPassportScanUrl(compressedBase64);
                    setIsUploadingPassport(false);
                    
                    // Trigger Gemini Extraction directly
                    await handleRealAIExtract(compressedBase64);
                  } catch (err) {
                    console.error("Failed to read passport:", err);
                    setError("Failed to process local file.");
                    setIsUploadingPassport(false);
                  }
                }
              }}
            />
          </label>

          {/* If passportScanUrl is already present, let them trigger AI extraction on it directly */}
          {passportScanUrl && !isExtractingAI && (
            <button
              type="button"
              onClick={() => handleRealAIExtract(passportScanUrl)}
              className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Re-extract from Photo
            </button>
          )}

          {isExtractingAI && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-white border border-indigo-150 px-3 py-2 rounded-xl shadow-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Gemini AI Extracting...
            </div>
          )}

          <span className="text-slate-300">|</span>

          {/* Demo Dropdown */}
          <select 
            onChange={(e) => handleSimulateMRZ(e.target.value)}
            defaultValue=""
            disabled={isParsingMRZ || isExtractingAI}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="" disabled>-- Or Load Demo Passport --</option>
            {DEMO_PASSPORTS.map(dp => (
              <option key={dp.id} value={dp.id}>{dp.label}</option>
            ))}
          </select>

          {isParsingMRZ && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold bg-white border border-slate-150 px-3 py-2 rounded-xl shadow-xs animate-pulse">
              Simulating...
            </div>
          )}
        </div>
      </div>

      {/* Error or Success banners */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {mrzSuccessMessage && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-semibold">
          <Check className="w-4 h-4 flex-shrink-0 bg-emerald-500 text-white rounded-full p-0.5" />
          <span>{mrzSuccessMessage}</span>
        </div>
      )}

      {/* Tab Selection */}
      <div className="px-6 pt-4 border-b border-slate-100 flex gap-2 flex-shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: "personal", label: "Biographical Info", icon: User },
          { id: "passport", label: "Passport Details", icon: Shield },
          { id: "skills", label: "Skills & Languages", icon: BookOpen },
          { id: "deployment", label: "Agency & Terms", icon: Globe },
          { id: "attachments", label: "Media Attachments", icon: Upload },
          { id: "review", label: "AI Candidate Review (Optional)", icon: Sparkles }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-3.5 text-xs font-bold rounded-t-xl border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
                isSelected 
                  ? "bg-slate-50 text-indigo-600 border-slate-200 border-b-white relative z-10" 
                  : "bg-white text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/55 space-y-6">
        {/* Tab Content 1: Biographical Info */}
        {activeTab === "personal" && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Candidate Full Name (English)</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SARON BEKELE GEDA"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800 uppercase"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Intended Position</label>
              <select 
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700"
              >
                <option value="HOUSEMAID">HOUSEMAID</option>
                <option value="NANNY">NANNY</option>
                <option value="COOK">COOK</option>
                <option value="CLEANER">CLEANER</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nationality</label>
              <input 
                type="text" 
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Religion</label>
              <select 
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              >
                <option value="Christian">Christian</option>
                <option value="Muslim">Muslim</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date of Birth</label>
              <input 
                type="date" 
                value={dob}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (e.target.value) {
                    const yr = new Date(e.target.value).getFullYear();
                    setAge(new Date().getFullYear() - yr);
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Place of Birth</label>
              <input 
                type="text" 
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="e.g. Addis Ababa"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Age</label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Marital Status</label>
              <select 
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Widowed">Widowed</option>
                <option value="Divorced">Divorced</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Number of Children</label>
              <input 
                type="number" 
                value={numChildren}
                onChange={(e) => setNumChildren(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Weight (KG)</label>
              <input 
                type="number" 
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Height (CM)</label>
              <input 
                type="number" 
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Educational Level</label>
              <input 
                type="text" 
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. High School"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Local Contact No.</label>
              <input 
                type="text" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +251 911 234567"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>
          </motion.div>
        )}

        {/* Tab Content 2: Passport Details */}
        {activeTab === "passport" && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passport Number</label>
              <input 
                type="text" 
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                placeholder="e.g. EP1234567"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date of Issue</label>
              <input 
                type="date" 
                value={passportIssueDate}
                onChange={(e) => setPassportIssueDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date of Expiry</label>
              <input 
                type="date" 
                value={passportExpiryDate}
                onChange={(e) => setPassportExpiryDate(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>
          </motion.div>
        )}

        {/* Tab Content 3: Skills & Languages */}
        {activeTab === "skills" && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Languages */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                Language Competence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amharic (Native)</label>
                  <select 
                    value={langAmharic}
                    onChange={(e) => setLangAmharic(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Arabic</label>
                  <select 
                    value={langArabic}
                    onChange={(e) => setLangArabic(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">English</label>
                  <select 
                    value={langEnglish}
                    onChange={(e) => setLangEnglish(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Skills Checkbox Grid */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-500" />
                Standard Household Competence (Skills)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { state: skillCleaning, setter: setSkillCleaning, label: "Cleaning / الغسيل والترتيب" },
                  { state: skillBabySitting, setter: setSkillBabySitting, label: "Baby Sitting / رعاية الأطفال الرضع" },
                  { state: skillLaundry, setter: setSkillLaundry, label: "Laundry / الكي والغسيل" },
                  { state: skillHousekeeping, setter: setSkillHousekeeping, label: "Housekeeping / ترتيب المنزل" },
                  { state: skillIroning, setter: setSkillIroning, label: "Ironing / الكي" },
                  { state: skillChildCare, setter: setSkillChildCare, label: "Child Care / رعاية الأطفال" }
                ].map((skill, idx) => (
                  <label key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={skill.state}
                      onChange={(e) => skill.setter(e.target.checked)}
                      className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded-sm focus:ring-indigo-500"
                    />
                    <span className="text-xs font-medium text-slate-700">{skill.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Work Experience */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Prior Work Experience
                </h3>
                <button
                  type="button"
                  onClick={() => setExperiences([...experiences, { position: "", years: "", previousCountry: "" }])}
                  className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Country Experience / إضافة خبرة
                </button>
              </div>

              <div className="space-y-4">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl relative group">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/40">
                      <span className="text-[11px] font-bold text-indigo-700">Experience #{idx + 1}</span>
                      {experiences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = experiences.filter((_, i) => i !== idx);
                            setExperiences(updated);
                            if (idx === 0 && updated.length > 0) {
                              setExpPosition(updated[0].position);
                              setExpYears(updated[0].years);
                              setExpCountry(updated[0].previousCountry);
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-lg transition-colors cursor-pointer"
                          title="Remove Experience"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Position Held</label>
                        <input 
                          type="text" 
                          value={exp.position}
                          onChange={(e) => {
                            const updated = [...experiences];
                            updated[idx] = { ...updated[idx], position: e.target.value };
                            setExperiences(updated);
                            if (idx === 0) setExpPosition(e.target.value);
                          }}
                          placeholder="e.g. HOUSEMAID"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Years / Duration</label>
                        <input 
                          type="text" 
                          value={exp.years}
                          onChange={(e) => {
                            const updated = [...experiences];
                            updated[idx] = { ...updated[idx], years: e.target.value };
                            setExperiences(updated);
                            if (idx === 0) setExpYears(e.target.value);
                          }}
                          placeholder="e.g. 2 Years"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Country Worked In</label>
                        <input 
                          type="text" 
                          value={exp.previousCountry}
                          onChange={(e) => {
                            const updated = [...experiences];
                            updated[idx] = { ...updated[idx], previousCountry: e.target.value };
                            setExperiences(updated);
                            if (idx === 0) setExpCountry(e.target.value);
                          }}
                          placeholder="e.g. Kuwait"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab Content 4: Destination Agency & Terms */}
        {activeTab === "deployment" && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Destination Country</label>
              <select 
                value={countryId}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700"
              >
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Associated Destination Agency</label>
              <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 font-bold">
                {(() => {
                  const matchedCountry = countries.find(c => c.id === countryId);
                  const partnerAgency = agencies.find(a => a.id === matchedCountry?.partnerAgencyId);
                  return partnerAgency ? `${partnerAgency.name} (${partnerAgency.contactPerson})` : "No associated partner agency";
                })()}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Monthly Salary ({selectedCountry ? selectedCountry.currency : "SAR"})
              </label>
              <input 
                type="number" 
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contract Period</label>
              <input 
                type="text" 
                value={contractPeriod}
                onChange={(e) => setContractPeriod(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Candidate Current Placement Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700"
              >
                <option value="available">Available (نشط)</option>
                <option value="placed">Placed (تم التعاقد)</option>
                <option value="withdrawn">Withdrawn (منسحب)</option>
              </select>
            </div>
          </motion.div>
        )}

        {/* Tab Content 5: Media Attachments */}
        {activeTab === "attachments" && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {uploadError && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Applicant Headshot Photo URL</label>
                <input 
                  type="url" 
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 text-xs"
                />
                
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400">Provide a high-quality vertical portrait image</p>
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100">
                    {isUploadingPhoto ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 text-indigo-600" />
                        Browse Local File
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          compressAndSetImage(file, setPhotoUrl, setIsUploadingPhoto, 800);
                        }
                      }}
                    />
                  </label>
                </div>

                {photoUrl && (
                  <div className="mt-3 relative inline-block group">
                    <img 
                      src={photoUrl} 
                      alt="Headshot Preview" 
                      className="h-24 w-20 rounded-xl border border-slate-200 object-cover shadow-xs transition-transform group-hover:scale-[1.02]" 
                      referrerPolicy="no-referrer" 
                    />
                    <button 
                      type="button"
                      onClick={() => setPhotoUrl("")}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                      title="Clear photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/55 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                      {photoUrl.startsWith("data:") ? "local" : "url"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Passport Scan Photo URL</label>
                <input 
                  type="url" 
                  value={passportScanUrl}
                  onChange={(e) => setPassportScanUrl(e.target.value)}
                  placeholder="https://example.com/passport.jpg"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 text-xs"
                />
                
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400">Provide an image URL of the biometric information page</p>
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100">
                    {isUploadingPassport ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 text-indigo-600" />
                        Browse Local File
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          compressAndSetImage(file, setPassportScanUrl, setIsUploadingPassport, 800);
                        }
                      }}
                    />
                  </label>
                </div>

                {passportScanUrl && (
                  <div className="mt-3 relative inline-block group">
                    <img 
                      src={passportScanUrl} 
                      alt="Passport Preview" 
                      className="h-20 w-32 rounded-xl border border-slate-200 object-cover shadow-xs transition-transform group-hover:scale-[1.02]" 
                      referrerPolicy="no-referrer" 
                    />
                    <button 
                      type="button"
                      onClick={() => setPassportScanUrl("")}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                      title="Clear passport scan"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/55 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                      {passportScanUrl.startsWith("data:") ? "local" : "url"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Applicant Full-Body Portrait Photo URL</label>
                <input 
                  type="url" 
                  value={fullBodyPhotoUrl}
                  onChange={(e) => setFullBodyPhotoUrl(e.target.value)}
                  placeholder="https://example.com/full-body-photo.jpg"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 text-xs"
                />
                
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400">Provide a high-quality full-body portrait image</p>
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100">
                    {isUploadingFullBodyPhoto ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 text-indigo-600" />
                        Browse Local File
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          compressAndSetImage(file, setFullBodyPhotoUrl, setIsUploadingFullBodyPhoto, 1000);
                        }
                      }}
                    />
                  </label>
                </div>

                {fullBodyPhotoUrl && (
                  <div className="mt-3 relative inline-block group">
                    <img 
                      src={fullBodyPhotoUrl} 
                      alt="Full-Body Portrait Preview" 
                      className="h-24 w-16 rounded-xl border border-slate-200 object-cover shadow-xs transition-transform group-hover:scale-[1.02]" 
                      referrerPolicy="no-referrer" 
                    />
                    <button 
                      type="button"
                      onClick={() => setFullBodyPhotoUrl("")}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer"
                      title="Clear full-body photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-black/55 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                      {fullBodyPhotoUrl.startsWith("data:") ? "local" : "url"}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Self-Introduction Video URL (Optional)</label>
                <input 
                  type="url" 
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/intro.mp4"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 text-xs"
                />
                
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-slate-400">Generates a Scan-to-Watch QR code block dynamically on the CV PDF</p>
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100">
                    {isUploadingVideo ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3 h-3 text-indigo-600" />
                        Browse Local File
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="video/*" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleLocalVideoUpload(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {videoUrl && (
                  <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-[10px] text-slate-600 w-full max-w-sm relative">
                    <span className="truncate max-w-[200px] font-mono">{videoUrl}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded font-bold ml-auto shrink-0">
                      {videoUrl.startsWith("data:") ? "local file" : "web link"}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setVideoUrl("")}
                      className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-sm transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Preset helper */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs text-amber-800 leading-relaxed">
              <h4 className="font-bold mb-1 text-amber-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Note on Media Uploads
              </h4>
              You can now either **paste any web URL directly** or click **Browse Local File** to choose a picture/video from your computer. Images are automatically compressed to ensure fast loading and database efficiency!
            </div>
          </motion.div>
        )}

        {/* Tab Content 6: Optional AI Review */}
        {activeTab === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    AI Candidate Evaluation & Review (Optional)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Provide a short, polished summary of the candidate's performance or evaluation. Leave empty if you don't wish to include a review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateReview}
                  disabled={isGeneratingReview}
                  className="shrink-0 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 border border-indigo-100 px-4 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isGeneratingReview ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      Drafting with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Auto-Draft with AI (English & Arabic)
                    </>
                  )}
                </button>
              </div>

              {/* Textareas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                {/* English Review */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      English Candidate Review
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePolishReview}
                        disabled={isPolishingReview || !reviewEn.trim()}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 disabled:text-slate-400 bg-amber-50 hover:bg-amber-100 disabled:bg-slate-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-amber-100/40"
                      >
                        {isPolishingReview ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                            Polishing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Polish English (AI)</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleTranslateReview}
                        disabled={isTranslatingReview || !reviewEn.trim()}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-indigo-100/40"
                      >
                        {isTranslatingReview ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <span>Translate to Arabic 🌐</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={reviewEn}
                    onChange={(e) => setReviewEn(e.target.value)}
                    placeholder="e.g. Saron is a polite and hardworking housekeeper. She has a positive attitude and possesses a solid understanding of domestic duties. Highly recommended."
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">Write simple or broken English, then click **Polish English (AI)** to clean it up. It will also translate to Arabic automatically!</p>
                </div>

                {/* Arabic Review */}
                <div className="flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 text-right">
                    تقييم المرشحة باللغة العربية (Arabic Review)
                  </label>
                  <textarea
                    value={reviewAr}
                    onChange={(e) => setReviewAr(e.target.value)}
                    placeholder="مثال: سارون عاملة منزلية مهذبة ومجتهدة. لديها موقف إيجابي وتفهم جيدًا الواجبات المنزلية. نوصي بها بشدة."
                    rows={5}
                    dir="rtl"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed text-right font-medium"
                  />
                  <p className="text-[9px] text-slate-400 mt-1 text-right">سيتم عرض هذا التقييم باللغة العربية في الـ CV ليتناسب مع أصحاب العمل.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Bar */}
      <div className="bg-slate-50 p-5 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          {isInline ? "Back to Directory" : "Cancel"}
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-100 cursor-pointer"
            title="Download formatted A4 PDF containing biographical details and documents"
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CV PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-100 cursor-pointer"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{candidate ? "Update Candidate Details" : "Finalize & Save Standardized CV"}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {renderFormBody()}
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {renderFormBody()}
      </motion.div>
    </div>
  );
}
