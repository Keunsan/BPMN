"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBpmnList } from "@/lib/query/hooks/useBpmn";
import { useTaskAttributeList } from "@/lib/query/hooks/useMetadata";
import {
  useProcessDetail,
  useProcessHistory,
  useProcessVariants,
  useRequestApproval,
} from "@/lib/query/hooks/useProcess";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { formatProcessScope } from "@/lib/utils/process-label";
import { isEnterpriseScope } from "@/lib/utils/process-scope";
import type { BpmnModelDto } from "@/types/bpmn";
import type { TaskAttributeListItem } from "@/types/metadata";
import type { ProcessHistoryDto, ProcessNodeDto } from "@/types/process";

import { ProcessTree } from "./ProcessTree";
import { VersionCompare } from "./VersionCompare";

type ProcessDetailProps = {
  nodeId: number;
  showTree?: boolean;
  onEdit?: (node: ProcessNodeDto) => void;
};

type TaskMetadataDetailKey = keyof Pick<
  TaskAttributeListItem,
  | "definition"
  | "purpose"
  | "inputDeliverable"
  | "inputDataDesc"
  | "inputCondition"
  | "outputDeliverable"
  | "outputDataDesc"
  | "outputCondition"
  | "frequency"
  | "triggerEvent"
  | "duration"
  | "issues"
  | "exceptions"
  | "remarks"
  | "version"
>;

const taskMetadataDetailKeys: TaskMetadataDetailKey[] = [
  "definition",
  "purpose",
  "inputDeliverable",
  "inputDataDesc",
  "inputCondition",
  "outputDeliverable",
  "outputDataDesc",
  "outputCondition",
  "frequency",
  "triggerEvent",
  "duration",
  "issues",
  "exceptions",
  "remarks",
  "version",
];

