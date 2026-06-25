"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import {
  ENTERPRISE_BUSINESS_UNIT_CODE,
  ENTERPRISE_COMPANY_CODE,
} from "@/lib/constants/process-scope";
import { useCommonCodeLookup } from "@/lib/query/hooks/useCommonCode";
import { isEnterpriseScope } from "@/lib/utils/process-scope";
import type { ProcessScopeMode } from "@/types/process";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProcessScopeFieldsProps = {
  mode: "create-l3" | "create-l4" | "readonly";
  scopeMode: ProcessScopeMode;
  onScopeModeChange: (mode: ProcessScopeMode) => void;
  companyCode: string;
  businessUnitCode: string;
  onCompanyCodeChange: (code: string) => void;
  onBusinessUnitCodeChange: (code: string) => void;
  inheritedCompanyCode?: string | null;
  inheritedBusinessUnitCode?: string | null;
};

/** 프로세스 등록 시 scope(전사 공통 / 법인·사업부 전용) 입력 */
export const ProcessScopeFields = ({
  mode,
  scopeMode,
  onScopeModeChange,
  companyCode,
  businessUnitCode,
  onCompanyCodeChange,
  onBusinessUnitCodeChange,
  inheritedCompanyCode,
  inheritedBusinessUnitCode,
}: ProcessScopeFieldsProps) => {
  const t = useTranslations("process");
  const { data: companyOptions = [] } = useCommonCodeLookup("COMPANY_CD");
  const { data: businessUnitOptions = [] } = useCommonCodeLookup("BU_CD");

  const scopedCompanyOptions = companyOptions.filter(
    (item) => item.code !== ENTERPRISE_COMPANY_CODE,
  );
  const scopedBusinessUnitOptions = businessUnitOptions.filter(
    (item) => item.code !== ENTERPRISE_BUSINESS_UNIT_CODE,
  );

  const companySelectItems = useMemo(
    () =>
      scopedCompanyOptions.map((item) => ({
        value: item.code,
        label: item.displayName,
      })),
    [scopedCompanyOptions],
  );

  const businessUnitSelectItems = useMemo(
    () =>
      scopedBusinessUnitOptions.map((item) => ({
        value: item.code,
        label: item.displayName,
      })),
    [scopedBusinessUnitOptions],
  );

  if (mode === "create-l4") {
    const inheritedLabel = isEnterpriseScope(
      inheritedCompanyCode,
      inheritedBusinessUnitCode,
    )
      ? t("scope.enterpriseCommon")
      : [
          companyOptions.find((item) => item.code === inheritedCompanyCode)
            ?.displayName ?? inheritedCompanyCode,
          businessUnitOptions.find((item) => item.code === inheritedBusinessUnitCode)
            ?.displayName ?? inheritedBusinessUnitCode,
        ]
          .filter(Boolean)
          .join(" · ");

    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <p className="font-medium">{t("scope.inheritedScope")}</p>
        <p className="mt-1 text-muted-foreground">{inheritedLabel}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("scope.inheritedScopeHint")}
        </p>
      </div>
    );
  }

  if (mode === "readonly") {
    const label = isEnterpriseScope(companyCode, businessUnitCode)
      ? t("scope.enterpriseCommon")
      : [
          companyOptions.find((item) => item.code === companyCode)?.displayName ??
            companyCode,
          businessUnitOptions.find((item) => item.code === businessUnitCode)
            ?.displayName ?? businessUnitCode,
        ]
          .filter(Boolean)
          .join(" · ");

    return (
      <div className="rounded-lg border bg-muted/20 p-4 text-sm">
        <p className="font-medium">{t("scope.label")}</p>
        <p className="mt-1">{label}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{t("scope.registrationType")}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scopeMode === "enterprise"}
              onChange={() => onScopeModeChange("enterprise")}
            />
            {t("scope.enterpriseCommon")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={scopeMode === "scoped"}
              onChange={() => onScopeModeChange("scoped")}
            />
            {t("scope.scopedDedicated")}
          </label>
        </div>
      </div>

      {scopeMode === "scoped" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("scope.companyCode")}</p>
            <Select
              value={companyCode}
              onValueChange={(value) => onCompanyCodeChange(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("scope.selectCompany")} />
              </SelectTrigger>
              <SelectContent items={companySelectItems}>
                {companySelectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t("scope.businessUnitCode")}</p>
            <Select
              value={businessUnitCode}
              onValueChange={(value) => onBusinessUnitCodeChange(value ?? "")}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("scope.selectBusinessUnit")} />
              </SelectTrigger>
              <SelectContent items={businessUnitSelectItems}>
                {businessUnitSelectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
