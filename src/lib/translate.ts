export const arabicTranslations: { [key: string]: { [val: string]: string } } = {
  position: {
    "HOUSEMAID": "عاملة منزلية",
    "HOUSEWIFE": "ربة منزل",
    "NANNY": "مربية أطفال",
    "CAREGIVER": "مقدمة رعاية",
    "COOK": "طباخة",
    "CLEANER": "عاملة تنظيف",
    "Housemaid": "عاملة منزلية",
    "Nanny": "مربية أطفال",
    "Caregiver": "مقدمة رعاية",
    "Cook": "طباخة",
    "Cleaner": "عاملة تنظيف",
  },
  nationality: {
    "Ethiopian": "إثيوبية",
    "Kenyan": "كينية",
    "Ugandan": "أوغندية",
    "Burundian": "بوروندية",
    "Eritrean": "إريترية",
    "Filipino": "فلبينية",
    "Sri Lankan": "سريلانكية",
    "Indian": "هندية",
    "Bangladeshi": "بنجلاديشية",
    "ETHIOPIAN": "إثيوبية",
    "KENYAN": "كينية",
    "UGANDAN": "أوغندية",
    "BURUNDIAN": "بوروندية",
    "ERITREAN": "إريترية",
    "FILIPINO": "فلبينية",
    "SRI LANKAN": "سريلانكية",
    "INDIAN": "هندية",
    "BANGLADESHI": "بنجلاديشية",
  },
  religion: {
    "Christian": "مسيحية",
    "Muslim": "مسلمة",
    "Orthodox": "أرثوذكسية",
    "Catholic": "كاثوليكية",
    "Protestant": "بروتستانتية",
    "Hindu": "هندوسية",
    "CHRISTIAN": "مسيحية",
    "MUSLIM": "مسلمة",
    "Christianity": "مسيحية",
    "Islam": "مسلمة",
    "OTHER": "أخرى",
    "Other": "أخرى",
  },
  maritalStatus: {
    "Single": "عزباء",
    "Married": "متزوجة",
    "Divorced": "مطلقة",
    "Widowed": "أرملة",
    "SINGLE": "عزباء",
    "MARRIED": "متزوجة",
    "DIVORCED": "مطلقة",
    "WIDOWED": "أرملة",
  },
  education: {
    "High School": "ثانوية",
    "Middle School": "متوسط",
    "Primary School": "ابتدائي",
    "Elementary": "ابتدائي",
    "Junior High": "متوسط",
    "Grade 10": "الصف العاشر (ثانوية)",
    "Grade 12": "الصف الثاني عشر (ثانوية)",
    "Grade 8": "الصف الثامن (متوسط)",
    "Grade 6": "الصف السادس (ابتدائي)",
    "Primary": "ابتدائي",
    "Illiterate": "أمي / غير متعلم",
    "None": "بدون تعليم",
    "High school": "ثانوية",
    "Middle school": "متوسط",
    "Primary school": "ابتدائي",
    "HIGH SCHOOL": "ثانوية",
    "MIDDLE SCHOOL": "متوسط",
    "PRIMARY SCHOOL": "ابتدائي",
    "ILLITERATE": "أمي / غير متعلم",
    "NONE": "بدون تعليم",
  },
  contractPeriod: {
    "2 Years": "سنتين",
    "2 years": "سنتين",
    "Two Years": "سنتين",
    "1 Year": "سنة واحدة",
    "2 YEARS": "سنتين",
  },
  languages: {
    "Excellent": "ممتاز",
    "Good": "جيد",
    "None": "لا يوجد",
    "Basic": "مبتدئ",
    "EXCELLENT": "ممتاز",
    "GOOD": "جيد",
    "NONE": "لا يوجد",
    "BASIC": "مبتدئ",
  },
  birthPlace: {
    "Addis Ababa": "أديس أبابا",
    "ADDIS ABABA": "أديس أبابا",
    "Adama": "أداما",
    "ADAMA": "أداما",
    "Mekelle": "ميكيل",
    "MEKELLE": "ميكيل",
    "Awasa": "حواسا",
    "Hawassa": "حواسا",
    "AWASA": "حواسا",
    "HAWASSA": "حواسا",
    "Gondar": "غوندار",
    "GONDAR": "غوندار",
    "Dessie": "دسي",
    "DESSIE": "دسي",
    "Dire Dawa": "ديري داوا",
    "DIRE DAWA": "ديري داوا",
    "Nairobi": "نيروبي",
    "NAIROBI": "نيروبي",
    "Mombasa": "مومباسا",
    "MOMBASA": "مومباسا",
    "Kampala": "كامبالا",
    "KAMPALA": "كامبالا",
    "Bujumbura": "بوجومبورا",
    "BUJUMBURA": "بوجومبورا",
    "Asmara": "أسمرة",
    "ASMARA": "أسمرة",
  },
  currency: {
    "SAR": "ريال سعودي",
    "sar": "ريال سعودي",
    "AED": "درهم إماراتي",
    "aed": "درهم إماراتي",
    "QAR": "ريال قطري",
    "qar": "ريال قطري",
    "OMR": "ريال عماني",
    "omr": "ريال عماني",
    "BHD": "دينار بحريني",
    "bhd": "دينار بحريني",
    "KWD": "دينار كويتي",
    "kwd": "دينار كويتي",
    "USD": "دولار أمريكي",
    "usd": "دولار أمريكي",
  }
};

