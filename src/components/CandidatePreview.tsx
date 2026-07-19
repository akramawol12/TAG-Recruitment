import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  X, Printer, Share2, Check, Send, AlertCircle, Loader2, FileText, ExternalLink, Download
} from "lucide-react";
import { Candidate, Country, Agency } from "../types";
import { collection, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { getBilingualValue, getChildrenBilingual } from "../lib/translate";
// @ts-ignore
import html2pdf from "html2pdf.js";

// Helper function to convert OKLAB color to sRGB string
function oklabToRgbString(L: number, a: number, b: number, alphaStr: string = "1"): string {
  // OKLAB to LMS
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  
  // LMS to linear sRGB (applying power of 3)
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  
  // Linear sRGB to sRGB
  const toSRGB = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    } else {
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
  };
  
  const rVal = Math.max(0, Math.min(255, Math.round(toSRGB(rLin) * 255)));
  const gVal = Math.max(0, Math.min(255, Math.round(toSRGB(gLin) * 255)));
  const bVal = Math.max(0, Math.min(255, Math.round(toSRGB(bLin) * 255)));
  
  if (alphaStr === "1") {
    return `rgb(${rVal}, ${gVal}, ${bVal})`;
  } else {
    return `rgba(${rVal}, ${gVal}, ${bVal}, ${alphaStr})`;
  }
}

// Helper function to convert OKLCH color to sRGB string
function oklchToRgbString(L: number, C: number, H: number, alphaStr: string = "1"): string {
  // Convert hue to radians
  const hRad = (H * Math.PI) / 180;
  
  // OKLCH to OKLAB
  const oklabA = C * Math.cos(hRad);
  const oklabB = C * Math.sin(hRad);
  
  return oklabToRgbString(L, oklabA, oklabB, alphaStr);
}

// Replaces oklch(...) and oklab(...) occurrences inside CSS with standard rgb/rgba, handling nested parentheses correctly
function replaceOklchInCss(cssText: string): string {
  let result = "";
  let i = 0;
  const len = cssText.length;

  while (i < len) {
    const isOklch = cssText.substring(i, i + 6) === "oklch(";
    const isOklab = cssText.substring(i, i + 6) === "oklab(";

    if (isOklch || isOklab) {
      const startOfName = i;
      const startOfInside = i + 6;
      let depth = 1;
      let j = startOfInside;

      while (j < len && depth > 0) {
        const char = cssText[j];
        if (char === "(") {
          depth++;
        } else if (char === ")") {
          depth--;
        }
        j++;
      }

      if (depth === 0) {
        // Found matching outer parenthesis
        const inside = cssText.substring(startOfInside, j - 1);
        const fullMatch = cssText.substring(startOfName, j);

        try {
          const slashIndex = inside.indexOf("/");
          let colorPart = inside;
          let alphaStr = "1";

          if (slashIndex !== -1) {
            colorPart = inside.substring(0, slashIndex).trim();
            alphaStr = inside.substring(slashIndex + 1).trim();
          }

          const colorClean = colorPart.replace(/,/g, " ").trim().replace(/\s+/g, " ");
          const parts = colorClean.split(" ");

          if (parts.length >= 3) {
            let lVal = parts[0];
            let l = 0;
            if (lVal.endsWith("%")) {
              l = parseFloat(lVal) / 100;
            } else {
              l = parseFloat(lVal);
            }

            if (isOklch) {
              let c = parseFloat(parts[1]);
              let hVal = parts[2];
              let h = 0;
              if (hVal.endsWith("deg")) {
                h = parseFloat(hVal);
              } else if (hVal.endsWith("rad")) {
                h = (parseFloat(hVal) * 180) / Math.PI;
              } else if (hVal.endsWith("turn")) {
                h = parseFloat(hVal) * 360;
              } else {
                h = parseFloat(hVal);
              }

              if (!isNaN(l) && !isNaN(c) && !isNaN(h)) {
                result += oklchToRgbString(l, c, h, alphaStr);
              } else {
                result += fullMatch;
              }
            } else {
              // oklab
              let a = parseFloat(parts[1]);
              let b = parseFloat(parts[2]);

              if (!isNaN(l) && !isNaN(a) && !isNaN(b)) {
                result += oklabToRgbString(l, a, b, alphaStr);
              } else {
                result += fullMatch;
              }
            }
          } else {
            result += fullMatch;
          }
        } catch (e) {
          console.warn("Failed parsing oklch/oklab inside:", inside, e);
          result += fullMatch;
        }

        i = j;
      } else {
        result += cssText[i];
        i++;
      }
    } else {
      result += cssText[i];
      i++;
    }
  }

  return result;
}

