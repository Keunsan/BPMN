"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { localeLabels, locales, type Locale } from "@/lib/i18n/config";
import type { ProcessI18nMap } from "@/types/process";

export type MultiLangValue = ProcessI18nMap;

type MultiLangInputProps = {
  label: string;
  value: MultiLangValue;
  onChange: (value: MultiLangValue) => void;
  required?: boolean;
  multiline?: boolean;
  error?: string;
};

/** 다국어 탭 입력 컴포넌트 — 한국어 필수 */
export const MultiLangInput = ({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  error,
}: MultiLangInputProps) => {
  const t = useTranslations("process");
  const [activeLocale, setActiveLocale] = useState<Locale>("ko");

  const updateField = useCallback(
    (locale: Locale, field: "name" | "description", text: string) => {
      onChange({
        ...value,
        [locale]: {
          ...value[locale],
          name: field === "name" ? text : (value[locale]?.name ?? ""),
          description:
            field === "description"
              ? text
              : value[locale]?.description,
        },
      });
    },
    [onChange, value],
  );

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>

      <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as Locale)}>
        <TabsList>
          {locales.map((locale) => (
            <TabsTrigger key={locale} value={locale}>
              {localeLabels[locale]}
              {required && locale === "ko" && " *"}
            </TabsTrigger>
          ))}
        </TabsList>

        {locales.map((locale) => (
          <TabsContent key={locale} value={locale} className="space-y-2">
            {multiline ? (
              <>
                <Textarea
                  placeholder={t("namePlaceholder")}
                  value={value[locale]?.name ?? ""}
                  onChange={(e) => updateField(locale, "name", e.target.value)}
                  rows={2}
                />
                <Textarea
                  placeholder={t("descriptionPlaceholder")}
                  value={value[locale]?.description ?? ""}
                  onChange={(e) =>
                    updateField(locale, "description", e.target.value)
                  }
                  rows={4}
                />
              </>
            ) : (
              <Input
                placeholder={t("namePlaceholder")}
                value={value[locale]?.name ?? ""}
                onChange={(e) => updateField(locale, "name", e.target.value)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {required && !value.ko?.name?.trim() && (
        <p className="text-xs text-muted-foreground">{t("koRequired")}</p>
      )}
    </div>
  );
};