/**
 * Returns the Arabic translation for a candidate attribute value if defined.
 */
export function getArabicValue(field: string, val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  const valStr = String(val).trim();
  const fieldLower = field.toLowerCase();
  
  // Clean field key
  let categoryKey = fieldLower;
  if (fieldLower.includes("nationality")) categoryKey = "nationality";
  else if (fieldLower.includes("religion")) categoryKey = "religion";
  else if (fieldLower.includes("marital")) categoryKey = "maritalStatus";
  else if (fieldLower.includes("education")) categoryKey = "education";
  else if (fieldLower.includes("position")) categoryKey = "position";
  else if (fieldLower.includes("contract")) categoryKey = "contractPeriod";
  else if (fieldLower.includes("birthplace") || fieldLower.includes("birth place")) categoryKey = "birthPlace";
  else if (fieldLower.includes("currency")) categoryKey = "currency";
  else if (fieldLower.includes("language") || fieldLower === "amharic" || fieldLower === "arabic" || fieldLower === "english") categoryKey = "languages";

  if (arabicTranslations[categoryKey] && arabicTranslations[categoryKey][valStr]) {
    return arabicTranslations[categoryKey][valStr];
  }

  // Fallbacks/Patterns
  if (categoryKey === "languages") {
    const valLower = valStr.toLowerCase();
    if (valLower.includes("excellent")) return "ممتاز";
    if (valLower.includes("good")) return "جيد";
    if (valLower.includes("none")) return "لا يوجد";
    if (valLower.includes("basic")) return "مبتدئ";
  }

  if (categoryKey === "maritalStatus") {
    const valLower = valStr.toLowerCase();
    if (valLower === "single") return "عزباء";
    if (valLower === "married") return "متزوجة";
    if (valLower === "divorced") return "مطلقة";
    if (valLower === "widowed") return "أرملة";
  }

  if (categoryKey === "religion") {
    const valLower = valStr.toLowerCase();
    if (valLower.includes("christian")) return "مسيحية";
    if (valLower.includes("muslim")) return "مسلمة";
    if (valLower.includes("orthodox")) return "أرثوذكسية";
    if (valLower.includes("catholic")) return "كاثوليكية";
    if (valLower.includes("protestant")) return "بروتستانتية";
    if (valLower.includes("hindu")) return "هندوسية";
  }

  if (categoryKey === "nationality") {
    const valLower = valStr.toLowerCase();
    if (valLower.includes("ethiopia")) return "إثيوبية";
    if (valLower.includes("kenya")) return "كينية";
    if (valLower.includes("uganda")) return "أوغندية";
    if (valLower.includes("burundi")) return "بوروندية";
    if (valLower.includes("eritrea")) return "إريترية";
  }

  if (categoryKey === "birthPlace") {
    // If birthPlace is not in dictionary, we can try to guess or use Google Translate-like mapping
    const valLower = valStr.toLowerCase();
    if (valLower.includes("addis")) return "أديس أبابا";
    if (valLower.includes("adama")) return "أداما";
    if (valLower.includes("mekelle")) return "ميكيل";
    if (valLower.includes("hawassa") || valLower.includes("awasa")) return "حواسا";
    if (valLower.includes("gondar")) return "غوندار";
    if (valLower.includes("nairobi")) return "نيروبي";
    if (valLower.includes("kampala")) return "كامبالا";
  }

  return "";
}

/**
 * Returns a dual bilingual string "English / Arabic" if Arabic translation is available, or English only.
 */
export function getBilingualValue(field: string, val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  const valStr = String(val).trim();
  const arVal = getArabicValue(field, valStr);
  if (arVal) {
    return `${valStr} / ${arVal}`;
  }
  return valStr;
}

/**
 * Custom formatter for children count
 */
export function getChildrenBilingual(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === "") return "0 / لا يوجد";
  const n = Number(num);
  if (isNaN(n) || n <= 0) return "0 / لا يوجد";
  if (n === 1) return "1 / طفل واحد";
  if (n === 2) return "2 / طفلان";
  if (n >= 3 && n <= 10) {
    const mapAr: {[key: number]: string} = {
      3: "ثلاثة", 4: "أربعة", 5: "خمسة", 6: "ستة", 7: "سبعة", 8: "ثمانية", 9: "تسعة", 10: "عشرة"
    };
    return `${n} / ${mapAr[n] || n} أطفال`;
  }
  return `${n} / ${n} طفل`;
}
