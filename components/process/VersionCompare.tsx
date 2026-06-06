"use client";

import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProcessHistoryDto } from "@/types/process";

type VersionCompareProps = {
  history: ProcessHistoryDto[];
  versionA: string;
  versionB: string;
};

/** 두 버전 스냅샷 비교 UI */
export const VersionCompare = ({
  history,
  versionA,
  versionB,
}: VersionCompareProps) => {
  const t = useTranslations("process");

  const snapA = history.find((h) => h.version === versionA)?.snapshotData;
  const snapB = history.find((h) => h.version === versionB)?.snapshotData;

  const diffKeys = new Set([
    ...Object.keys(snapA ?? {}),
    ...Object.keys(snapB ?? {}),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("compareTitle", { a: versionA, b: versionB })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">{t("field")}</th>
                <th className="py-2 text-left">v{versionA}</th>
                <th className="py-2 text-left">v{versionB}</th>
              </tr>
            </thead>
            <tbody>
              {[...diffKeys].map((key) => {
                const a = String(snapA?.[key] ?? "-");
                const b = String(snapB?.[key] ?? "-");
                const changed = a !== b;

                return (
                  <tr
                    key={key}
                    className={changed ? "bg-amber-50 dark:bg-amber-950/20" : undefined}
                  >
                    <td className="py-1.5 font-mono text-xs">{key}</td>
                    <td className="py-1.5">{a}</td>
                    <td className="py-1.5">{b}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