// Bypasses the HTML2Canvas crash by replacing OKLCH and OKLAB variables in stylesheets with readable color values
async function replaceOklchColorsForPdfAsync() {
  const originalStyles: { element: HTMLStyleElement | HTMLLinkElement; originalDisabled: boolean }[] = [];
  const tempStyles: HTMLStyleElement[] = [];

  const originalInlineStyles: { element: HTMLElement; styleAttr: string }[] = [];
  const printableContainer = document.getElementById("cv-printable-sheet");
  if (printableContainer) {
    const styledElements = printableContainer.querySelectorAll("[style]");
    styledElements.forEach((node) => {
      const el = node as HTMLElement;
      const styleAttr = el.getAttribute("style");
      if (styleAttr && (styleAttr.includes("oklch") || styleAttr.includes("oklab"))) {
        originalInlineStyles.push({ element: el, styleAttr });
        el.setAttribute("style", replaceOklchInCss(styleAttr));
      }
    });
  }

  // 1. Process style tags
  const styleElements = Array.from(document.querySelectorAll("style"));
  for (const el of styleElements) {
    if (el.textContent && (el.textContent.includes("oklch") || el.textContent.includes("oklab"))) {
      const sanitized = replaceOklchInCss(el.textContent);
      const tempStyle = document.createElement("style");
      tempStyle.textContent = sanitized;
      document.head.appendChild(tempStyle);
      tempStyles.push(tempStyle);

      let originalDisabled = false;
      if (el.sheet) {
        originalDisabled = el.sheet.disabled;
        el.sheet.disabled = true;
      } else {
        const media = el.getAttribute("media") || "";
        el.setAttribute("data-original-media", media);
        el.setAttribute("media", "only x");
      }
      originalStyles.push({ element: el, originalDisabled });
    }
  }

  // 2. Process link tags
  const linkElements = Array.from(document.querySelectorAll("link[rel='stylesheet']")) as HTMLLinkElement[];
  const fetchPromises = linkElements.map(async (link) => {
    try {
      const href = link.href;
      const isSameOrigin = href && (href.startsWith(window.location.origin) || !href.startsWith("http"));
      if (isSameOrigin) {
        const response = await fetch(href);
        if (response.ok) {
          const cssText = await response.text();
          if (cssText.includes("oklch") || cssText.includes("oklab")) {
            const sanitized = replaceOklchInCss(cssText);
            const tempStyle = document.createElement("style");
            tempStyle.textContent = sanitized;
            document.head.appendChild(tempStyle);
            tempStyles.push(tempStyle);

            let originalDisabled = false;
            if (link.sheet) {
              originalDisabled = link.sheet.disabled;
              link.sheet.disabled = true;
            } else {
              link.setAttribute("data-original-disabled", "true");
              link.disabled = true;
            }
            originalStyles.push({ element: link, originalDisabled });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch or process stylesheet:", link.href, e);
    }
  });

  await Promise.all(fetchPromises);

  return {
    restore: () => {
      originalStyles.forEach(({ element, originalDisabled }) => {
        if (element.sheet) {
          element.sheet.disabled = originalDisabled;
        } else {
          element.disabled = originalDisabled;
          const originalMedia = element.getAttribute("data-original-media");
          if (originalMedia !== null) {
            element.setAttribute("media", originalMedia);
            element.removeAttribute("data-original-media");
          }
        }
      });

      tempStyles.forEach((temp) => temp.remove());

      originalInlineStyles.forEach(({ element, styleAttr }) => {
        element.setAttribute("style", styleAttr);
      });
    }
  };
}

interface CandidatePreviewProps {
  candidate: Candidate;
  country: Country | null;
  agency: Agency | null;
  ourAgency: { name: string; address: string; phone: string };
  onClose: () => void;
  staffName: string;
}

export default function CandidatePreview({
  candidate,
  country,
  agency,
  ourAgency,
  onClose,
  staffName
}: CandidatePreviewProps) {
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [whatsAppSuccess, setWhatsAppSuccess] = useState<string | null>(null);
  const [whatsAppGroup, setWhatsAppGroup] = useState("TAG OVERSEAS RECRUITMENT DEPLOYMENT GROUP");
  const [showShareModal, setShowShareModal] = useState(false);

  // Generate QR code URL using a public QR code API
  const qrCodeUrl = candidate.videoUrl 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(candidate.videoUrl)}`
    : "";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("cv-printable-sheet");
    if (!element) {
      console.error("Printable sheet element not found");
      return;
    }

    setIsDownloading(true);
    
    // Temporarily replace OKLCH and OKLAB colors in stylesheets and inline styles to prevent html2canvas from crashing
    let colorsBypass: { restore: () => void } | null = null;

    try {
      colorsBypass = await replaceOklchColorsForPdfAsync();

      const opt = {
        margin:       [0, 0, 0, 0],
        filename:     `CV_${candidate.name.replace(/\s+/g, "_")}_${candidate.refNo}.pdf`,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          logging: false
        },
        jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak:    { mode: ["css", "legacy"] }
      };

      // @ts-ignore
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Failed to generate and download PDF:", err);
    } finally {
      // Always restore the original stylesheet contents and inline styles to keep the interactive UI perfect
      if (colorsBypass) {
        colorsBypass.restore();
      }
      setIsDownloading(false);
    }
  };

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingWhatsApp(true);
    setWhatsAppSuccess(null);

    try {
      // Create send record in /whatsappSends
      const sendRecord = {
        candidateId: candidate.id,
        candidateName: candidate.name,
        groupId: "group_" + Math.random().toString(36).substring(2, 9),
        groupName: whatsAppGroup,
        sentBy: staffName,
        sentAt: new Date().toISOString(),
        status: "success"
      };

      try {
        await addDoc(collection(db, "whatsappSends"), sendRecord);
      } catch (firestoreErr) {
        handleFirestoreError(firestoreErr, OperationType.CREATE, "whatsappSends");
      }

      // Simulate a small delay
      setTimeout(() => {
        setIsSendingWhatsApp(false);
        setWhatsAppSuccess(`Standardized CV for candidate ${candidate.refNo} has been successfully dispatched to WhatsApp group "${whatsAppGroup}"!`);
        // Also open standard web link to simulate real dispatch
        const text = `Greetings! Standardized CV for candidate ${candidate.name} (${candidate.refNo}) has been generated and is ready. View candidate profile: ${candidate.videoUrl || "Available"}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      }, 1500);
    } catch (err: any) {
      console.error("WhatsApp Send Error:", err);
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto print:p-0 print:bg-white print:absolute print:inset-0">
      {/* Container card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:shadow-none print:border-none print:w-full print:max-h-none print:overflow-visible print:rounded-none"
      >
        {/* Toolbar (Hidden in print) */}
        <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center flex-shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Standardized CV Preview</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="inline-flex items-center gap-2 py-2 px-3.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              title="Save the exact HTML CV layout as a perfect PDF"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? "Downloading..." : "Download / Save PDF"}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
              title="Print the exact standardized A4 CV sheet"
            >
              <Printer className="w-4 h-4" />
              Print CV
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-2 py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              Send to WhatsApp
            </button>

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/15 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WhatsApp Share Dialog / Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-[60] print:hidden">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 text-base">Send CV to WhatsApp Group</h3>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {whatsAppSuccess ? (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{whatsAppSuccess}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowShareModal(false);
                      setWhatsAppSuccess(null);
                    }}
                    className="w-full py-2 px-4 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                  >
                    Close Dialog
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendWhatsApp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target WhatsApp Group / Contact</label>
                    <input 
                      type="text" 
                      value={whatsAppGroup}
                      onChange={(e) => setWhatsAppGroup(e.target.value)}
                      placeholder="e.g. DUBAI PLACEMENTS BATCH"
                      required
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    This triggers a cloud action to route the standardized PDF link and CV details straight to the partner group. A persistent log of this dispatch will be stored under <strong>/whatsappSends</strong>.
                  </p>

                  <button
                    type="submit"
                    disabled={isSendingWhatsApp}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {isSendingWhatsApp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching CV Document...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send via WhatsApp API</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Printable A4 Area */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          {/* Printable Sheet page */}
          <div id="cv-printable-sheet" className="bg-white border border-slate-200 w-[210mm] min-h-[297mm] p-8 shadow-sm print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0 text-slate-800 text-[13px] font-sans antialiased leading-normal">
            
            {/* Page 1 */}
            <div className="min-h-[297mm] flex flex-col justify-between pb-8">
              <div>
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-3 mb-5">
                  <div className="max-w-[48%]">
                    <div className="text-sm font-black text-indigo-900 tracking-wider uppercase">{ourAgency.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-normal">{ourAgency.address} <br /> {ourAgency.phone}</div>
                  </div>
                  <div className="max-w-[48%] text-right" dir="rtl">
                    <div className="text-sm font-black text-slate-900 tracking-wider">{agency?.nameArabic || "مكتب الاستقدام الشريك"}</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-normal">{agency?.name || "Overseas Agency Partner"} <br /> {agency?.phone || "+"}</div>
                  </div>
                </div>

                {/* Top Row: Face shot & Candidate Name */}
                <div className="flex gap-5 mb-5 items-stretch">
                  <img 
                    src={candidate.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500"} 
                    alt="Headshot" 
                    className="w-24 h-24 rounded-full border-2 border-indigo-900 object-cover flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-center">
                    <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50">
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-100">Full Name / الاسم</div>
                      <div className="col-span-2 px-4 py-2 font-extrabold text-indigo-900 uppercase">{candidate.name}</div>
                    </div>
                    <div className="grid grid-cols-3">
                      <div className="px-4 py-2 text-[10px] font-bold text-slate-500 border-r border-slate-100">Position / الوظيفة</div>
                      <div className="col-span-2 px-4 py-2 font-bold text-slate-700">{getBilingualValue("position", candidate.position)}</div>
                    </div>
                  </div>
                </div>

                {/* Video Block Section (CONDITIONAL - only if videoUrl exists and is not blank) */}
                {candidate.videoUrl && candidate.videoUrl.trim() !== "" && (
                  <div className="border border-emerald-600/60 bg-emerald-50/55 rounded-2xl p-4 flex items-center gap-4 mb-5 print:border-emerald-600/60 print:bg-emerald-50/55">
                    {qrCodeUrl && (
                      <img 
                        src={qrCodeUrl} 
                        alt="Video QR Code" 
                        className="w-16 h-16 border border-emerald-200 bg-white p-1 rounded-lg flex-shrink-0" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div>
                      <div className="font-extrabold text-emerald-800 text-xs uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping"></span>
                        Video Profile / الفيديو التعريفي
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed font-medium">
                        Scan this code with any smartphone camera or click below to watch candidate's self-introduction video.
                      </p>
                      <a 
                        href={candidate.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:underline mt-1.5 print:hidden"
                      >
                        Watch Introduction Video
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="hidden print:inline-block text-[9px] font-mono text-slate-400 select-all font-semibold mt-1 break-all">
                        {candidate.videoUrl}
                      </span>
                    </div>
                  </div>
                )}

                {/* Body Details Column & Full Body Photo */}
                <div className="flex gap-5">
                  {/* Left Data Column */}
                  <div className="flex-1 space-y-4">
                    {/* Applicant Details */}
                    <div>
                      <div className="bg-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-t-xl flex justify-between">
                        <span>APPLICANT DETAILS</span>
                        <span dir="rtl">بيانات المتقدمة</span>
                      </div>
                      <table className="w-full border-collapse border border-slate-200">
                        <tbody>
                          {[
                            { label: "Ref. No", val: candidate.refNo, ar: "رقم المرجع" },
                            { label: `Salary (${country?.currency || "SAR"})`, val: `${candidate.salary} ${country?.currency || "SAR"} / ${candidate.salary} ${getBilingualValue("currency", country?.currency || "SAR").includes(" / ") ? getBilingualValue("currency", country?.currency || "SAR").split(" / ")[1] : "ريال"}`, ar: "الراتب" },
                            { label: "Contract Period", val: getBilingualValue("contractPeriod", candidate.contractPeriod), ar: "مدة العقد" },
                            { label: "Nationality", val: getBilingualValue("nationality", candidate.nationality), ar: "الجنسية" },
                            { label: "Religion", val: getBilingualValue("religion", candidate.religion), ar: "الديانة" },
                            { label: "Date of Birth", val: candidate.dob, ar: "تاريخ الميلاد" },
                            { label: "Place of Birth", val: getBilingualValue("birthPlace", candidate.birthPlace), ar: "مكان الميلاد" },
                            { label: "Age", val: `${candidate.age} Years / ${candidate.age} سنة`, ar: "العمر" },
                            { label: "Marital Status", val: getBilingualValue("maritalStatus", candidate.maritalStatus), ar: "الحالة الاجتماعية" },
                            { label: "No. of Children", val: getChildrenBilingual(candidate.numChildren), ar: "عدد الأطفال" },
                            { label: "Weight", val: `${candidate.weightKg} KG / ${candidate.weightKg} كجم`, ar: "الوزن" },
                            { label: "Height", val: `${candidate.heightCm} CM / ${candidate.heightCm} سم`, ar: "الطول" },
                            { label: "Education", val: getBilingualValue("education", candidate.education), ar: "المستوى التعليمي" },
                            { label: "Phone No.", val: candidate.phone, ar: "رقم الهاتف" }
                          ].map((row, i) => (
                            <tr key={i} className={`border-b border-slate-150 ${i % 2 === 0 ? "bg-slate-50/50" : "bg-white"}`}>
                              <td className="px-3 py-1 text-[11px] font-bold text-slate-600 border-r border-slate-100 w-[30%]">{row.label}</td>
                              <td className="px-3 py-1 text-[11px] font-extrabold text-slate-800 w-[40%]">{row.val}</td>
                              <td className="px-3 py-1 text-[11px] text-slate-500 font-semibold text-right w-[30%]" dir="rtl">{row.ar}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Passport Details */}
                    <div>
                      <div className="bg-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-t-xl flex justify-between">
                        <span>PASSPORT DETAILS</span>
                        <span dir="rtl">بيانات جواز السفر</span>
                      </div>
                      <table className="w-full border-collapse border border-slate-200">
                        <tbody>
                          {[
                            { label: "Passport No.", val: candidate.passportNo, ar: "رقم جواز السفر" },
                            { label: "Date of Issue", val: candidate.passportIssueDate, ar: "تاريخ الإصدار" },
                            { label: "Date of Expiry", val: candidate.passportExpiryDate, ar: "تاريخ الانتهاء" }
                          ].map((row, i) => (
                            <tr key={i} className={`border-b border-slate-150 ${i % 2 === 0 ? "bg-slate-50/50" : "bg-white"}`}>
                              <td className="px-3 py-1 text-[11px] font-bold text-slate-600 border-r border-slate-100 w-[30%]">{row.label}</td>
                              <td className="px-3 py-1 text-[11px] font-extrabold text-indigo-900 uppercase w-[40%]">{row.val}</td>
                              <td className="px-3 py-1 text-[11px] text-slate-500 font-semibold text-right w-[30%]" dir="rtl">{row.ar}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Full-Body Photo */}
                  <div className="w-[220px] flex-shrink-0 flex flex-col items-center justify-start pt-1">
                    <div className="border border-slate-200 p-2 bg-slate-50/50 rounded-2xl w-full">
                      <img 
                        src={candidate.fullBodyPhotoUrl || candidate.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500"} 
                        alt="Full Body Profile" 
                        className="w-full rounded-xl object-cover h-[350px] border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-[10px] text-slate-400 font-bold text-center mt-2 uppercase tracking-wide">
                        Full-Body Portrait / صورة كاملة
                      </div>
                    </div>
                  </div>
                </div>

                {/* Languages Section */}
                <div className="mt-5">
                  <div className="bg-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-t-xl flex justify-between">
                    <span>KNOWLEDGE OF LANGUAGES</span>
                    <span dir="rtl">المعرفة باللغات</span>
                  </div>
                  <table className="w-full border-collapse border border-slate-200 text-center">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                        <th className="py-1 px-3 border-r border-slate-200">Amharic (الأمهرية)</th>
                        <th className="py-1 px-3 border-r border-slate-200">Arabic (العربية)</th>
                        <th className="py-1 px-3">English (الإنجليزية)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-extrabold text-slate-700 text-xs">
                        <td className="py-2 px-3 border-r border-slate-200 text-indigo-600">{getBilingualValue("languages", candidate.languages.amharic)}</td>
                        <td className="py-2 px-3 border-r border-slate-200 text-slate-800">{getBilingualValue("languages", candidate.languages.arabic)}</td>
                        <td className="py-2 px-3 text-slate-800">{getBilingualValue("languages", candidate.languages.english)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Work Experience */}
                <div className="mt-5">
                  <div className="bg-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-t-xl flex justify-between">
                    <span>WORK EXPERIENCE</span>
                    <span dir="rtl">الخبرة العملية</span>
                  </div>
                  <table className="w-full border-collapse border border-slate-200 text-center">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase">
                        <th className="py-1 px-3 border-r border-slate-200">Position / الوظيفة</th>
                        <th className="py-1 px-3 border-r border-slate-200">Duration / المدة</th>
                        <th className="py-1 px-3">Country / البلد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const getWorkExperiences = (cand: any) => {
                          if (!cand.workExperience) return [];
                          if (Array.isArray(cand.workExperience)) {
                            return cand.workExperience;
                          }
                          const single = cand.workExperience;
                          if (!single.position && !single.years && !single.previousCountry) {
                            return [];
                          }
                          return [single];
                        };
                        const experiences = getWorkExperiences(candidate);
                        if (experiences.length === 0) {
                          return (
                            <tr className="font-bold text-slate-500 text-xs">
                              <td colSpan={3} className="py-3 text-center text-slate-400 font-medium">No Prior Experience / لا توجد خبرة سابقة</td>
                            </tr>
                          );
                        }
                        return experiences.map((exp, idx) => (
                          <tr key={idx} className="font-bold text-slate-700 text-xs border-b border-slate-100 last:border-0">
                            <td className="py-2 px-3 border-r border-slate-200">{getBilingualValue("position", exp.position)}</td>
                            <td className="py-2 px-3 border-r border-slate-200">{exp.years || "N/A"}</td>
                            <td className="py-2 px-3">{getBilingualValue("nationality", exp.previousCountry)}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Skills Section */}
                <div className="mt-5">
                  <div className="bg-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-t-xl flex justify-between">
                    <span>HOUSEHOLD COMPETENCE / SKILLS</span>
                    <span dir="rtl">المهارات المنزلية والعملية</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-b-xl flex flex-wrap gap-2 bg-slate-50/50">
                    {candidate.skills.cleaning && <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full uppercase">Cleaning / تنظيف</span>}
                    {candidate.skills.babySitting && <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full uppercase">Baby Sitting / رعاية رضع</span>}
                    {candidate.skills.laundry && <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full uppercase">Laundry / غسيل</span>}
                    {candidate.skills.housekeeping && <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full uppercase">Housekeeping / ترتيب المنزل</span>}
                    {candidate.skills.ironing && <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full uppercase">Ironing / كي الملابس</span>}
                    {candidate.skills.childCare && <span className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full uppercase">Child Care / رعاية أطفال</span>}
                  </div>
                </div>

                {/* Optional Candidate Review */}
                {(candidate.reviewEn || candidate.reviewAr) && (
                  <div className="mt-5">
                    <div className="bg-indigo-900 text-white font-bold text-xs px-3 py-1.5 rounded-t-xl flex justify-between">
                      <span>CANDIDATE EVALUATION & REVIEW</span>
                      <span dir="rtl">التقييم والمراجعة المهنية للمرشحة</span>
                    </div>
                    <div className="border border-slate-200 p-4 rounded-b-xl bg-slate-50/50 space-y-3">
                      {candidate.reviewEn && (
                        <div className="text-xs text-slate-700 italic leading-relaxed">
                          "{candidate.reviewEn}"
                        </div>
                      )}
                      {candidate.reviewEn && candidate.reviewAr && (
                        <div className="border-t border-slate-150 my-2"></div>
                      )}
                      {candidate.reviewAr && (
                        <div className="text-xs text-indigo-950 font-bold leading-relaxed text-right" dir="rtl">
                          "{candidate.reviewAr}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Page Footer */}
              <div className="text-[9px] font-bold text-slate-400 border-t border-slate-150 pt-2 flex justify-between mt-8">
                <span>{ourAgency.name} &nbsp;|&nbsp; {ourAgency.phone}</span>
                <span className="font-mono text-slate-500">Ref: {candidate.refNo}</span>
                <span>Date: {new Date(candidate.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Page 2 Break */}
            <div className="page-break"></div>

            {/* Page 2 */}
            <div className="min-h-[297mm] flex flex-col justify-between pb-8 pt-6">
              <div>
                <div className="text-center border-b border-indigo-900 pb-3 mb-6">
                  <h2 className="text-base font-black text-indigo-900 uppercase tracking-widest">PASSPORT ATTACHMENT</h2>
                  <div className="text-xs font-bold text-slate-500 mt-0.5" dir="rtl">وثيقة جواز السفر المرفقة</div>
                </div>

                <div className="space-y-6 flex flex-col items-center">
                  {/* Passport scan box */}
                  <div className="border border-slate-200 p-4 bg-slate-50/50 rounded-2xl w-full max-w-[550px] text-center">
                    <div className="text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider">Biometric Passport Page / جواز السفر</div>
                    <img 
                      src={candidate.passportScanUrl || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=800&h=500"} 
                      alt="Passport scan" 
                      className="max-h-[300px] max-w-full rounded-xl mx-auto border border-slate-200 object-contain shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Page 2 Footer */}
              <div className="text-[9px] font-bold text-slate-400 border-t border-slate-150 pt-2 flex justify-between mt-8">
                <span>{ourAgency.name} &nbsp;|&nbsp; {ourAgency.phone}</span>
                <span className="font-mono text-slate-500">Ref: {candidate.refNo}</span>
                <span>Date: {new Date(candidate.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
