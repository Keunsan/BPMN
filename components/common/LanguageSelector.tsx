"use client";

import { useLocale } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { localeLabels, locales, type Locale } from "@/lib/i18n/config";
import { usePathname, useRouter } from "@/lib/i18n/navigation";

/** 언어 선택 드롭다운 */
export function LanguageSelector() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      value={locale}
      onValueChange={(value) => {
        if (!value) return;
        router.replace(pathname, { locale: value as Locale });
      }}
    >
      <SelectTrigger size="sm" aria-label="Language">
        <SelectValue>{localeLabels[locale]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((code) => (
          <SelectItem key={code} value={code}>
            {localeLabels[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
