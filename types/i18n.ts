import type { Locale } from "@/lib/i18n/config";

export type { Locale };

export interface I18nRecord {
  locale: Locale;
  name: string;
  description?: string | null;
}
