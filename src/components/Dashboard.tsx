import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, Users, FileText, Globe, CheckCircle, Plus, Search, 
  Filter, Eye, Edit2, Check, XCircle, Trash2, ArrowUpRight, 
  ExternalLink, Calendar, MapPin, Sparkles, RefreshCw, AlertCircle, Loader2,
  Video
} from "lucide-react";
import { Candidate, Country, Agency } from "../types";
import { getBilingualValue } from "../lib/translate";
import { 
  collection, onSnapshot, query, setDoc, doc, getDocs, writeBatch, deleteDoc 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import CandidateForm from "./CandidateForm";
import CandidatePreview from "./CandidatePreview";

interface DashboardProps {
  userName: string;
  userEmail: string;
  userUid: string;
  onLogout: () => void;
}

const DEFAULT_AGENCIES: Agency[] = [
  {
    id: "agency_saudi",
    name: "Alashraf Alawwal Recruitment Office",
    nameArabic: "مكتب الأشراف الأول للاستقدام",
    country: "Saudi Arabia",
    contactPerson: "Mr. Abdulaziz Al-Otaibi",
    phone: "+966 50 123 4567",
    email: "riyadh@alashraf-recruitment.com"
  },
  {
    id: "agency_kuwait",
    name: "Al-Durra Manpower Company",
    nameArabic: "شركة الدرة للعمالة المنزلية",
    country: "Kuwait",
    contactPerson: "Mr. Khaled Al-Kandari",
    phone: "+965 2240 1234",
    email: "info@aldurrakw.com"
  },
  {
    id: "agency_uae",
    name: "Tadbeer Al Nakheel Service Center",
    nameArabic: "مركز تدبير النخيل للخدمات",
    country: "UAE",
    contactPerson: "Mrs. Fatima Al-Mansoori",
    phone: "+971 4 234 5678",
    email: "dubai@tadbeer-alnakheel.ae"
  }
];

const DEFAULT_COUNTRIES: Country[] = [
  {
    id: "saudi_arabia",
    name: "Saudi Arabia",
    currency: "SAR",
    partnerAgencyId: "agency_saudi"
  },
  {
    id: "kuwait",
    name: "Kuwait",
    currency: "KWD",
    partnerAgencyId: "agency_kuwait"
  },
  {
    id: "uae",
    name: "UAE",
    currency: "AED",
    partnerAgencyId: "agency_uae"
  }
];

export default function Dashboard({ userName, userEmail, userUid, onLogout }: DashboardProps) {
  // Database state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Filter/Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCountry, setFilterCountry] = useState("saudi_arabia");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterReligion, setFilterReligion] = useState("all");
  const [filterSkill, setFilterSkill] = useState("all");

  // Modal active states
  const [activeFormCandidate, setActiveFormCandidate] = useState<Candidate | null | undefined>(undefined); // undefined means closed, null means new candidate, Candidate object means edit
  const [activePreviewCandidate, setActivePreviewCandidate] = useState<Candidate | null>(null);

  // Active Tab state for local navigation
  const [activeTab, setActiveTab] = useState<"overview" | "builder" | "videos">("overview");
  const [selectedVideoCandidate, setSelectedVideoCandidate] = useState<Candidate | null>(null);
  const [videoSearchTerm, setVideoSearchTerm] = useState("");

  // Seed default metadata if empty in Firestore
  useEffect(() => {
    const seedMetaData = async () => {
      try {
        const countriesSnap = await getDocs(collection(db, "countries"));
        if (countriesSnap.empty) {
          setIsSeeding(true);
          console.log("Seeding default countries and agencies...");
          
          const batch = writeBatch(db);
          
          // Seed agencies
          DEFAULT_AGENCIES.forEach(agency => {
            const agencyRef = doc(db, "agencies", agency.id);
            batch.set(agencyRef, agency);
          });

          // Seed countries
          DEFAULT_COUNTRIES.forEach(country => {
            const countryRef = doc(db, "countries", country.id);
            batch.set(countryRef, country);
          });

          await batch.commit();
          console.log("Seeding complete!");
          setIsSeeding(false);
        }
      } catch (err) {
        console.error("Error seeding default Firestore data:", err);
        setIsSeeding(false);
      }
    };

    seedMetaData();
  }, []);

  // Sync real-time data
  useEffect(() => {
    // 1. Listen to countries
    const unsubscribeCountries = onSnapshot(collection(db, "countries"), (snap) => {
      const list: Country[] = [];
      snap.forEach(doc => list.push(doc.data() as Country));
      setCountries(list);
    });

    // 2. Listen to agencies
    const unsubscribeAgencies = onSnapshot(collection(db, "agencies"), (snap) => {
      const list: Agency[] = [];
      snap.forEach(doc => list.push(doc.data() as Agency));
      setAgencies(list);
    });

    // 3. Listen to candidates
    const unsubscribeCandidates = onSnapshot(collection(db, "candidates"), (snap) => {
      const list: Candidate[] = [];
      snap.forEach(doc => list.push(doc.data() as Candidate));
      // Sort candidates by newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCandidates(list);
      setIsLoading(false);
    });

    return () => {
      unsubscribeCountries();
      unsubscribeAgencies();
      unsubscribeCandidates();
    };
  }, []);

  // Quick Action: Update Candidate Status
  const handleUpdateStatus = async (candidateId: string, newStatus: "available" | "placed" | "withdrawn") => {
    try {
      const candidateRef = doc(db, "candidates", candidateId);
      await setDoc(candidateRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Error updating candidate status:", err);
      handleFirestoreError(err, OperationType.UPDATE, `candidates/${candidateId}`);
    }
  };

  // Quick Action: Delete Candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this candidate record?")) return;
    try {
      await deleteDoc(doc(db, "candidates", candidateId));
    } catch (err) {
      console.error("Error deleting candidate:", err);
      handleFirestoreError(err, OperationType.DELETE, `candidates/${candidateId}`);
    }
  };

  // Filter Logic
  const filteredCandidates = candidates.filter(cand => {
    const term = searchTerm.toLowerCase().trim();
    const matchSearch = !term || 
      cand.name.toLowerCase().includes(term) ||
      cand.refNo.toLowerCase().includes(term) ||
      cand.passportNo.toLowerCase().includes(term) ||
      cand.nationality.toLowerCase().includes(term);

    const matchCountry = filterCountry === "all" || cand.countryId === filterCountry;
    const matchStatus = filterStatus === "all" || cand.status === filterStatus;
    const matchReligion = filterReligion === "all" || cand.religion === filterReligion;
    
    let matchSkill = true;
    if (filterSkill !== "all") {
      const key = filterSkill as keyof typeof cand.skills;
      matchSkill = !!cand.skills[key];
    }

    return matchSearch && matchCountry && matchStatus && matchReligion && matchSkill;
  });

  // Count Stats
  const countAvailable = candidates.filter(c => c.status === "available").length;
  const countPlaced = candidates.filter(c => c.status === "placed").length;
  const countWithdrawn = candidates.filter(c => c.status === "withdrawn").length;

  // Set default video candidate
  useEffect(() => {
    const videoCands = candidates.filter(c => !!c.videoUrl);
    if (videoCands.length > 0 && !selectedVideoCandidate) {
      setSelectedVideoCandidate(videoCands[0]);
    }
  }, [candidates, selectedVideoCandidate]);

  const renderBuilderWelcome = () => {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 min-h-[500px] flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
          <FileText className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Standardized CV Builder Workstation</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-lg leading-relaxed">
          Create premium, agency-standardized A4 CV sheets with biometric passport OCR scanning simulations. Re-format candidate records directly into Arabic/English bilingual schemas.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mt-8">
          {/* Option 1: Start Fresh */}
          <div className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 p-6 rounded-2xl text-left transition-colors flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full tracking-wider">Option A</span>
              <h3 className="font-bold text-slate-800 text-sm mt-3">Start From Scratch</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Open a blank intake form to manually enter the candidate's personal data, passport parameters, and skill sets.
              </p>
            </div>
            <button
              onClick={() => setActiveFormCandidate(null)}
              className="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-indigo-150"
            >
              Open Blank Intake Form
            </button>
          </div>

          {/* Option 2: Choose Draft */}
          <div className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 p-6 rounded-2xl text-left transition-colors flex flex-col justify-between">
            <div>
              <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full tracking-wider">Option B</span>
              <h3 className="font-bold text-slate-800 text-sm mt-3">Modify Existing Profile</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Select one of our active candidates from the database to update their biographical details or attach media files.
              </p>
            </div>
            
            <div className="mt-6 space-y-2">
              <select
                onChange={(e) => {
                  const cand = candidates.find(c => c.id === e.target.value);
                  if (cand) setActiveFormCandidate(cand);
                }}
                defaultValue=""
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="" disabled>-- Select Candidate to Edit --</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.refNo})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoIntroductions = () => {
    const videoCandidates = candidates.filter(c => !!c.videoUrl);
    const filteredVideoCandidates = videoCandidates.filter(c => 
      c.name.toLowerCase().includes(videoSearchTerm.toLowerCase()) ||
      c.refNo.toLowerCase().includes(videoSearchTerm.toLowerCase()) ||
      c.position.toLowerCase().includes(videoSearchTerm.toLowerCase())
    );

    // Default to first matching video candidate if current is not set or not in list
    const liveSelectedVideoCandidate = selectedVideoCandidate 
      ? (candidates.find(c => c.id === selectedVideoCandidate.id) || selectedVideoCandidate)
      : null;

    const activeVideoCand = liveSelectedVideoCandidate && filteredVideoCandidates.some(c => c.id === liveSelectedVideoCandidate.id)
      ? liveSelectedVideoCandidate
      : (filteredVideoCandidates[0] || null);

    const qrUrl = activeVideoCand?.videoUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activeVideoCand.videoUrl)}`
      : "";

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Candidates list */}
        <div className="lg:col-span-1 bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col h-[650px] overflow-hidden shadow-sm">
          <div className="mb-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-600" />
              Candidate Video Profiles
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Select a candidate with an active self-introduction video.</p>
          </div>

          {/* Search bar */}
          <div className="relative mb-4 flex-shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={videoSearchTerm}
              onChange={(e) => setVideoSearchTerm(e.target.value)}
              placeholder="Filter by name or position..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
            />
          </div>

          {/* Candidate list */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredVideoCandidates.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-200 mb-2" />
                <p className="text-xs font-semibold">No Video Profiles Found</p>
              </div>
            ) : (
              filteredVideoCandidates.map((cand) => {
                const isActive = activeVideoCand?.id === cand.id;
                return (
                  <button
                    key={cand.id}
                    onClick={() => setSelectedVideoCandidate(cand)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left border transition-all duration-250 cursor-pointer ${
                      isActive 
                        ? "bg-indigo-50/70 border-indigo-200/80 shadow-xs" 
                        : "bg-white hover:bg-slate-50 border-slate-100"
                    }`}
                  >
                    <img 
                      src={cand.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500"} 
                      alt={cand.name} 
                      className="w-10 h-10 rounded-full border border-slate-200/85 object-cover bg-slate-50 flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block font-black text-slate-800 uppercase tracking-tight truncate">{cand.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.2 rounded">
                          {cand.position}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 font-bold">{cand.refNo}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Player Stage */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 flex flex-col h-[650px] overflow-hidden shadow-sm justify-between">
          {activeVideoCand ? (
            <div className="flex flex-col h-full justify-between gap-4">
              {/* Stage Header */}
              <div className="flex justify-between items-start flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Media Stream</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight mt-1">{activeVideoCand.name}</h2>
                  <p className="text-xs text-slate-500 font-medium">Intended Profession: <strong>{activeVideoCand.position}</strong> • Ref: <strong>{activeVideoCand.refNo}</strong></p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setActivePreviewCandidate(activeVideoCand)}
                    className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-indigo-100"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview CV PDF
                  </button>
                </div>
              </div>

              {/* Video Player Box */}
              <div className="flex-1 bg-slate-950 rounded-2xl overflow-hidden relative flex items-center justify-center border border-slate-900 shadow-inner group min-h-[220px]">
                <video 
                  key={activeVideoCand.id}
                  src={activeVideoCand.videoUrl} 
                  controls 
                  playsInline
                  className="w-full h-full object-contain max-h-[340px]"
                />
              </div>

              {/* Stage Footer: Details & QR Code */}
              <div className="bg-slate-50/85 rounded-2xl p-4 border border-slate-150 flex flex-col sm:flex-row items-center gap-5 flex-shrink-0">
                {qrUrl && (
                  <div className="bg-white p-2 border border-slate-200 rounded-xl flex-shrink-0 text-center shadow-xs">
                    <img 
                      src={qrUrl} 
                      alt="Candidate Video QR Code" 
                      className="w-20 h-20 mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    <span className="block text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Scan to Watch</span>
                  </div>
                )}

                <div className="flex-1 text-slate-600 text-[11px] leading-relaxed space-y-1.5 font-medium">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    Biographical & Video Verification
                  </h4>
                  <p>
                    Scan this QR code with any mobile camera to stream the self-introduction instantly on a phone. Standardizing this candidate record incorporates the live stream token directly on Page 1 of the CV, enabling international recruitment managers to inspect soft skills seamlessly.
                  </p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 font-semibold">
                    <span>Religion: <strong className="text-slate-700">{activeVideoCand.religion}</strong></span>
                    <span>Age: <strong className="text-slate-700">{activeVideoCand.age} Years</strong></span>
                    <span>Nationality: <strong className="text-slate-700">{activeVideoCand.nationality}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-400">
              <Video className="w-12 h-12 text-slate-200 mb-3" />
              <h4 className="text-sm font-bold text-slate-700">No Video Profiles Loaded</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Add video URLs to candidate records in the CV Builder to activate interactive video verification cards.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ourAgency = {
    name: "TAG RECRUITMENT OVERSEAS AGENCY",
    address: "Bole Road, Mega Building 5th Floor, Addis Ababa, Ethiopia",
    phone: "+251 11 661 2345"
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-6xl mx-auto px-4 py-6"
      id="dashboard-container"
    >
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Active Standardizer Console</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-1.5 h-6 bg-indigo-600 rounded-full"></span>
            <h1 className="text-2xl font-black text-slate-800">Recruitment CV standardizer</h1>
          </div>
          <p className="text-sm text-slate-500 ml-3.5">Logged in as {userName} ({userEmail})</p>
        </div>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 py-2.5 px-4 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-sm shadow-sm"
          id="dashboard-logout-btn"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          Log Out
        </button>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex border-b border-slate-200 mb-6 gap-2 bg-white p-2 rounded-2xl shadow-sm">
        {[
          { id: "overview", label: "Profile Overview", icon: Users },
          { id: "builder", label: "CV Builder", icon: FileText },
          { id: "videos", label: "Video Introduction", icon: Video }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                isSelected 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                  : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conditional Rendering of Tabs */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: "Available Candidates", value: countAvailable, color: "text-indigo-600 border-indigo-200 bg-indigo-50/50", icon: Users },
                { label: "Placed / Deploying", value: countPlaced, color: "text-emerald-600 border-emerald-200 bg-emerald-50/50", icon: CheckCircle },
                { label: "Withdrawn / Inactive", value: countWithdrawn, color: "text-rose-600 border-rose-200 bg-rose-50/50", icon: XCircle }
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className={`p-5 rounded-2xl border flex items-center justify-between ${stat.color} shadow-sm`}>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{stat.label}</span>
                      <span className="block text-3xl font-black mt-1">{isLoading ? "..." : stat.value}</span>
                    </div>
                    <div className="p-3 bg-white border rounded-xl shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Database Controller: Filter Bar & Add Candidate */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 max-w-md relative">
                  <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search candidate by name, passport no, reference ID..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveFormCandidate(null);
                      setActiveTab("builder");
                    }}
                    className="inline-flex items-center gap-2 py-2.5 px-4.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-indigo-100"
                  >
                    <Plus className="w-4 h-4" />
                    New Candidate CV Form
                  </button>
                </div>
              </div>

              {/* Filter Selection Panel */}
              <div className="bg-slate-50/60 p-5 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Target Destination
                  </label>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Countries (الكل)</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses (كل الحالات)</option>
                    <option value="available">Available (نشط)</option>
                    <option value="placed">Placed (تم التعاقد)</option>
                    <option value="withdrawn">Withdrawn (منسحب)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Religion
                  </label>
                  <select
                    value={filterReligion}
                    onChange={(e) => setFilterReligion(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Religions</option>
                    <option value="Christian">Christian</option>
                    <option value="Muslim">Muslim</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                    Primary Competence
                  </label>
                  <select
                    value={filterSkill}
                    onChange={(e) => setFilterSkill(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="all">All Skills</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="babySitting">Baby Sitting</option>
                    <option value="laundry">Laundry</option>
                    <option value="housekeeping">Housekeeping</option>
                    <option value="ironing">Ironing</option>
                    <option value="childCare">Child Care</option>
                  </select>
                </div>
              </div>

              {/* Real-time Candidate Table */}
              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Syncing candidate profiles from Firestore...</p>
                  </div>
                ) : isSeeding ? (
                  <div className="p-12 text-center text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Populating standard agencies & destination countries...</p>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="p-16 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                    <h4 className="text-sm font-bold text-slate-700">No Standardized Candidates Found</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Create a new candidate or adjust your filter query at the top to display records.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="py-3.5 px-6">Candidate / Reference</th>
                        <th className="py-3.5 px-4">Passport Details</th>
                        <th className="py-3.5 px-4">Destination Office</th>
                        <th className="py-3.5 px-4">Biographical data</th>
                        <th className="py-3.5 px-4 text-center">Video</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredCandidates.map((cand) => {
                        const matchedCountry = countries.find(c => c.id === cand.countryId);
                        const partnerAgency = agencies.find(a => a.id === matchedCountry?.partnerAgencyId);
                        
                        return (
                          <motion.tr 
                            key={cand.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            {/* Name & ID */}
                            <td className="py-4.5 px-6">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={cand.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500"} 
                                  alt="Face" 
                                  className="w-10 h-10 rounded-full border border-slate-200 object-cover bg-slate-100 flex-shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="block font-black text-slate-800 uppercase tracking-tight">{cand.name}</span>
                                  <span className="inline-flex items-center gap-1.5 mt-0.5 font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                    {cand.refNo}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Passport Info */}
                            <td className="py-4.5 px-4">
                              <span className="block font-bold text-slate-700 tracking-tight">{cand.passportNo}</span>
                              <span className="block text-[10px] text-slate-400 font-medium">
                                Expires: {cand.passportExpiryDate} <span className="text-slate-300">|</span> ينتهي: {cand.passportExpiryDate}
                              </span>
                            </td>

                            {/* Destination Country & Partner */}
                            <td className="py-4.5 px-4">
                              <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                                {matchedCountry ? matchedCountry.name : "Unassigned"}
                              </span>
                              <span className="block text-[10px] text-slate-400 truncate max-w-[150px]" title={partnerAgency?.name}>
                                {partnerAgency ? partnerAgency.name : "No Partner Agency"}
                              </span>
                            </td>

                            {/* Biographical */}
                            <td className="py-4.5 px-4">
                              <span className="block font-semibold text-slate-700">
                                {getBilingualValue("religion", cand.religion)} • {cand.age} yrs • {getBilingualValue("maritalStatus", cand.maritalStatus)}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                Edu: {getBilingualValue("education", cand.education)}
                              </span>
                            </td>

                            {/* Video clip attachment indicator */}
                            <td className="py-4.5 px-4 text-center">
                              {cand.videoUrl ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                  YES
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300">None</span>
                              )}
                            </td>

                            {/* Status select wrapper */}
                            <td className="py-4.5 px-4">
                              <select
                                value={cand.status}
                                onChange={(e) => handleUpdateStatus(cand.id, e.target.value as any)}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-extrabold border uppercase cursor-pointer focus:outline-none ${
                                  cand.status === "available"
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                    : cand.status === "placed"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-slate-100 border-slate-300 text-slate-500"
                                }`}
                              >
                                <option value="available">Available</option>
                                <option value="placed">Placed</option>
                                <option value="withdrawn">Withdrawn</option>
                              </select>
                            </td>

                            {/* CRUD Buttons */}
                            <td className="py-4.5 px-6 text-right">
                              <div className="flex justify-end gap-1.5">
                                {/* Preview CV A4 sheet */}
                                <button
                                  onClick={() => setActivePreviewCandidate(cand)}
                                  className="p-1.5 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Generate Standardized CV PDF Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>

                                {/* Edit Details */}
                                <button
                                  onClick={() => {
                                    setActiveFormCandidate(cand);
                                    setActiveTab("builder");
                                  }}
                                  className="p-1.5 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Edit Candidate Profile"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteCandidate(cand.id)}
                                  className="p-1.5 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  title="Delete Candidate Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "builder" && (
          <motion.div
            key="builder-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {activeFormCandidate !== undefined ? (
              <CandidateForm
                candidate={activeFormCandidate}
                countries={countries}
                agencies={agencies}
                staffId={userUid}
                isInline={true}
                onClose={() => {
                  setActiveFormCandidate(undefined);
                  setActiveTab("overview");
                }}
                onSuccess={() => {
                  setActiveFormCandidate(undefined);
                  setActiveTab("overview");
                }}
              />
            ) : (
              renderBuilderWelcome()
            )}
          </motion.div>
        )}

        {activeTab === "videos" && (
          <motion.div
            key="videos-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            {renderVideoIntroductions()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slideovers & Modals */}
      <AnimatePresence>
        {/* Candidate PDF Sheet Preview Screen */}
        {activePreviewCandidate && (() => {
          const liveCandidate = candidates.find(c => c.id === activePreviewCandidate.id) || activePreviewCandidate;
          return (
            <CandidatePreview
              candidate={liveCandidate}
              country={countries.find(c => c.id === liveCandidate.countryId) || null}
              agency={agencies.find(a => a.id === countries.find(c => c.id === liveCandidate.countryId)?.partnerAgencyId) || null}
              ourAgency={ourAgency}
              onClose={() => setActivePreviewCandidate(null)}
              staffName={userName}
            />
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}
