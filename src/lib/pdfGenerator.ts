import { jsPDF } from "jspdf";
import { Candidate, Country, Agency } from "../types";
import { getArabicValue } from "./translate";
// @ts-ignore
import reshaper from "arabic-persian-reshaper";

const reverseString = (str: string) => str.split("").reverse().join("");

function prepareArabicText(text: string): string {
  if (!text) return "";
  try {
    const hasArabic = /[\u0600-\u06FF]/.test(text);
    if (!hasArabic) return text;
    
    let shaped = text;
    // @ts-ignore
    if (reshaper) {
      // @ts-ignore
      if (reshaper.ArabicShaper && typeof reshaper.ArabicShaper.convertArabic === "function") {
        // @ts-ignore
        shaped = reshaper.ArabicShaper.convertArabic(text);
      } else // @ts-ignore
      if (typeof reshaper.convertArabic === "function") {
        // @ts-ignore
        shaped = reshaper.convertArabic(text);
      } else // @ts-ignore
      if (typeof reshaper.convert === "function") {
        // @ts-ignore
        shaped = reshaper.convert(text);
      } else {
        console.warn("arabic-persian-reshaper did not provide a known conversion function", reshaper);
      }
    }
    return reverseString(shaped);
  } catch (err) {
    console.error("Failed to reshape Arabic text:", text, err);
    return text;
  }
}

function getArabicLabel(label: string): string {
  const map: { [key: string]: string } = {
    "Ref. No": "رقم المرجع",
    "Salary": "الراتب",
    "Contract Period": "مدة العقد",
    "Nationality": "الجنسية",
    "Religion": "الديانة",
    "Date of Birth": "تاريخ الميلاد",
    "Place of Birth": "مكان الميلاد",
    "Age": "العمر",
    "Marital Status": "الحالة الاجتماعية",
    "No. of Children": "عدد الأطفال",
    "Weight": "الوزن",
    "Height": "الطول",
    "Education": "التعليم",
    "Phone No.": "رقم الهاتف",
    "Passport No.": "رقم جواز السفر",
    "Date of Issue": "تاريخ الإصدار",
    "Date of Expiry": "تاريخ الانتهاء",
    "Amharic": "الأمهرية",
    "Arabic": "العربية",
    "English": "الإنجليزية",
    "Position": "المهنة",
    "Duration": "المدة",
    "Country": "البلد",
  };
  if (label.startsWith("Salary")) {
    return "الراتب";
  }
  return map[label] || "";
}

function getChildrenArabic(num: number | string): string {
  const n = Number(num);
  if (isNaN(n) || n <= 0) return "لا يوجد";
  if (n === 1) return "طفل واحد";
  if (n === 2) return "طفلان";
  if (n >= 3 && n <= 10) {
    const mapAr: {[key: number]: string} = {
      3: "ثلاثة", 4: "أربعة", 5: "خمسة", 6: "ستة", 7: "سبعة", 8: "ثمانية", 9: "تسعة", 10: "عشرة"
    };
    return `${mapAr[n] || n} أطفال`;
  }
  return `${n} طفل`;
}

