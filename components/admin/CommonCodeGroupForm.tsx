"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { MultiLangInput } from "@/components/common/MultiLangInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/i18n/config";
import { locales } from "@/lib/i18n/config";
import type {
  CommonCodeGroupDto,
  CommonCodeGroupI18nMap,
  UpsertCommonCodeGroupDto,
} from "@/types/common-code";

type CommonCodeGroupFormProps = {
  initial?: CommonCodeGroupDto | null;
  onSubmit: (data: UpsertCommonCodeGroupDto) => void;
};

const emptyI18n = (): CommonCodeGroupI18nMap => ({
  ko: { groupName: "", description: "" },
  en: { groupName: "", description: "" },
  "zh-TW": { groupName: "", description: "" },
});

const buildInitialI18n = (initial?: CommonCodeGroupDto | null): CommonCodeGroupI18nMap => {
  if (initial?.i18n) {
    return {
      ...emptyI18n(),
      ...initial.i18n,
      ko: {
        groupName: initial.i18n.ko?.groupName ?? initial.groupName,
        description: initial.i18n.ko?.description ?? initial.description ?? "",
      },
    };
  }

  return {
    ...emptyI18n(),
    ko: {
      groupName: initial?.groupName ?? "",
      description: initial?.description ?? "",
    },
  };
};

/** MAJOR 공통코드 그룹 입력 폼 */
export const CommonCodeGroupForm = ({
  initial,
  onSubmit,
}: CommonCodeGroupFormProps) => {
  const t = useTranslations("admin.codes");
  const [groupCode, setGroupCode] = useState(initial?.groupCode ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [i18n, setI18n] = useState<CommonCodeGroupI18nMap>(() =>
    buildInitialI18n(initial),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSubmit({
      groupCode,
      groupName: i18n.ko?.groupName ?? "",
      description: description || i18n.ko?.description || null,
      sortOrder: Number(sortOrder) || 0,
      isActive,
      i18n: buildGroupI18n(i18n, description),
    });
  };

  return (
    <form id="common-code-group-form" className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="groupCode">{t("groupCode")}</Label>
        <Input
          id="groupCode"
          value={groupCode}
          onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
          placeholder={t("groupCodePlaceholder")}
          disabled={Boolean(initial)}
          required
        />
      </div>

      <MultiLangInput
        mode="text"
        label={t("groupName")}
        required
        textValue={Object.fromEntries(
          locales.map((locale) => [locale, i18n[locale]?.groupName ?? ""]),
        )}
        onTextChange={(value) => {
          setI18n((prev) => ({
            ...prev,
            ...Object.fromEntries(
              locales.map((locale: Locale) => [
                locale,
                {
                  groupName: value[locale] ?? prev[locale]?.groupName ?? "",
                  description: prev[locale]?.description ?? "",
                },
              ]),
            ),
          }));
        }}
      />

      <div className="space-y-2">
        <Label htmlFor="groupDescription">{t("description")}</Label>
        <Input
          id="groupDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="groupSortOrder">{t("sortOrder")}</Label>
          <Input
            id="groupSortOrder"
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

const buildGroupI18n = (
  i18n: CommonCodeGroupI18nMap,
  description: string,
): CommonCodeGroupI18nMap => {
  const result: CommonCodeGroupI18nMap = {};

  for (const locale of locales) {
    const entry = i18n[locale];
    if (!entry?.groupName?.trim()) {
      continue;
    }

    result[locale] = {
      groupName: entry.groupName,
      description: entry.description ?? (locale === "ko" ? description : null),
    };
  }

  return result;
};
