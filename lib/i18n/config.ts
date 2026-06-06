/** PAMS 다국어 설정 — PRD 10.1, 10.3 */

export const locales = ["ko", "en", "zh-TW"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ko";

export const localeLabels: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  "zh-TW": "繁體中文",
};

/** locale별 날짜/숫자 형식 */
export const localeFormats: Record<
  Locale,
  { dateTime: Intl.DateTimeFormatOptions; number: Intl.NumberFormatOptions }
> = {
  ko: {
    dateTime: { dateStyle: "medium", timeStyle: "short" },
    number: { style: "decimal", maximumFractionDigits: 2 },
  },
  en: {
    dateTime: { dateStyle: "medium", timeStyle: "short" },
    number: { style: "decimal", maximumFractionDigits: 2 },
  },
  "zh-TW": {
    dateTime: { dateStyle: "medium", timeStyle: "short" },
    number: { style: "decimal", maximumFractionDigits: 2 },
  },
};

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
