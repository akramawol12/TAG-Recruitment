import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Converts OKLAB color to standard sRGB string.
 * This is crucial because html2canvas does not support CSS Level 4 OKLCH/OKLAB colors.
 */
function oklabToRgbString(L: number, a: number, b: number, alphaStr: string = "1"): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  
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
  
  return alphaStr === "1" 
    ? `rgb(${rVal}, ${gVal}, ${bVal})` 
    : `rgba(${rVal}, ${gVal}, ${bVal}, ${alphaStr})`;
}

/**
 * Converts OKLCH color to standard sRGB string.
 */
function oklchToRgbString(L: number, C: number, H: number, alphaStr: string = "1"): string {
  const hRad = (H * Math.PI) / 180;
  const oklabA = C * Math.cos(hRad);
  const oklabB = C * Math.sin(hRad);
  return oklabToRgbString(L, oklabA, oklabB, alphaStr);
}

/**
 * Replaces all oklch() and oklab() colors with standard RGB inside a CSS string.
 */
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
        if (char === "(") depth++;
        else if (char === ")") depth--;
        j++;
      }

      if (depth === 0) {
        const inside = cssText.substring(startOfInside, j - 1);
        const fullMatch = cssText.substring(startOfName, j);

        try {
          const slashIndex = inside.indexOf("/");
          let colorPart = inside;
          let alphaStr = "1";

          if (slashIndex !== -1) {
            colorPart = inside.substring(0, slashIndex).trim();
            const rawAlpha = inside.substring(slashIndex + 1).trim();
            if (rawAlpha.endsWith("%")) {
              alphaStr = (parseFloat(rawAlpha) / 100).toString();
            } else {
              alphaStr = rawAlpha;
            }
          }

          if (isNaN(parseFloat(alphaStr))) {
            alphaStr = "1";
          }

          const colorClean = colorPart.replace(/,/g, " ").trim().replace(/\s+/g, " ");
          const parts = colorClean.split(" ");

          if (parts.length >= 3) {
            let lVal = parts[0];
            let l = lVal.endsWith("%") ? parseFloat(lVal) / 100 : parseFloat(lVal);

            if (isOklch) {
              let c = parseFloat(parts[1]);
              let hVal = parts[2];
              let h = 0;
              if (hVal.endsWith("deg")) h = parseFloat(hVal);
              else if (hVal.endsWith("rad")) h = (parseFloat(hVal) * 180) / Math.PI;
              else if (hVal.endsWith("turn")) h = parseFloat(hVal) * 360;
              else h = parseFloat(hVal);

              if (!isNaN(l) && !isNaN(c) && !isNaN(h)) {
                result += oklchToRgbString(l, c, h, alphaStr);
              } else {
                result += "rgb(128, 128, 128)";
              }
            } else {
              let a = parseFloat(parts[1]);
              let b = parseFloat(parts[2]);

              if (!isNaN(l) && !isNaN(a) && !isNaN(b)) {
                result += oklabToRgbString(l, a, b, alphaStr);
              } else {
                result += "rgb(128, 128, 128)";
              }
            }
          } else {
            result += "rgb(128, 128, 128)";
          }
        } catch (e) {
          result += "rgb(128, 128, 128)";
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

/**
 * Swaps out OKLCH style properties across the entire document during capture
 * to allow html2canvas to render everything accurately. Restores them afterwards.
 */
async function runWithColorsSanitized(callback: () => Promise<void>) {
  const originalStyles: { element: HTMLStyleElement | HTMLLinkElement | null; originalDisabled: boolean; sheet?: CSSStyleSheet }[] = [];
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

  // Sanitizing active stylesheets in document.styleSheets directly
  const sheets = Array.from(document.styleSheets);
  for (const sheet of sheets) {
    try {
      const rules = sheet.cssRules || sheet.rules;
      if (!rules) continue;

      let hasOklchOrOklab = false;
      let fullCss = "";

      for (let i = 0; i < rules.length; i++) {
        const ruleText = rules[i].cssText;
        fullCss += ruleText + "\n";
        if (ruleText.includes("oklch") || ruleText.includes("oklab")) {
          hasOklchOrOklab = true;
        }
      }

      if (hasOklchOrOklab) {
        const sanitizedCss = replaceOklchInCss(fullCss);
        const tempStyle = document.createElement("style");
        tempStyle.textContent = sanitizedCss;
        document.head.appendChild(tempStyle);
        tempStyles.push(tempStyle);

        if (sheet.ownerNode) {
          originalStyles.push({
            element: sheet.ownerNode as HTMLStyleElement | HTMLLinkElement,
            originalDisabled: sheet.disabled
          });
        } else {
          originalStyles.push({
            element: null,
            originalDisabled: sheet.disabled,
            sheet: sheet
          });
        }
        sheet.disabled = true;
      }
    } catch (err) {
      // Ignore stylesheet access errors due to cross-origin CORS limitations
    }
  }

  // Set up bulletproof global computed style interceptor for html2canvas
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt, pseudoElt) {
    const style = originalGetComputedStyle(elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === "getPropertyValue") {
          return function(propertyName: string) {
            const value = target.getPropertyValue(propertyName);
            if (typeof value === "string" && (value.includes("oklch") || value.includes("oklab"))) {
              return replaceOklchInCss(value);
            }
            return value;
          };
        }
        const value = (target as any)[prop];
        if (typeof value === "function") {
          return value.bind(target);
        }
        if (typeof value === "string" && (value.includes("oklch") || value.includes("oklab"))) {
          return replaceOklchInCss(value);
        }
        return value;
      }
    });
  };

  try {
    await callback();
  } finally {
    // Restore original window.getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;

    // Restore all original styles
    originalStyles.forEach(({ element, originalDisabled, sheet }) => {
      if (element) {
        if ("sheet" in element && element.sheet) {
          element.sheet.disabled = originalDisabled;
        } else {
          (element as any).disabled = originalDisabled;
        }
      } else if (sheet) {
        sheet.disabled = originalDisabled;
      }
    });

    tempStyles.forEach((temp) => temp.remove());

    originalInlineStyles.forEach(({ element, styleAttr }) => {
      element.setAttribute("style", styleAttr);
    });
  }
}

/**
 * Capture an HTML Element exactly as it appears and download as a high-fidelity multi-page PDF.
 */
export async function downloadElementAsPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found.`);
  }

  await runWithColorsSanitized(async () => {
    // Render the element to a canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Retain sharp high-resolution text & images
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Standard A4 sizes in mm
    const pdfWidth = 210;
    const pdfHeight = 297;
    
    // Calculate the height required in PDF space based on captured canvas ratio
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Remaining pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight; // slide view down
      doc.addPage();
      doc.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    doc.save(filename);
  });
}
