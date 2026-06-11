"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProcessHistoryDto } from "@/types/process";

type VersionCompareProps = {
  history: ProcessHistoryDto[];
  versionA: string;
  versionB: string;
};

type DiffRow = {
  key: string;
  valueA: string;
  valueB: string;
  changed: boolean;
};

/** 두 버전 스냅샷 비교 UI */
export const VersionCompare = ({
  history,
  versionA,
  versionB,
}: VersionCompareProps) => {
  const t = useTranslations("process");

  const snapA = history.find((item) => item.version === versionA)?.snapshotData;
  const snapB = history.find((item) => item.version === versionB)?.snapshotData;

  const diffRows = useMemo<DiffRow[]>(() => {
    const diffKeys = new Set([
      ...Object.keys(snapA ?? {}),
      ...Object.keys(snapB ?? {}),
    ]);

    return [...diffKeys].map((key) => {
      const valueA = String(snapA?.[key] ?? "-");
      const valueB = String(snapB?.[key] ?? "-");

      return {
        key,
        valueA,
        valueB,
        changed: valueA !== valueB,
      };
    });
  }, [snapA, snapB]);

  const columns = useMemo<DataGridColumn<DiffRow>[]>(
    () => [
      {
        key: "field",
        header: t("field"),
        width: 180,
        minWidth: 140,
        sticky: "left",
        cell: (row) => (
          <span className="font-mono text-[11px]">{row.key}</span>
        ),
      },
      {
        key: "versionA",
        header: `v${versionA}`,
        width: 240,
        minWidth: 180,
        cell: (row) => (
          <span
            className={cn(
              row.changed &&
                "rounded bg-amber-50 px-1 py-0.5 dark:bg-amber-950/20",
            )}
          >
            {row.valueA}
          </span>
        ),
      },
      {
        key: "versionB",
        header: `v${versionB}`,
        width: 240,
        minWidth: 180,
        cell: (row) => (
          <span
            className={cn(
              row.changed &&
                "rounded bg-amber-50 px-1 py-0.5 dark:bg-amber-950/20",
            )}
          >
            {row.valueB}
          </span>
        ),
      },
    ],
    [t, versionA, versionB],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("compareTitle", { a: versionA, b: versionB })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataGrid
          columns={columns}
          data={diffRows}
          rowKey={(row) => row.key}
          storageKey="pams-version-compare-grid"
          fillHeight={false}
        />
      </CardContent>
    </Card>
  );
};