/** 프로세스 상세 — 트리 + 탭 패널 */
export const ProcessDetail = ({
  nodeId,
  showTree = true,
  onEdit,
}: ProcessDetailProps) => {
  const t = useTranslations("process");
  const mt = useTranslations("metadata");
  const router = useRouter();
  const { data: node, isLoading } = useProcessDetail(nodeId);
  const { data: history } = useProcessHistory(nodeId);
  const { data: variants } = useProcessVariants(
    nodeId,
    Boolean(node && !node.variantOf && (node.level === "L3" || node.level === "L4")),
  );
  const { data: bpmnModels, isLoading: isBpmnLoading } = useBpmnList({
    nodeId: node?.level === "L4" ? undefined : nodeId,
    linkedNodeId: node?.level === "L4" ? nodeId : undefined,
    sort: "updated",
  }, {
    enabled: Boolean(node),
  });
  const approvalMutation = useRequestApproval(nodeId);
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(
    null,
  );

  const taskMetadataFilters = useMemo(
    () => (node ? { nodeId } : {}),
    [node, nodeId],
  );

  const { data: taskMetadataItems, isLoading: isTaskMetadataLoading } =
    useTaskAttributeList(taskMetadataFilters, {
      enabled: Boolean(node),
    });

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

  const bpmnModelColumns: DataTableColumn<BpmnModelDto>[] = [
    {
      key: "modelId",
      header: t("bpmnModelId"),
      cell: (model) => model.modelId,
    },
    {
      key: "registrationType",
      header: t("bpmnModelRegistrationType"),
      cell: (model) => (model.nodeId === nodeId ? "Model" : "Task"),
    },
    {
      key: "modelName",
      header: t("bpmnModelName"),
      cell: (model) => model.modelName,
    },
    {
      key: "processCode",
      header: t("code"),
      cell: (model) => model.processCode ?? "-",
      sortable: true,
      filter: "text",
      value: (model) => model.processCode ?? "",
    },
    {
      key: "processName",
      header: t("bpmnModelOwnerProcess"),
      cell: (model) => model.processName ?? "-",
      sortable: true,
      filter: "text",
      value: (model) => model.processName ?? "",
    },
    {
      key: "version",
      header: t("version"),
      cell: (model) => model.version,
    },
    {
      key: "createdAt",
      header: t("bpmnModelCreatedAt"),
      cell: (model) => new Date(model.createdAt).toLocaleString(),
    },
    {
      key: "action",
      header: t("bpmnModelShortcut"),
      className: "text-right",
      cell: (model) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push(`/bpmn/${model.modelId}`)}
        >
          {t("bpmnModelShortcut")}
        </Button>
      ),
    },
  ];

  const getTaskMetadataLabel = (key: TaskMetadataDetailKey) =>
    key === "version" ? t("version") : mt(key);

  const renderTaskMetadataValue = (
    item: TaskAttributeListItem,
    key: TaskMetadataDetailKey,
  ) => {
    if (key === "frequency") {
      return item.frequency ? mt(`frequencyOptions.${item.frequency}`) : "-";
    }

    return item[key] || "-";
  };

  if (isLoading) return <LoadingSpinner label={t("loading")} />;
  if (!node) return <EmptyState title={t("notFound")} />;

  return (
    <div
      className={
        showTree
          ? "flex h-[calc(100vh-3.5rem)] flex-col lg:flex-row"
          : "flex h-full min-h-0 flex-col"
      }
    >
      {showTree && (
        <aside className="w-full border-b p-4 lg:w-80 lg:border-r lg:border-b-0">
          <ProcessTree selectedId={nodeId} />
        </aside>
      )}

      <div className={showTree ? "flex-1 overflow-y-auto p-4" : "flex-1 overflow-y-auto p-6"}>
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
              onClick={() =>
                onEdit ? onEdit(node) : router.push(`/process/${nodeId}/edit`)
              }
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
            <TabsTrigger value="bpmn">{t("tabBpmnModels")}</TabsTrigger>
            <TabsTrigger value="taskMetadata">{t("tabTaskMetadata")}</TabsTrigger>
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
                    <dd>
                      {node.variantOf
                        ? t("variant.label")
                        : isEnterpriseScope(node.companyCode, node.businessUnitCode)
                          ? t("scope.enterpriseCommon")
                          : t("scope.scopedDedicated")}
                    </dd>
                  </div>
                  {node.variantOf && node.standardProcess && (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">
                        {t("variant.standardProcess")}
                      </dt>
                      <dd>
                        <Link
                          href={`/process/${node.standardProcess.nodeId}`}
                          className="text-primary hover:underline"
                        >
                          {node.standardProcess.code} {node.standardProcess.name}
                        </Link>
                      </dd>
                    </div>
                  )}
                  {(node.companyCode || node.businessUnitCode) && (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">{t("scope.label")}</dt>
                      <dd>{formatProcessScope(node) || "-"}</dd>
                    </div>
                  )}
                </dl>

                {!node.variantOf && (variants?.length ?? 0) > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-sm font-medium">{t("variant.listTitle")}</h4>
                    <ul className="space-y-2 text-sm">
                      {variants?.map((variant) => (
                        <li
                          key={variant.nodeId}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-muted-foreground">
                              {variant.code}
                            </p>
                            <p className="truncate">{variant.displayName ?? variant.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatProcessScope(variant)}
                            </p>
                          </div>
                          <Link
                            href={`/process/${variant.nodeId}`}
                            className="inline-flex h-[1.625rem] shrink-0 items-center rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2 text-xs hover:bg-muted"
                          >
                            {t("viewDetail")}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!node.variantOf &&
                  (node.variantCount ?? 0) > 0 &&
                  (node.level === "L3" || node.level === "L4") && (
                    <p className="text-xs text-muted-foreground">
                      {t("variant.impactHint", { count: node.variantCount ?? 0 })}
                    </p>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bpmn">
            {isBpmnLoading ? (
              <LoadingSpinner label={t("loading")} />
            ) : bpmnModels?.length ? (
              <DataTable
                columns={bpmnModelColumns}
                data={bpmnModels}
                rowKey={(model) => model.modelId}
                storageKey="pams-process-bpmn-models-grid"
              />
            ) : (
              <EmptyState title={t("bpmnModelEmpty")} />
            )}
          </TabsContent>

          <TabsContent value="taskMetadata">
            <div className="space-y-4">
              {isTaskMetadataLoading ? (
                <LoadingSpinner label={mt("loading")} />
              ) : taskMetadataItems?.length ? (
                <div className="space-y-4">
                  {taskMetadataItems.map((item) => (
                    <Card key={item.attrId}>
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-mono text-sm text-muted-foreground">
                            {item.processCode}
                          </p>
                          <CardTitle className="text-base">
                            {item.processName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {item.bpmnModelName ?? "-"}
                            {item.bpmnElementName
                              ? ` · ${item.bpmnElementName}`
                              : ""}
                          </p>
                        </div>
                        <StatusBadge status={item.processStatus} />
                      </CardHeader>
                      <CardContent>
                        <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          {taskMetadataDetailKeys.map((key) => (
                            <div key={key} className="space-y-1">
                              <dt className="text-muted-foreground">
                                {getTaskMetadataLabel(key)}
                              </dt>
                              <dd className="whitespace-pre-wrap break-words">
                                {renderTaskMetadataValue(item, key)}
                              </dd>
                            </div>
                          ))}
                          <div className="space-y-1">
                            <dt className="text-muted-foreground">
                              {mt("listUpdatedAt")}
                            </dt>
                            <dd>
                              {item.updatedAt
                                ? new Date(item.updatedAt).toLocaleString()
                                : "-"}
                            </dd>
                          </div>
                        </dl>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={t("taskMetadataEmpty")}
                  description={t("taskMetadataEmptyDesc")}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <DataTable
              columns={historyColumns}
              data={history ?? []}
              rowKey={(r) => r.historyId}
              storageKey="pams-process-history-grid"
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
