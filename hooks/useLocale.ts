"use client";

import { useLocale, useTranslations } from "next-intl";

import type { Locale } from "@/lib/i18n/config";
import { useUIStore } from "@/lib/store/ui.store";

/** 현재 locale 및 번역 함수 훅 */
export const useAppLocale = () => {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const currentLocale = useUIStore((s) => s.currentLocale);

  return { locale, currentLocale, t };
};
