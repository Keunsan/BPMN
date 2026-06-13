"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StandardVariantCompareDto } from "@/types/process";

type StandardVariantCompareProps = {
  data?: StandardVariantCompareDto;
  isLoading?: boolean;
};

type DiffRow = StandardVariantCompareDto["diffRows"][number];

/** 표준·변형 필드 비교 그리드 */
export const StandardVariantCompare = ({
  data,
  isLoading,
}: StandardVariantCompareProps) => {
  const t = useTranslations("process");

  const columns = useMemo<DataGridColumn<DiffRow>[]>(
    () => [
      {
        key: "field",
        header: t("field"),
        width: 140,
        minWidth: 120,
        sticky: "left",
        sortable: true,
        filter: "text",
        value: (row) => row.key,
        cell: (row) => (
          <span className="font-mono text-[11px]">{row.key}</span>
        ),
      },
      {
        key: "standard",
        header: t("variant.standardColumn"),
        width: 240,
        minWidth: 180,
        sortable: true,
        filter: "text",
        value: (row) => row.standardValue,
        cell: (row) => (
          <span
            className={cn(
              row.changed &&
                "rounded bg-amber-50 px-1 py-0.5 dark:bg-amber-950/20",
            )}
          >
            {row.standardValue}
          </span>
        ),
      },
      {
        key: "variant",
        header: t("variant.variantColumn"),
        width: 240,
        minWidth: 180,
        sortable: true,
        filter: "text",
        value: (row) => row.variantValue,
        cell: (row) => (
          <span
            className={cn(
              row.changed &&
                "rounded bg-amber-50 px-1 py-0.5 dark:bg-amber-950/20",
            )}
          >
            {row.variantValue}
          </span>
        ),
      },
    ],
    [t],
  );

  if (isLoading) {
    return <LoadingSpinner label={t("loading")} />;
  }

  if (!data) {
    return (
      <EmptyState
        title={t("variant.compareSelectScope")}
        description={t("variant.compareSelectScopeDesc")}
      />
    );
  }

  if (!data.variant) {
    return (
      <EmptyState
        title={t("variant.compareNoVariant")}
        description={t("variant.compareNoVariantDesc")}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("variant.compareTitle", {
            standardCode: data.standard.code,
            variantCode: data.variant.code,
          })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGrid
          columns={columns}
          data={data.diffRows}
          rowKey={(row) => row.key}
          storageKey="pams-standard-variant-compare-grid"
        />
      </CardContent>
    </Card>
  );
};
