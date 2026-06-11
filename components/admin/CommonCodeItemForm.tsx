"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { MultiLangInput } from "@/components/common/MultiLangInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/i18n/config";
import { locales } from "@/lib/i18n/config";
import type {
  CommonCodeItemDto,
  CommonCodeItemI18nMap,
  UpsertCommonCodeItemDto,
} from "@/types/common-code";

type CommonCodeItemFormProps = {
  groupId: number;
  initial?: CommonCodeItemDto | null;
  onSubmit: (data: UpsertCommonCodeItemDto) => void;
};

const emptyI18n = (): CommonCodeItemI18nMap => ({
  ko: { codeName: "", description: "" },
  en: { codeName: "", description: "" },
  "zh-TW": { codeName: "", description: "" },
});

const buildInitialI18n = (initial?: CommonCodeItemDto | null): CommonCodeItemI18nMap => {
  if (initial?.i18n) {
    return {
      ...emptyI18n(),
      ...initial.i18n,
      ko: {
        codeName: initial.i18n.ko?.codeName ?? initial.codeName,
        description: initial.i18n.ko?.description ?? initial.description ?? "",
      },
    };
  }

  return {
    ...emptyI18n(),
    ko: {
      codeName: initial?.codeName ?? "",
      description: initial?.description ?? "",
    },
  };
};

/** MINOR 공통코드 입력 폼 */
export const CommonCodeItemForm = ({
  groupId,
  initial,
  onSubmit,
}: CommonCodeItemFormProps) => {
  const t = useTranslations("admin.codes");
  const [code, setCode] = useState(initial?.code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [i18n, setI18n] = useState<CommonCodeItemI18nMap>(() =>
    buildInitialI18n(initial),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSubmit({
      groupId,
      code,
      codeName: i18n.ko?.codeName ?? "",
      description: description || i18n.ko?.description || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
      i18n: buildItemI18n(i18n, description),
    });
  };

  return (
    <form id="common-code-item-form" className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="code">{t("code")}</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("codePlaceholder")}
          disabled={Boolean(initial)}
          required
        />
      </div>

      <MultiLangInput
        mode="text"
        label={t("codeName")}
        required
        textValue={Object.fromEntries(
          locales.map((locale) => [locale, i18n[locale]?.codeName ?? ""]),
        )}
        onTextChange={(value) => {
          setI18n((prev) => ({
            ...prev,
            ...Object.fromEntries(
              locales.map((locale: Locale) => [
                locale,
                {
                  codeName: value[locale] ?? prev[locale]?.codeName ?? "",
                  description: prev[locale]?.description ?? "",
                },
              ]),
            ),
          }));
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="itemDescription">{t("description")}</Label>
        <Input
          id="itemDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="itemSortOrder">{t("sortOrder")}</Label>
          <Input
            id="itemSortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            {t("active")}
          </label>
        </div>
      </div>
    </form>
  );
};

const buildItemI18n = (
  i18n: CommonCodeItemI18nMap,
  description: string,
): CommonCodeItemI18nMap => {
  const result: CommonCodeItemI18nMap = {};

  for (const locale of locales) {
    const entry = i18n[locale];
    if (!entry?.codeName?.trim()) {
      continue;
    }

    result[locale] = {
      codeName: entry.codeName,
      description: entry.description ?? (locale === "ko" ? description : null),
    };
  }

  return result;
};
