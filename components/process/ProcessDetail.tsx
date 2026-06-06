"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useProcessDetail,
  useProcessHistory,
  useRequestApproval,
} from "@/lib/query/hooks/useProcess";
import { useRouter } from "@/lib/i18n/navigation";
import type { ProcessHistoryDto } from "@/types/process";

import { ProcessTree } from "./ProcessTree";
import { VersionCompare } from "./VersionCompare";

type ProcessDetailProps = {
  nodeId: number;
};

/** 프로세스 상세 — 트리 + 탭 패널 */
export const ProcessDetail = ({ nodeId }: ProcessDetailProps) => {
  const t = useTranslations("process");
  const router = useRouter();
  const { data: node, isLoading } = useProcessDetail(nodeId);
  const { data: history } = useProcessHistory(nodeId);
  const approvalMutation = useRequestApproval(nodeId);
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(
    null,
  );

  const historyColumns: DataTableColumn<ProcessHistoryDto>[] = [
    { key: "version", header: t("version"), cell: (r) => r.version },
    { key: "type", header: t("changeType"), cell: (r) => r.changeType },
    {
      key: "date",
      header: t("changedAt"),
      cell: (r) =>
        new Date(r.createdAt).toLocaleString(),
    },
    {
      key: "reason",
      header: t("changeReason"),
      cell: (r) => r.changeReason ?? "-",
    },
  ];

  if (isLoading) return <LoadingSpinner label={t("loading")} />;
  if (!node) return <EmptyState title={t("notFound")} />;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      <aside className="w-full border-b p-4 lg:w-80 lg:border-r lg:border-b-0">
        <ProcessTree selectedId={nodeId} />
      </aside>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-sm text-muted-foreground">{node.code}</p>
            <h1 className="text-2xl font-semibold">
              {node.displayName ?? node.name}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={node.status} />
              <span className="text-sm text-muted-foreground">
                v{node.version} · {node.level}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/process/${nodeId}/edit`)}
            >
              {t("edit")}
            </Button>
            {node.status === "DRAFT" && (
              <Button
                size="sm"
                disabled={approvalMutation.isPending}
                onClick={() => approvalMutation.mutate(undefined)}
              >
                {t("requestApproval")}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">{t("tabInfo")}</TabsTrigger>
            <TabsTrigger value="history">{t("tabHistory")}</TabsTrigger>
            <TabsTrigger value="compare">{t("tabCompare")}</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>{t("tabInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{node.displayDescription ?? node.description ?? t("noDescription")}</p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{t("level")}</dt>
                    <dd>{node.level}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("isStandard")}</dt>
                    <dd>{node.isStandard ? t("yes") : t("no")}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <DataTable
              columns={historyColumns}
              data={history ?? []}
              rowKey={(r) => r.historyId}
              onRowClick={(r) => {
                const versions = history?.map((h) => h.version) ?? [];
                const other = versions.find((v) => v !== r.version);
                if (other) {
                  setCompareVersions([other, r.version]);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="compare">
            {compareVersions && history ? (
              <VersionCompare
                history={history}
                versionA={compareVersions[0]}
                versionB={compareVersions[1]}
              />
            ) : (
              <EmptyState
                title={t("selectVersions")}
                description={t("selectVersionsDesc")}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