function drawBilingualText(
  doc: jsPDF,
  enText: string,
  arText: string,
  leftX: number,
  rightX: number,
  y: number,
  isBold = false,
  fontSize = 7.5,
  fontFamily = "helvetica",
  textColorRGB = [30, 27, 75]
) {
  doc.setFont(fontFamily, isBold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(textColorRGB[0], textColorRGB[1], textColorRGB[2]);
  
  if (enText) {
    doc.text(enText, leftX, y);
  }
  
  if (arText && fontFamily === "Tajawal") {
    const preparedAr = prepareArabicText(arText);
    doc.text(preparedAr, rightX, y, { align: "right" });
  }
}

let fontsCache: { reg: string; bold: string } | null = null;

async function loadFonts(doc: jsPDF): Promise<boolean> {
  try {
    if (doc.existsFileInVFS("Tajawal-Regular.ttf")) {
      return true;
    }
    
    if (fontsCache) {
      doc.addFileToVFS("Tajawal-Regular.ttf", fontsCache.reg);
      doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");
      doc.addFileToVFS("Tajawal-Bold.ttf", fontsCache.bold);
      doc.addFont("Tajawal-Bold.ttf", "Tajawal", "bold");
      return true;
    }

    // Direct CORS-friendly URLs
    const regUrls = [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf",
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Regular.ttf"
    ];
    const boldUrls = [
      "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf",
      "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/tajawal/Tajawal-Bold.ttf"
    ];

    let regRes: Response | null = null;
    let boldRes: Response | null = null;

    // Try primary, fall back to secondary
    for (let i = 0; i < regUrls.length; i++) {
      try {
        const r = await fetch(regUrls[i]);
        if (r.ok) {
          regRes = r;
          break;
        }
      } catch (e) {
        console.warn(`Failed to fetch Regular font from ${regUrls[i]}`, e);
      }
    }

    for (let i = 0; i < boldUrls.length; i++) {
      try {
        const b = await fetch(boldUrls[i]);
        if (b.ok) {
          boldRes = b;
          break;
        }
      } catch (e) {
        console.warn(`Failed to fetch Bold font from ${boldUrls[i]}`, e);
      }
    }

    if (!regRes || !boldRes) {
      throw new Error("Failed to fetch Tajawal fonts from all CDN providers.");
    }

    const [regBuf, boldBuf] = await Promise.all([
      regRes.arrayBuffer(),
      boldRes.arrayBuffer()
    ]);

    const toBase64 = (buf: ArrayBuffer) => {
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    };

    const regBase64 = toBase64(regBuf);
    const boldBase64 = toBase64(boldBuf);

    fontsCache = { reg: regBase64, bold: boldBase64 };

    doc.addFileToVFS("Tajawal-Regular.ttf", regBase64);
    doc.addFont("Tajawal-Regular.ttf", "Tajawal", "normal");

    doc.addFileToVFS("Tajawal-Bold.ttf", boldBase64);
    doc.addFont("Tajawal-Bold.ttf", "Tajawal", "bold");

    return true;
  } catch (err) {
    console.warn("Dynamic font loading failed, using fallback:", err);
    return false;
  }
}

interface ImageResult {
  base64: string;
  width: number;
  height: number;
}

/**
 * Safely converts an image URL to a base64 Data URL and retrieves its natural dimensions.
 * Falls back to null if there are CORS, network, or format errors.
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<ImageResult | null> {
  if (!imageUrl) return null;
  try {
    // If it's already a base64 data URL, bypass fetch entirely
    if (imageUrl.startsWith("data:")) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            base64: imageUrl,
            width: img.naturalWidth || img.width || 300,
            height: img.naturalHeight || img.height || 300,
          });
        };
        img.onerror = () => {
          resolve({ base64: imageUrl, width: 300, height: 300 });
        };
        img.src = imageUrl;
      });
    }

    // Attempt to fetch via proxy first to guarantee CORS bypass and bypass caching
    try {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.base64) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              resolve({
                base64: json.base64,
                width: img.naturalWidth || img.width || 300,
                height: img.naturalHeight || img.height || 300,
              });
            };
            img.onerror = () => {
              resolve({ base64: json.base64, width: 300, height: 300 });
            };
            img.src = json.base64;
          });
        }
      }
    } catch (proxyErr) {
      console.warn("Proxy fetch failed, trying direct fetch fallback:", proxyErr);
    }

    // Direct fetch fallback with cache: "no-store"
    const res = await fetch(imageUrl, { mode: "cors", cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const base64: string = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });

    if (!base64) return null;

    // Load into HTMLImageElement to read natural width & height
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          base64,
          width: img.naturalWidth || img.width || 300,
          height: img.naturalHeight || img.height || 300,
        });
      };
      img.onerror = () => {
        resolve({ base64, width: 300, height: 300 });
      };
      img.src = base64;
    });
  } catch (error) {
    console.warn("Could not convert image to Base64:", imageUrl, error);
    return null;
  }
}

/**
 * Draws an image contained within a target bounding box, preserving its natural aspect ratio.
 */
function drawImageContained(
  doc: jsPDF,
  imgResult: ImageResult,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
) {
  const imgRatio = imgResult.width / imgResult.height;
  const boxRatio = boxW / boxH;

  let drawW = boxW;
  let drawH = boxH;
  let drawX = boxX;
  let drawY = boxY;

  if (imgRatio > boxRatio) {
    // Image is wider than box aspect ratio -> constrain by width
    drawW = boxW;
    drawH = boxW / imgRatio;
    drawY = boxY + (boxH - drawH) / 2;
  } else {
    // Image is taller than box aspect ratio -> constrain by height
    drawH = boxH;
    drawW = boxH * imgRatio;
    drawX = boxX + (boxW - drawW) / 2;
  }

  // Dynamically detect the correct image format from base64 MIME type to prevent jsPDF draw crashes
  let imgFormat = "JPEG";
  if (imgResult.base64.startsWith("data:image/png") || imgResult.base64.startsWith("data:image/PNG")) {
    imgFormat = "PNG";
  } else if (imgResult.base64.startsWith("data:image/webp") || imgResult.base64.startsWith("data:image/WEBP")) {
    imgFormat = "WEBP";
  } else if (imgResult.base64.startsWith("data:image/gif") || imgResult.base64.startsWith("data:image/GIF")) {
    imgFormat = "GIF";
  }

  try {
    doc.addImage(imgResult.base64, imgFormat, drawX, drawY, drawW, drawH, undefined, "FAST");
  } catch (e) {
    console.error("Failed to add image to PDF:", e);
  }
}

interface GeneratePdfOptions {
  candidate: Candidate;
  country: Country | null;
  agency: Agency | null;
  ourAgency: { name: string; address: string; phone: string };
}

export async function generateCandidatePdf({
  candidate,
  country,
  agency,
  ourAgency,
}: GeneratePdfOptions): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const fontsLoaded = await loadFonts(doc);
  const fontFamily = fontsLoaded ? "Tajawal" : "helvetica";

  // A4 dimensions: 210 x 297 mm
  const marginX = 15;
  const contentWidth = 180; // 210 - 2 * 15

  // -------------------------------------------------------------
  // Load Images asynchronously with dimension loading
  // -------------------------------------------------------------
  const [profileResult, fullBodyResult, passportResult, qrResult] = await Promise.all([
    getBase64ImageFromUrl(candidate.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500"),
    getBase64ImageFromUrl(candidate.fullBodyPhotoUrl || candidate.photoUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=500"),
    getBase64ImageFromUrl(candidate.passportScanUrl || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&q=80&w=800&h=500"),
    candidate.videoUrl && candidate.videoUrl.trim() !== ""
      ? getBase64ImageFromUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(candidate.videoUrl)}`
        )
      : Promise.resolve(null),
  ]);

  // =============================================================
  // PAGE 1: CV Information Page
  // =============================================================

  // --- HEADER SECTION ---
  // Background/Decorative line
  doc.setDrawColor(30, 27, 75); // Dark Navy/Indigo
  doc.setLineWidth(1.2);
  doc.line(marginX, 32, marginX + contentWidth, 32);

  // Left side: Our Agency details
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75); // Dark Indigo
  doc.text(ourAgency.name, marginX, 18);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate Gray
  doc.text(`${ourAgency.address}\nPhone: ${ourAgency.phone}`, marginX, 23);

  // Right side: Partner Agency details
  const partnerName = agency?.name || "Overseas Agency Partner";
  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(30, 27, 75);
    const partnerNameAr = agency?.nameArabic || "مكتب الاستقدام الشريك";
    doc.text(prepareArabicText(partnerNameAr), marginX + contentWidth, 15, { align: "right" });

    doc.setFont("Tajawal", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(partnerName, marginX + contentWidth, 20, { align: "right" });

    doc.setFont("Tajawal", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const partnerPhone = agency?.phone ? `Phone: ${agency.phone}` : "";
    doc.text(partnerPhone, marginX + contentWidth, 24, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 27, 75);
    doc.text(partnerName, marginX + contentWidth, 18, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const partnerPhone = agency?.phone ? `Phone: ${agency.phone}` : "";
    doc.text(partnerPhone, marginX + contentWidth, 23, { align: "right" });
  }

  // --- CANDIDATE TOP SECTION ---
  let topY = 37;

  const profileX = marginX;
  const profileY = topY;
  const profileW = 24;
  const profileH = 24;

  // Background frame for profile photo
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(profileX, profileY, profileW, profileH, "FD");

  if (profileResult) {
    drawImageContained(doc, profileResult, profileX + 1, profileY + 1, profileW - 2, profileH - 2);
  } else {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("PROFILE", profileX + profileW / 2, profileY + profileH / 2 + 1, { align: "center" });
  }

  // Name & Position details box - STACKED layout to prevent any overlapping
  const nameBoxX = profileX + profileW + 5;
  const nameBoxW = contentWidth - (profileW + 5);
  const nameBoxH = 24;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(nameBoxX, topY, nameBoxW, nameBoxH, "FD");

  // Name details (Stacked to prevent overlap)
  drawBilingualText(doc, "CANDIDATE FULL NAME", "الاسم الكامل للمرشح", nameBoxX + 5, nameBoxX + nameBoxW - 5, topY + 6, true, 7.5, fontFamily, [100, 116, 139]);

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text(candidate.name.toUpperCase(), nameBoxX + 5, topY + 11, { maxWidth: nameBoxW - 10 });

  // Divider line
  doc.setDrawColor(241, 245, 249);
  doc.line(nameBoxX, topY + 13.5, nameBoxX + nameBoxW, topY + 13.5);

  // Position details (Stacked to prevent overlap)
  drawBilingualText(doc, "APPLIED POSITION", "الوظيفة المطلوبة", nameBoxX + 5, nameBoxX + nameBoxW - 5, topY + 18, true, 7.5, fontFamily, [100, 116, 139]);

  const posEn = candidate.position.toUpperCase();
  const posAr = getArabicValue("position", candidate.position);
  drawBilingualText(doc, posEn, posAr, nameBoxX + 5, nameBoxX + nameBoxW - 5, topY + 23, true, 9.5, fontFamily, [15, 23, 42]);

  // --- VIDEO BLOCK SECTION (Conditional) ---
  let bodyY = topY + nameBoxH + 5;

  if (candidate.videoUrl && candidate.videoUrl.trim() !== "") {
    const videoBoxH = 18;
    doc.setFillColor(240, 253, 250); // Emerald 50 (Soft, premium background)
    doc.setDrawColor(16, 185, 129); // Emerald 500
    doc.setLineWidth(0.4);
    doc.rect(marginX, bodyY, contentWidth, videoBoxH, "FD");

    if (qrResult) {
      drawImageContained(doc, qrResult, marginX + 3, bodyY + 1.5, 15, 15);
    }

    drawBilingualText(doc, "CANDIDATE VIDEO PROFILE", "فيديو التعريف الذاتي للمرشح", marginX + 21, marginX + contentWidth - 5, bodyY + 6, true, 8.5, fontFamily, [6, 95, 70]);

    if (fontFamily === "Tajawal") {
      drawBilingualText(doc, "Scan QR code with a smartphone to view video.", "امسح رمز الاستجابة السريعة لمشاهدة الفيديو الخاص بالمرشح.", marginX + 21, marginX + contentWidth - 5, bodyY + 10, false, 7, fontFamily, [4, 120, 87]);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(4, 120, 87);
      doc.text("Scan QR code with a smartphone camera to view the candidate's active self-introduction video.", marginX + 21, bodyY + 10);
    }

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(7);
    doc.setTextColor(30, 27, 75);
    doc.text(candidate.videoUrl, marginX + 21, bodyY + 14, { maxWidth: contentWidth - 25 });

    bodyY += videoBoxH + 5;
  }

  // --- BIOGRAPHICAL DETAILS TABLE & FULL-BODY PHOTO SIDE-BY-SIDE ---
  const leftColW = 118;
  const rightColX = marginX + leftColW + 6;
  const rightColW = contentWidth - (leftColW + 6); // 56mm

  // 1. Applicant Details Header
  const tableHeaderH = 6;
  doc.setFillColor(30, 27, 75);
  doc.rect(marginX, bodyY, leftColW, tableHeaderH, "F");

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("APPLICANT BIOGRAPHICAL DETAILS", marginX + 4, bodyY + 4.2);
    doc.text(prepareArabicText("البيانات الشخصية للمرشح"), marginX + leftColW - 4, bodyY + 4.2, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("APPLICANT BIOGRAPHICAL DETAILS", marginX + 4, bodyY + 4);
  }

  // Table rows
  const getBilingualValueSafe = (field: string, val: any): string => {
    return getArabicValue(field as any, val);
  };

  const salaryText = `${candidate.salary} ${country?.currency || "SAR"}`;
  const bioRows = [
    { labelEn: "Ref. No", labelAr: "رقم المرجع", valEn: candidate.refNo, valAr: "" },
    { 
      labelEn: `Salary (${country?.currency || "SAR"})`, 
      labelAr: `الراتب (${getArabicValue("currency", country?.currency || "SAR")})`, 
      valEn: salaryText, 
      valAr: `${candidate.salary} ريال` 
    },
    { 
      labelEn: "Contract Period", 
      labelAr: "مدة العقد", 
      valEn: candidate.contractPeriod, 
      valAr: getBilingualValueSafe("contractPeriod", candidate.contractPeriod) 
    },
    { 
      labelEn: "Nationality", 
      labelAr: "الجنسية", 
      valEn: candidate.nationality, 
      valAr: getBilingualValueSafe("nationality", candidate.nationality) 
    },
    { 
      labelEn: "Religion", 
      labelAr: "الديانة", 
      valEn: candidate.religion, 
      valAr: getBilingualValueSafe("religion", candidate.religion) 
    },
    { 
      labelEn: "Date of Birth", 
      labelAr: "تاريخ الميلاد", 
      valEn: candidate.dob, 
      valAr: "" 
    },
    { 
      labelEn: "Place of Birth", 
      labelAr: "مكان الميلاد", 
      valEn: candidate.birthPlace, 
      valAr: getBilingualValueSafe("birthPlace", candidate.birthPlace) || candidate.birthPlace 
    },
    { 
      labelEn: "Age", 
      labelAr: "العمر", 
      valEn: `${candidate.age} Years`, 
      valAr: `${candidate.age} سنة` 
    },
    { 
      labelEn: "Marital Status", 
      labelAr: "الحالة الاجتماعية", 
      valEn: candidate.maritalStatus, 
      valAr: getBilingualValueSafe("maritalStatus", candidate.maritalStatus) 
    },
    { 
      labelEn: "No. of Children", 
      labelAr: "عدد الأطفال", 
      valEn: String(candidate.numChildren), 
      valAr: getChildrenArabic(candidate.numChildren) 
    },
    { 
      labelEn: "Weight", 
      labelAr: "الوزن", 
      valEn: `${candidate.weightKg} KG`, 
      valAr: `${candidate.weightKg} كجم` 
    },
    { 
      labelEn: "Height", 
      labelAr: "الطول", 
      valEn: `${candidate.heightCm} CM`, 
      valAr: `${candidate.heightCm} سم` 
    },
    { 
      labelEn: "Education", 
      labelAr: "التعليم", 
      valEn: candidate.education, 
      valAr: getBilingualValueSafe("education", candidate.education) 
    },
    { 
      labelEn: "Phone No.", 
      labelAr: "رقم الهاتف", 
      valEn: candidate.phone, 
      valAr: "" 
    },
  ];

  let currentY = bodyY + tableHeaderH;
  const rowH = 4.8;

  doc.setLineWidth(0.15);
  doc.setDrawColor(226, 232, 240);

  bioRows.forEach((row, i) => {
    // Zebra background
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(marginX, currentY, leftColW, rowH, "FD");

    // Key cell
    drawBilingualText(doc, row.labelEn, row.labelAr, marginX + 3, marginX + 42, currentY + 3.2, true, 7.5, fontFamily, [71, 85, 105]);

    // Value cell
    drawBilingualText(doc, row.valEn, row.valAr, marginX + 45, marginX + leftColW - 3, currentY + 3.2, true, 7.5, fontFamily, [30, 27, 75]);

    currentY += rowH;
  });

  // 2. Passport Details Header
  const passportTableY = currentY + 4;
  doc.setFillColor(30, 27, 75);
  doc.rect(marginX, passportTableY, leftColW, tableHeaderH, "F");

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PASSPORT & TRAVEL DETAILS", marginX + 4, passportTableY + 4.2);
    doc.text(prepareArabicText("بيانات جواز السفر والسفر"), marginX + leftColW - 4, passportTableY + 4.2, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PASSPORT & TRAVEL DETAILS", marginX + 4, passportTableY + 4);
  }

  const passportRows = [
    { labelEn: "Passport No.", labelAr: "رقم جواز السفر", valEn: candidate.passportNo.toUpperCase(), valAr: "" },
    { labelEn: "Date of Issue", labelAr: "تاريخ الإصدار", valEn: candidate.passportIssueDate, valAr: "" },
    { labelEn: "Date of Expiry", labelAr: "تاريخ الانتهاء", valEn: candidate.passportExpiryDate, valAr: "" },
  ];

  currentY = passportTableY + tableHeaderH;
  passportRows.forEach((row, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(marginX, currentY, leftColW, rowH, "FD");

    // Key cell
    drawBilingualText(doc, row.labelEn, row.labelAr, marginX + 3, marginX + 42, currentY + 3.2, true, 7.5, fontFamily, [71, 85, 105]);

    // Value cell
    drawBilingualText(doc, row.valEn, row.valAr, marginX + 45, marginX + leftColW - 3, currentY + 3.2, true, 7.5, fontFamily, [30, 27, 75]);

    currentY += rowH;
  });

  // 3. Full-Body Portrait Photo on Right Side (Beautifully contained, no vertical stretching!)
  const portraitY = bodyY;
  const portraitH = currentY - bodyY; // Matches table height exactly!

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(rightColX, portraitY, rightColW, portraitH, "FD");

  if (fullBodyResult) {
    // Leave space at bottom for caption
    drawImageContained(doc, fullBodyResult, rightColX + 1.5, portraitY + 1.5, rightColW - 3, portraitH - 8);
  } else {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("PORTRAIT PHOTO", rightColX + rightColW / 2, portraitY + portraitH / 2, { align: "center" });
  }

  // Caption at bottom of portrait photo
  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(prepareArabicText("الصورة الكاملة للمرشح"), rightColX + rightColW / 2, portraitY + portraitH - 4.5, { align: "center" });
    doc.setFontSize(6.5);
    doc.text("Full-Body Portrait", rightColX + rightColW / 2, portraitY + portraitH - 1.5, { align: "center" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Full-Body Portrait", rightColX + rightColW / 2, portraitY + portraitH - 3.5, {
      align: "center",
    });
  }

  // --- LOWER BLOCKS (Languages, Experience & Household Skills) ---
  let lowerY = currentY + 5;

  const sectionHeaderW = contentWidth / 2 - 2;

  // Column A: Languages
  doc.setFillColor(30, 27, 75);
  doc.rect(marginX, lowerY, sectionHeaderW, tableHeaderH, "F");
  
  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("LANGUAGE PROFICIENCY", marginX + 3, lowerY + 4.2);
    doc.text(prepareArabicText("إتقان اللغات"), marginX + sectionHeaderW - 3, lowerY + 4.2, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("LANGUAGE PROFICIENCY", marginX + 4, lowerY + 4);
  }

  let subY = lowerY + tableHeaderH;
  // Sub headers
  doc.setFillColor(241, 245, 249);
  doc.rect(marginX, subY, sectionHeaderW, rowH, "FD");

  if (fontFamily === "Tajawal") {
    drawBilingualText(doc, "Amharic", "الأمهرية", marginX + 3, marginX + 27, subY + 3.2, true, 6.5, fontFamily, [100, 116, 139]);
    drawBilingualText(doc, "Arabic", "العربية", marginX + 30, marginX + 54, subY + 3.2, true, 6.5, fontFamily, [100, 116, 139]);
    drawBilingualText(doc, "English", "الإنجليزية", marginX + 57, marginX + 83, subY + 3.2, true, 6.5, fontFamily, [100, 116, 139]);
  } else {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Amharic", marginX + 3, subY + 3.2);
    doc.text("Arabic", marginX + 30, subY + 3.2);
    doc.text("English", marginX + 57, subY + 3.2);
  }

  subY += rowH;
  // Values
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, subY, sectionHeaderW, rowH, "FD");

  const amharicVal = candidate.languages.amharic || "None";
  const amharicAr = getArabicValue("languages", amharicVal);

  const arabicVal = candidate.languages.arabic || "None";
  const arabicAr = getArabicValue("languages", arabicVal);

  const englishVal = candidate.languages.english || "None";
  const englishAr = getArabicValue("languages", englishVal);

  if (fontFamily === "Tajawal") {
    drawBilingualText(doc, amharicVal, amharicAr, marginX + 3, marginX + 27, subY + 3.2, true, 6.5, fontFamily, [30, 27, 75]);
    drawBilingualText(doc, arabicVal, arabicAr, marginX + 30, marginX + 54, subY + 3.2, true, 6.5, fontFamily, [30, 27, 75]);
    drawBilingualText(doc, englishVal, englishAr, marginX + 57, marginX + 83, subY + 3.2, true, 6.5, fontFamily, [30, 27, 75]);
  } else {
    doc.setFontSize(7.5);
    doc.setTextColor(30, 27, 75);
    doc.text(amharicVal, marginX + 3, subY + 3.2, { maxWidth: 24 });
    doc.text(arabicVal, marginX + 30, subY + 3.2, { maxWidth: 24 });
    doc.text(englishVal, marginX + 57, subY + 3.2, { maxWidth: 24 });
  }

  // Column B: Work Experience
  const colBX = marginX + sectionHeaderW + 4;
  doc.setFillColor(30, 27, 75);
  doc.rect(colBX, lowerY, sectionHeaderW, tableHeaderH, "F");

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PRIOR WORK EXPERIENCE", colBX + 3, lowerY + 4.2);
    doc.text(prepareArabicText("الخبرات العملية السابقة"), colBX + sectionHeaderW - 3, lowerY + 4.2, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PRIOR WORK EXPERIENCE", colBX + 4, lowerY + 4);
  }

  let subY2 = lowerY + tableHeaderH;
  // Sub headers
  doc.setFillColor(241, 245, 249);
  doc.rect(colBX, subY2, sectionHeaderW, rowH, "FD");

  if (fontFamily === "Tajawal") {
    drawBilingualText(doc, "Position", "المهنة", colBX + 3, colBX + 29, subY2 + 3.2, true, 6.5, fontFamily, [100, 116, 139]);
    drawBilingualText(doc, "Duration", "المدة", colBX + 32, colBX + 54, subY2 + 3.2, true, 6.5, fontFamily, [100, 116, 139]);
    drawBilingualText(doc, "Country", "البلد", colBX + 58, colBX + 83, subY2 + 3.2, true, 6.5, fontFamily, [100, 116, 139]);
  } else {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("Position", colBX + 3, subY2 + 3.2);
    doc.text("Duration", colBX + 32, subY2 + 3.2);
    doc.text("Country", colBX + 58, subY2 + 3.2);
  }

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
    subY2 += rowH;
    doc.setFillColor(255, 255, 255);
    doc.rect(colBX, subY2, sectionHeaderW, rowH, "FD");

    if (fontFamily === "Tajawal") {
      drawBilingualText(doc, "No Prior Experience", "لا توجد خبرة سابقة", colBX + 3, colBX + sectionHeaderW - 3, subY2 + 3.2, false, 7, fontFamily, [100, 116, 139]);
    } else {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("No Prior Experience", colBX + 3, subY2 + 3.2);
    }
  } else {
    // Limit to max 3 entries on page 1 layout, to guarantee no overlaps
    experiences.slice(0, 3).forEach((exp) => {
      subY2 += rowH;
      doc.setFillColor(255, 255, 255);
      doc.rect(colBX, subY2, sectionHeaderW, rowH, "FD");

      const posE = exp.position || "N/A";
      const posA = getArabicValue("position", posE);

      const durE = exp.years || "N/A";
      const durA = getArabicValue("contractPeriod", durE);

      const ctryE = exp.previousCountry || "N/A";
      const ctryA = getArabicValue("nationality", ctryE);

      if (fontFamily === "Tajawal") {
        drawBilingualText(doc, posE, posA, colBX + 3, colBX + 29, subY2 + 3.2, true, 6.5, fontFamily, [30, 27, 75]);
        drawBilingualText(doc, durE, durA, colBX + 32, colBX + 54, subY2 + 3.2, true, 6.5, fontFamily, [30, 27, 75]);
        drawBilingualText(doc, ctryE, ctryA, colBX + 58, colBX + 83, subY2 + 3.2, true, 6.5, fontFamily, [30, 27, 75]);
      } else {
        doc.setFontSize(7.5);
        doc.setTextColor(30, 27, 75);
        doc.text(posE, colBX + 3, subY2 + 3.2, { maxWidth: 26 });
        doc.text(durE, colBX + 32, subY2 + 3.2, { maxWidth: 23 });
        doc.text(ctryE, colBX + 58, subY2 + 3.2, { maxWidth: 27 });
      }
    });
  }

  // Set the start coordinate of the next row (Skills) so there is no overlapping
  const colA_bottom = subY + rowH;
  const colB_bottom = subY2 + rowH;
  lowerY = Math.max(colA_bottom, colB_bottom) + 4;

  // 3. Skills Badge Row - Intelligent multi-row wrap and auto-scaled container height
  doc.setFillColor(30, 27, 75);
  doc.rect(marginX, lowerY, contentWidth, tableHeaderH, "F");

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("HOUSEHOLD COMPETENCE & CERTIFIED SKILLS", marginX + 4, lowerY + 4.2);
    doc.text(prepareArabicText("المهارات والقدرات المنزلية المعتمدة"), marginX + contentWidth - 4, lowerY + 4.2, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("HOUSEHOLD COMPETENCE & CERTIFIED SKILLS", marginX + 4, lowerY + 4);
  }

  const skillBoxY = lowerY + tableHeaderH;

  // Filter out and clean checked skills
  const skillsList: string[] = [];
  if (candidate.skills.cleaning) skillsList.push("Cleaning");
  if (candidate.skills.babySitting) skillsList.push("Baby Sitting");
  if (candidate.skills.laundry) skillsList.push("Laundry");
  if (candidate.skills.housekeeping) skillsList.push("Housekeeping");
  if (candidate.skills.ironing) skillsList.push("Ironing");
  if (candidate.skills.childCare) skillsList.push("Child Care");

  if (skillsList.length === 0) {
    skillsList.push("General Domestic Work");
  }

  const getArabicSkill = (skill: string): string => {
    const map: {[key: string]: string} = {
      "Cleaning": "التنظيف",
      "Baby Sitting": "رعاية رضع",
      "Laundry": "الغسيل",
      "Housekeeping": "ترتيب المنزل",
      "Ironing": "الكي",
      "Child Care": "رعاية الأطفال",
      "General Domestic Work": "العمل المنزلي العام"
    };
    return map[skill] || skill;
  };

  const skillsListBilingual = skillsList.map(skill => {
    if (fontFamily === "Tajawal") {
      return `${skill} / ${getArabicSkill(skill)}`;
    }
    return skill;
  });

  // Pre-calculate wrapped badges layout and dynamic box height
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(fontFamily === "Tajawal" ? 6.5 : 7.5);
  let tempX = marginX + 4;
  let tempRows = 1;
  const maxBadgeX = marginX + contentWidth - 4;
  const badgeH = 5.5;
  const badgeSpacing = 2;

  skillsListBilingual.forEach((skillText) => {
    let preparedText = skillText;
    if (fontFamily === "Tajawal" && skillText.includes(" / ")) {
      const parts = skillText.split(" / ");
      preparedText = `${parts[0]} / ${prepareArabicText(parts[1])}`;
    }
    
    const textWidth = doc.getTextWidth(preparedText);
    const badgeW = textWidth + 6;
    if (tempX + badgeW > maxBadgeX) {
      tempX = marginX + 4;
      tempRows++;
    }
    tempX += badgeW + 3;
  });

  const skillBoxH = Math.max(12, tempRows * badgeH + (tempRows - 1) * badgeSpacing + 6);

  // Draw background box for badges
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, skillBoxY, contentWidth, skillBoxH, "FD");

  // Draw wrapped badges
  let badgeX = marginX + 4;
  let badgeY = skillBoxY + 3;

  skillsListBilingual.forEach((skillText) => {
    let preparedText = skillText;
    if (fontFamily === "Tajawal" && skillText.includes(" / ")) {
      const parts = skillText.split(" / ");
      preparedText = `${parts[0]} / ${prepareArabicText(parts[1])}`;
    }

    const textWidth = doc.getTextWidth(preparedText);
    const badgeW = textWidth + 6;

    if (badgeX + badgeW > maxBadgeX) {
      badgeX = marginX + 4;
      badgeY += badgeH + badgeSpacing;
    }

    doc.setFillColor(224, 231, 255); // Indigo 100
    doc.setDrawColor(165, 180, 252); // Indigo 300
    doc.rect(badgeX, badgeY, badgeW, badgeH, "FD");

    doc.setTextColor(49, 46, 129); // Indigo 900
    doc.text(preparedText, badgeX + 3, badgeY + 3.8);

    badgeX += badgeW + 3;
  });

  // --- OPTIONAL CANDIDATE REVIEW SECTION ---
  if (candidate.reviewEn || candidate.reviewAr) {
    const reviewY = skillBoxY + skillBoxH + 4;
    const reviewBoxH = 22; // Keep it thin, spacious, and extremely clean

    // Outer border container
    doc.setFillColor(248, 250, 252); // slate 50
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(0.3);
    doc.rect(marginX, reviewY, contentWidth, reviewBoxH, "FD");

    // Side accent bar
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(marginX, reviewY, 1.5, reviewBoxH, "F");

    // Header label
    drawBilingualText(doc, "AGENCY EVALUATION & EVALUATIVE REVIEW", "تقييم وتوصية مكتب الاستقدام", marginX + 4, marginX + contentWidth - 4, reviewY + 4, true, 7.5, fontFamily, [30, 27, 75]);

    // Text content - English
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105); // slate 600
    if (candidate.reviewEn) {
      doc.text(candidate.reviewEn, marginX + 4, reviewY + 8, {
        maxWidth: contentWidth - 8,
      });
    }

    // Text content - Arabic
    if (candidate.reviewAr && fontFamily === "Tajawal") {
      const preparedAr = prepareArabicText(candidate.reviewAr);
      doc.setFont(fontFamily, "normal");
      doc.text(preparedAr, marginX + contentWidth - 4, reviewY + 15, {
        align: "right",
        maxWidth: contentWidth - 8,
      });
    }
  }

  // --- PAGE 1 FOOTER ---
  const footerY = 286;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, footerY, marginX + contentWidth, footerY);

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${ourAgency.name}   |   ${ourAgency.phone}`, marginX, footerY + 4);
  doc.text(`Candidate Ref: ${candidate.refNo}`, marginX + contentWidth / 2, footerY + 4, { align: "center" });
  doc.text(`Date: ${new Date(candidate.createdAt).toLocaleDateString()}`, marginX + contentWidth, footerY + 4, {
    align: "right",
  });

  // =============================================================
  // PAGE 2: Scanned Documents Page
  // =============================================================
  doc.addPage();

  // Decorative banner on Page 2
  doc.setDrawColor(30, 27, 75);
  doc.setLineWidth(1.2);
  doc.line(marginX, 32, marginX + contentWidth, 32);

  // Left header
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 27, 75);
  doc.text(ourAgency.name, marginX, 18);

  // Right Header
  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 27, 75);
    doc.text(prepareArabicText("نسخة جواز السفر والمرفقات"), marginX + contentWidth, 18, { align: "right" });
    
    doc.setFont("Tajawal", "normal");
    doc.setFontSize(7.5);
    doc.text(`Candidate Ref: ${candidate.refNo}`, marginX + contentWidth, 23, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 27, 75);
    doc.text("PASSPORT & ATTACHMENT SCANS", marginX + contentWidth, 18, { align: "right" });
  }

  let scanY = 37;

  // 1. Passport Scan Header
  doc.setFillColor(30, 27, 75);
  doc.rect(marginX, scanY, contentWidth, tableHeaderH, "F");

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("BIOMETRIC PASSPORT SCAN", marginX + 4, scanY + 4.2);
    doc.text(prepareArabicText("نسخة جواز السفر البيومتري"), marginX + contentWidth - 4, scanY + 4.2, { align: "right" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("BIOMETRIC PASSPORT SCAN", marginX + 4, scanY + 4);
  }

  scanY += tableHeaderH;
  const docBoxH = 105;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.rect(marginX, scanY, contentWidth, docBoxH, "FD");

  if (passportResult) {
    // Automatically center and contain passport image beautifully, no stretching!
    drawImageContained(doc, passportResult, marginX + 4, scanY + 4, contentWidth - 8, docBoxH - 8);
  } else {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("PASSPORT DOCUMENT ATTACHED", marginX + contentWidth / 2, scanY + docBoxH / 2, { align: "center" });
  }

  // 2. Staff Dispatch Verification Stamp
  scanY += docBoxH + 5;

  // Dynamic empty verification stamp container with beautiful styling
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(marginX, scanY, contentWidth, 30, "FD");

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("STAFF DISPATCH VERIFICATION STAMP", marginX + 4, scanY + 6);
    doc.text(prepareArabicText("ختم التحقق من الموظفين والمستندات"), marginX + contentWidth - 50, scanY + 6, { align: "right" });

    doc.setFont("Tajawal", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "All biographical data fields, passport sequences, and digital self-introductions in this document\nhave been standard-verified by the recruitment supervisor at local branch registries.",
      marginX + 4,
      scanY + 12
    );

    const verifiedAr = "تم التحقق من جميع حقول البيانات الشخصية وسجل جواز السفر وتفاصيل المرشح من قبل المشرف الاستقدام المحلي.";
    doc.text(
      prepareArabicText(verifiedAr),
      marginX + contentWidth - 50,
      scanY + 20,
      { align: "right" }
    );
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 27, 75);
    doc.text("STAFF DISPATCH VERIFICATION STAMP", marginX + 4, scanY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "All biographical data fields, passport sequences, and digital self-introductions in this document\nhave been standard-verified by the recruitment supervisor at local branch registries.",
      marginX + 4,
      scanY + 12
    );
  }

  // Double-lined, high-end verification stamp box
  doc.setDrawColor(129, 140, 248); // Indigo 400
  doc.setLineWidth(0.4);
  doc.rect(marginX + contentWidth - 45, scanY + 3, 40, 24);
  doc.setLineWidth(0.15);
  doc.rect(marginX + contentWidth - 44, scanY + 4, 38, 22);

  if (fontFamily === "Tajawal") {
    doc.setFont("Tajawal", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text(prepareArabicText("مكتب الاستقدام"), marginX + contentWidth - 25, scanY + 9, { align: "center" });
    doc.text("TAG RECRUITMENT", marginX + contentWidth - 25, scanY + 13, { align: "center" });
    doc.setFontSize(6);
    doc.text(prepareArabicText("معتمد رسمياً"), marginX + contentWidth - 25, scanY + 17, { align: "center" });
    doc.setFont("Tajawal", "normal");
    doc.setFontSize(5.5);
    doc.text(`ID: ${candidate.refNo}`, marginX + contentWidth - 25, scanY + 21, { align: "center" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text("TAG RECRUITMENT", marginX + contentWidth - 25, scanY + 10, { align: "center" });
    doc.text("OFFICIALLY VERIFIED", marginX + contentWidth - 25, scanY + 15, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(`ID: ${candidate.refNo}`, marginX + contentWidth - 25, scanY + 20, { align: "center" });
  }

  // --- PAGE 2 FOOTER ---
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginX, footerY, marginX + contentWidth, footerY);

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${ourAgency.name}   |   ${ourAgency.phone}`, marginX, footerY + 4);
  doc.text(`Candidate Ref: ${candidate.refNo}`, marginX + contentWidth / 2, footerY + 4, { align: "center" });
  doc.text(`Date: ${new Date(candidate.createdAt).toLocaleDateString()}`, marginX + contentWidth, footerY + 4, {
    align: "right",
  });

  return doc;
}
