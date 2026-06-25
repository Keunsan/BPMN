"use client";

import { GitCompare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import {
  FilterField,
  FilterPanel,
  ListPageBody,
  ListPageLayout,
  PageContent,
  PageHeader,
} from "@/components/common/layout";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ProcessScopeFilter } from "@/components/process/ProcessScopeFilter";
import { StandardVariantCompare } from "@/components/process/StandardVariantCompare";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useProcessTree,
  useStandardVariantCompare,
} from "@/lib/query/hooks/useProcess";
import type { ProcessNodeTree } from "@/types/process";

const flattenL3L4Standards = (nodes: ProcessNodeTree[]): ProcessNodeTree[] => {
  const result: ProcessNodeTree[] = [];

  const walk = (items: ProcessNodeTree[]) => {
    for (const item of items) {
      if (!item.variantOf && (item.level === "L3" || item.level === "L4")) {
        result.push(item);
      }
      if (item.children?.length) {
        walk(item.children);
      }
    }
  };

  walk(nodes);
  return result;
};

/** 표준/변형 비교 화면 */
export const ProcessCompareClient = () => {
  const t = useTranslations("process");
  const tm = useTranslations("menu");
  const [companyCode, setCompanyCode] = useState("");
  const [businessUnitCode, setBusinessUnitCode] = useState("");
  const [standardNodeId, setStandardNodeId] = useState<number>(0);

  const { data: tree, isLoading: isTreeLoading } = useProcessTree();
  const standardOptions = useMemo(
    () => flattenL3L4Standards(tree ?? []),
    [tree],
  );

  const standardSelectItems = useMemo(
    () =>
      standardOptions.map((node) => ({
        value: String(node.nodeId),
        label: `${node.code} ${node.name}`,
      })),
    [standardOptions],
  );

  const { data: compareData, isLoading: isCompareLoading } =
    useStandardVariantCompare(
      standardNodeId,
      {
        companyCode: companyCode || undefined,
        businessUnitCode: businessUnitCode || undefined,
      },
      Boolean(standardNodeId && companyCode && businessUnitCode),
    );

  return (
    <ListPageLayout>
      <PageHeader
        title={tm("processCompare")}
        description={t("variant.comparePageDesc")}
        icon={GitCompare}
      />
      <ListPageBody
        filterStorageKey="pams-process-compare-filter-panel-width"
        filter={
          <FilterPanel>
            <ProcessScopeFilter
              embedded
              companyCode={companyCode}
              businessUnitCode={businessUnitCode}
              onScopeChange={({ companyCode: nextCompany, businessUnitCode: nextBu }) => {
                setCompanyCode(nextCompany ?? "");
                setBusinessUnitCode(nextBu ?? "");
              }}
            />
            <FilterField label={t("variant.selectStandard")}>
                {isTreeLoading ? (
                  <LoadingSpinner label={t("loading")} />
                ) : (
                  <Select
                    value={standardNodeId ? String(standardNodeId) : ""}
                    onValueChange={(value) => setStandardNodeId(Number(value))}
                  >
                    <SelectTrigger variant="filter">
                      <SelectValue placeholder={t("variant.selectStandard")} />
                    </SelectTrigger>
                    <SelectContent variant="filter" items={standardSelectItems}>
                      {standardSelectItems.map((item) => (
                        <SelectItem
                          variant="filter"
                          key={item.value}
                          value={item.value}
                        >
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FilterField>
          </FilterPanel>
        }
        content={
          <PageContent>
            {standardOptions.length === 0 && !isTreeLoading ? (
              <EmptyState
                title={t("variant.noStandardOptions")}
                description={t("variant.noStandardOptionsDesc")}
              />
            ) : (
              <StandardVariantCompare
                data={compareData}
                isLoading={isCompareLoading}
              />
            )}
          </PageContent>
        }
      />
    </ListPageLayout>
  );
};
