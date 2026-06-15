"use client";

import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { FilterField, FilterPanel } from "@/components/common/layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import {
  ENTERPRISE_BUSINESS_UNIT_CODE,
  ENTERPRISE_COMPANY_CODE,
} from "@/lib/constants/process-scope";
import { useCommonCodeLookup } from "@/lib/query/hooks/useCommonCode";
import type { ProcessFilters } from "@/types/process";

type ProcessScopeFilterProps = {
  companyCode: string;
  businessUnitCode: string;
  onScopeChange: (scope: Pick<ProcessFilters, "companyCode" | "businessUnitCode">) => void;
  /** true면 FilterPanel 없이 필드만 렌더 — 상위 FilterPanel에 합칠 때 사용 */
  embedded?: boolean;
};

/** 프로세스 scope(법인·사업부) 조회 필터 */
export const ProcessScopeFilter = ({
  companyCode,
  businessUnitCode,
  onScopeChange,
  embedded = false,
}: ProcessScopeFilterProps) => {
  const t = useTranslations("process");
  const { data: companyOptions = [] } = useCommonCodeLookup("COMPANY_CD");
  const { data: businessUnitOptions = [] } = useCommonCodeLookup("BU_CD");

  const fields = (
    <>
      <FilterField label={t("scope.companyCode")}>
        <Select
          value={companyCode || "ALL"}
          onValueChange={(value) =>
            onScopeChange({
              companyCode: value === "ALL" || !value ? undefined : value,
              businessUnitCode: businessUnitCode || undefined,
            })
          }
        >
          <SelectTrigger variant="filter">
            <SelectValue placeholder={t("scope.selectCompany")} />
          </SelectTrigger>
          <SelectContent variant="filter">
            <SelectItem variant="filter" value="ALL">
              {t("scope.allCompanies")}
            </SelectItem>
            {companyOptions.map((item) => (
              <SelectItem variant="filter" key={item.code} value={item.code}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField label={t("scope.businessUnitCode")}>
        <Select
          value={businessUnitCode || "ALL"}
          onValueChange={(value) =>
            onScopeChange({
              companyCode: companyCode || undefined,
              businessUnitCode: value === "ALL" || !value ? undefined : value,
            })
          }
        >
          <SelectTrigger variant="filter">
            <SelectValue placeholder={t("scope.selectBusinessUnit")} />
          </SelectTrigger>
          <SelectContent variant="filter">
            <SelectItem variant="filter" value="ALL">
              {t("scope.allBusinessUnits")}
            </SelectItem>
            {businessUnitOptions.map((item) => (
              <SelectItem variant="filter" key={item.code} value={item.code}>
                {item.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      {!embedded &&
        (!companyCode || !businessUnitCode ? (
          <p className="px-1 text-[11px] text-muted-foreground">
            {t("scope.catalogViewHint")}
          </p>
        ) : companyCode === ENTERPRISE_COMPANY_CODE &&
            businessUnitCode === ENTERPRISE_BUSINESS_UNIT_CODE ? (
          <p className="px-1 text-[11px] text-muted-foreground">
            {t("scope.enterpriseViewHint")}
          </p>
        ) : (
          <p className="px-1 text-[11px] text-muted-foreground">
            {t("scope.organizationViewHint")}
          </p>
        ))}
    </>
  );

  if (embedded) {
    return fields;
  }

  return <FilterPanel>{fields}</FilterPanel>;
};

/** URL과 동기화된 프로세스 scope 상태 */
export const useProcessScopeParams = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const companyCode = searchParams.get("companyCode") ?? "";
  const businessUnitCode = searchParams.get("businessUnitCode") ?? "";

  const setScope = useCallback(
    (next: Pick<ProcessFilters, "companyCode" | "businessUnitCode">) => {
      const params = new URLSearchParams(searchParams.toString());

      if (next.companyCode) {
        params.set("companyCode", next.companyCode);
      } else {
        params.delete("companyCode");
      }

      if (next.businessUnitCode) {
        params.set("businessUnitCode", next.businessUnitCode);
      } else {
        params.delete("businessUnitCode");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return {
    companyCode,
    businessUnitCode,
    setScope,
    filters: {
      companyCode: companyCode || undefined,
      businessUnitCode: businessUnitCode || undefined,
    } satisfies Pick<ProcessFilters, "companyCode" | "businessUnitCode">,
  };
};
