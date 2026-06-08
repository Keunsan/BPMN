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
export type MultiLangTextValue = Partial<Record<Locale, string | null>>;

type BaseMultiLangInputProps = {
  label: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
};

type NameDescriptionInputProps = BaseMultiLangInputProps & {
  mode?: "name-description";
  value: MultiLangValue;
  onChange: (value: MultiLangValue) => void;
  multiline?: boolean;
};

type TextInputProps = BaseMultiLangInputProps & {
  mode: "text";
  textValue: MultiLangTextValue;
  onTextChange: (value: MultiLangTextValue) => void;
  rows?: number;
};

type MultiLangInputProps = NameDescriptionInputProps | TextInputProps;

/** 다국어 탭 입력 컴포넌트 — 한국어 필수 텍스트를 지원한다. */
export const MultiLangInput = ({
  label,
  required = false,
  error,
  placeholder,
  ...props
}: MultiLangInputProps) => {
  const t = useTranslations("process");
  const [activeLocale, setActiveLocale] = useState<Locale>("ko");
  const isTextMode = props.mode === "text";

  const updateField = useCallback(
    (locale: Locale, field: "name" | "description", text: string) => {
      if (props.mode === "text") return;

      props.onChange({
        ...props.value,
        [locale]: {
          ...props.value[locale],
          name: field === "name" ? text : (props.value[locale]?.name ?? ""),
          description:
            field === "description"
              ? text
              : props.value[locale]?.description,
        },
      });
    },
    [props],
  );

  const updateText = useCallback(
    (locale: Locale, text: string) => {
      if (props.mode !== "text") return;

      props.onTextChange({
        ...props.textValue,
        [locale]: text,
      });
    },
    [props],
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
            {isTextMode ? (
              <Textarea
                placeholder={placeholder ?? t("descriptionPlaceholder")}
                value={props.textValue[locale] ?? ""}
                onChange={(e) => updateText(locale, e.target.value)}
                rows={props.rows ?? 3}
              />
            ) : props.multiline ? (
              <>
                <Textarea
                  placeholder={t("namePlaceholder")}
                  value={props.value[locale]?.name ?? ""}
                  onChange={(e) => updateField(locale, "name", e.target.value)}
                  rows={2}
                />
                <Textarea
                  placeholder={t("descriptionPlaceholder")}
                  value={props.value[locale]?.description ?? ""}
                  onChange={(e) =>
                    updateField(locale, "description", e.target.value)
                  }
                  rows={4}
                />
              </>
            ) : (
              <Input
                placeholder={t("namePlaceholder")}
                value={props.value[locale]?.name ?? ""}
                onChange={(e) => updateField(locale, "name", e.target.value)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {required &&
        (isTextMode
          ? !props.textValue.ko?.trim()
          : !props.value.ko?.name?.trim()) && (
        <p className="text-xs text-muted-foreground">{t("koRequired")}</p>
      )}
    </div>
  );
};
