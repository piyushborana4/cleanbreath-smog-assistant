import type { AqiCategory } from '../schemas/aqi.schema';
import type { Language } from '../schemas/profile.schema';

/**
 * Accessible display metadata for an AQI category.
 * Always pairs color tokens with an explicit icon key and plain-language text.
 */
export interface AqiCategoryMeta {
  category: AqiCategory;
  labelEn: string;
  labelHi: string;
  guidanceEn: string;
  guidanceHi: string;
  iconName: 'shield-check' | 'info' | 'alert-triangle' | 'shield-alert' | 'octagon-alert' | 'flame';
  badgeClasses: string;
  textColorClass: string;
  severityLevel: number;
}

const CATEGORY_METADATA: Record<AqiCategory, AqiCategoryMeta> = {
  good: {
    category: 'good',
    labelEn: 'Good',
    labelHi: 'अच्छा (Good)',
    guidanceEn: 'Air is clean for outdoor play, walking, and natural window ventilation.',
    guidanceHi: 'बाहरी गतिविधियों और खिड़कियाँ खोलकर वेंटिलेशन के लिए हवा साफ है।',
    iconName: 'shield-check',
    badgeClasses: 'bg-emerald-50 text-emerald-900 border-emerald-300',
    textColorClass: 'text-emerald-800',
    severityLevel: 1,
  },
  moderate: {
    category: 'moderate',
    labelEn: 'Moderate',
    labelHi: 'सामान्य (Moderate)',
    guidanceEn: 'Acceptable for most people; sensitive individuals should watch for mild cough.',
    guidanceHi: 'अधिकांश लोगों के लिए ठीक है; संवेदनशील लोग हल्की खांसी पर ध्यान दें।',
    iconName: 'info',
    badgeClasses: 'bg-sky-50 text-sky-900 border-sky-300',
    textColorClass: 'text-sky-800',
    severityLevel: 2,
  },
  sensitive: {
    category: 'sensitive',
    labelEn: 'Unhealthy for Sensitive Groups',
    labelHi: 'संवेदनशील समूहों के लिए अस्वस्थ',
    guidanceEn: 'Children, older adults, and people with asthma should shorten brisk outdoor time.',
    guidanceHi: 'बच्चे, बुजुर्ग और अस्थमा वाले लोग बाहर तेज़ गतिविधि का समय कम करें।',
    iconName: 'alert-triangle',
    badgeClasses: 'bg-amber-50 text-amber-950 border-amber-300',
    textColorClass: 'text-amber-900',
    severityLevel: 3,
  },
  unhealthy: {
    category: 'unhealthy',
    labelEn: 'Unhealthy',
    labelHi: 'अस्वस्थ (Unhealthy)',
    guidanceEn:
      'Everyone may feel throat or eye irritation. Move workouts indoors and wear an N95.',
    guidanceHi: 'सभी को गले या आँखों में जलन हो सकती है। व्यायाम अंदर करें और N95 पहनें।',
    iconName: 'shield-alert',
    badgeClasses: 'bg-orange-50 text-orange-950 border-orange-300',
    textColorClass: 'text-orange-900',
    severityLevel: 4,
  },
  very_unhealthy: {
    category: 'very_unhealthy',
    labelEn: 'Very Unhealthy',
    labelHi: 'बेहद अस्वस्थ',
    guidanceEn:
      'High winter smog risk. Keep windows sealed during rush hours and run indoor filtration.',
    guidanceHi: 'गंभीर स्मॉग जोखिम। व्यस्त समय में खिड़कियाँ बंद रखें और इनडोर फिल्ट्रेशन चलाएं।',
    iconName: 'octagon-alert',
    badgeClasses: 'bg-rose-50 text-rose-950 border-rose-300',
    textColorClass: 'text-rose-900',
    severityLevel: 5,
  },
  severe: {
    category: 'severe',
    labelEn: 'Severe / Hazardous',
    labelHi: 'गंभीर / खतरनाक',
    guidanceEn:
      'Emergency smog levels. Avoid non-essential outdoor exposure; use fitted N95/FFP2 masks.',
    guidanceHi: 'आपातकालीन स्मॉग स्तर। अनावश्यक बाहर जाने से बचें; फिटेड N95/FFP2 मास्क पहनें।',
    iconName: 'flame',
    badgeClasses: 'bg-red-100 text-red-950 border-red-400',
    textColorClass: 'text-red-900',
    severityLevel: 6,
  },
};

/**
 * Maps a numeric US-EPA style AQI (0-500) to a canonical AqiCategory.
 * @param aqi Numeric Air Quality Index value.
 * @returns Canonical AqiCategory band.
 */
export function mapNumericAqiToCategory(aqi: number): AqiCategory {
  const clamped = Math.max(0, Math.min(500, Math.round(aqi)));
  if (clamped <= 50) return 'good';
  if (clamped <= 100) return 'moderate';
  if (clamped <= 150) return 'sensitive';
  if (clamped <= 200) return 'unhealthy';
  if (clamped <= 300) return 'very_unhealthy';
  return 'severe';
}

/**
 * Converts a PM2.5 concentration (µg/m³) into an approximate US-EPA AQI value.
 * Used when normalizing European/Open-Meteo pollutant feeds.
 * @param pm25 Fine particulate matter concentration in µg/m³.
 * @returns Estimated 0-500 AQI integer.
 */
export function pm25ToUsAqi(pm25: number): number {
  const c = Math.max(0, pm25);
  const breakpoints: Array<[number, number, number, number]> = [
    [0, 12.0, 0, 50],
    [12.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 150.4, 151, 200],
    [150.5, 250.4, 201, 300],
    [250.5, 500.4, 301, 500],
  ];

  for (const [cLow, cHigh, iLow, iHigh] of breakpoints) {
    if (c <= cHigh) {
      return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
    }
  }
  return 500;
}

/**
 * Returns accessible icon, contrast-safe badge styles, and plain-language labels for an AQI band.
 * @param category Canonical AqiCategory.
 * @returns Full category metadata object.
 */
export function getAqiCategoryMeta(category: AqiCategory): AqiCategoryMeta {
  return CATEGORY_METADATA[category];
}

/**
 * Returns localized label and plain-language guidance for an AQI category.
 * @param category Canonical AqiCategory.
 * @param lang Target language ('en' or 'hi').
 */
export function getLocalizedAqiText(
  category: AqiCategory,
  lang: Language,
): { label: string; guidance: string } {
  const meta = getAqiCategoryMeta(category);
  return {
    label: lang === 'hi' ? meta.labelHi : meta.labelEn,
    guidance: lang === 'hi' ? meta.guidanceHi : meta.guidanceEn,
  };
}
