"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { BpmnDrilldownViewer } from "@/components/bpmn/BpmnDrilldownViewer";
import type { DrilldownViewerLink } from "@/components/bpmn/pams-drilldown-provider";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { E2eProcessFlowSteps } from "@/components/e2e-process/E2eProcessFlowSteps";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBpmnDetail, useBpmnList } from "@/lib/query/hooks/useBpmn";
import {
  useDeleteE2eProcess,
  useEnsureE2eBpmn,
  useE2eProcessDetail,
} from "@/lib/query/hooks/useE2eProcess";
import { useRouter } from "@/lib/i18n/navigation";
import { buildE2eFlowSteps, type E2eFlowParticipant } from "@/lib/utils/bpmn-e2e-flow";
import { parseProcessLinkInfo } from "@/lib/utils/bpmn-link";
import type { E2eProcessDto } from "@/types/e2e-process";

type E2eProcessDetailProps = {
  e2eProcessId: number;
  onEdit?: (process: E2eProcessDto) => void;
  onDeleted?: () => void;
};

/** E2E 프로세스 상세 — 실행 흐름 중심 탭 패널 */
export const E2eProcessDetail = ({
  e2eProcessId,
  onEdit,
  onDeleted,
}: E2eProcessDetailProps) => {
  const t = useTranslations("e2eProcess");
  const router = useRouter();
  const { data: process, isLoading } = useE2eProcessDetail(e2eProcessId);
  const needsModelLookup = Boolean(process && !process.currentBpmnModelId);
  const { data: fallbackModels, isLoading: isFallbackModelsLoading } = useBpmnList(
    { e2eProcessId, modelKind: "E2E" },
    { enabled: needsModelLookup },
  );

  const resolvedModelId = useMemo(() => {
    if (process?.currentBpmnModelId) {
      return process.currentBpmnModelId;
    }
    const models = fallbackModels ?? [];
    const current = models.find((item) => item.isCurrent);
    if (current) {
      return current.modelId;
    }
    return models[0]?.modelId ?? 0;
  }, [fallbackModels, process?.currentBpmnModelId]);

  const { data: model, isLoading: isModelLoading } = useBpmnDetail(resolvedModelId);
  const ensureBpmn = useEnsureE2eBpmn();
  const deleteMutation = useDeleteE2eProcess();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { steps, participants } = useMemo(
    () =>
      buildE2eFlowSteps({
        bpmnXml: model?.bpmnXml ?? null,
        elements: model?.elements ?? [],
      }),
    [model?.bpmnXml, model?.elements],
  );

  const links = useMemo((): Record<string, DrilldownViewerLink> => {
    const map: Record<string, DrilldownViewerLink> = {};
    for (const el of model?.elements ?? []) {
      if (!el.linkedNodeId) {
        continue;
      }
      const info = parseProcessLinkInfo(
        el.linkedNodeId,
        el.linkedProcessCode ?? String(el.linkedNodeId),
        el.linkedProcessName ?? el.elementName ?? "",
        el.elementType,
        el.properties,
      );
      map[el.elementBpmnId] = {
        nodeId: info.nodeId,
        code: info.code,
        name: info.name,
        linkKind: info.linkKind,
      };
    }
    return map;
  }, [model?.elements]);

  const rootLabel =
    process?.code && process?.name
      ? `${process.code} · ${process.name}`
      : (process?.name ?? t("detailTitle"));

  const participantColumns: DataTableColumn<E2eFlowParticipant>[] = [
    {
      key: "stepNo",
      header: t("flowStepColumn"),
      cell: (row) => row.stepNo,
    },
    {
      key: "code",
      header: t("code"),
      cell: (row) => row.linkedProcessCode ?? "-",
    },
    {
      key: "name",
      header: t("name"),
      cell: (row) => row.linkedProcessName ?? "-",
    },
    {
      key: "action",
      header: t("viewProcess"),
      className: "text-right",
      cell: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push(`/process/${row.linkedNodeId}`)}
        >
          {t("viewProcess")}
        </Button>
      ),
    },
  ];

  const openBpmnEditor = async () => {
    if (!process) {
      return;
    }
    const { modelId: nextModelId } = await ensureBpmn.mutateAsync(process.e2eProcessId);
    router.push(`/bpmn/${nextModelId}`);
  };

  if (isLoading || !process) {
    return <LoadingSpinner className="py-8" />;
  }

  const hasModel = resolvedModelId > 0;
  const isResolvingModel =
    isModelLoading || (needsModelLookup && isFallbackModelsLoading);
  const participantCount =
    process.participantL3Count ?? participants.length ?? model?.elements?.filter(
      (el) => el.linkedNodeId != null,
    ).length ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-sm text-muted-foreground">{process.code}</p>
            <h2 className="text-xl font-semibold">{process.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={process.status} />
              <span className="text-sm text-muted-foreground">
                v{process.version}
              </span>
              <span className="text-sm text-muted-foreground">
                · {t("participantL3Count", { count: participantCount })}
              </span>
            </div>
            {process.description ? (
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {process.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {onEdit ? (
              <Button variant="outline" size="sm" onClick={() => onEdit(process)}>
                {t("edit")}
              </Button>
            ) : null}
            <Button
              size="sm"
              onClick={() => void openBpmnEditor()}
              disabled={ensureBpmn.isPending}
            >
              {hasModel ? t("editFlow") : t("createFlow")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
        <Tabs defaultValue="flow" className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="flow">{t("tabFlow")}</TabsTrigger>
            <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
            <TabsTrigger value="participants">
              {t("tabParticipants", { count: participantCount })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flow" className="mt-0 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {isResolvingModel ? (
              <LoadingSpinner label={t("flowLoading")} />
            ) : !hasModel ? (
              <EmptyState
                title={t("flowEmptyTitle")}
                description={t("flowEmptyDesc")}
                action={
                  <Button
                    size="sm"
                    disabled={ensureBpmn.isPending}
                    onClick={() => void openBpmnEditor()}
                  >
                    {t("createFlow")}
                  </Button>
                }
              />
            ) : (
              <>
                {steps.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{t("flowStepsTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <E2eProcessFlowSteps steps={steps} />
                    </CardContent>
                  </Card>
                ) : null}
                <div className="flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-lg border">
                  <BpmnDrilldownViewer
                    rootLabel={rootLabel}
                    xml={model?.bpmnXml ?? null}
                    links={links}
                    className="min-h-[280px] flex-1"
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="overview" className="mt-0 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("basicInfo")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-muted-foreground">{t("description")}</p>
                  <p className="whitespace-pre-wrap">
                    {process.description ?? t("noDescription")}
                  </p>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{t("code")}</dt>
                    <dd className="font-mono">{process.code}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("status")}</dt>
                    <dd>
                      <StatusBadge status={process.status} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("participants")}</dt>
                    <dd>{t("participantL3Count", { count: participantCount })}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("version")}</dt>
                    <dd>v{process.version}</dd>
                  </div>
                </dl>
                {process.tags?.length ? (
                  <div>
                    <p className="mb-2 text-muted-foreground">{t("tags")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {process.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="participants" className="mt-0 overflow-y-auto">
            {participants.length ? (
              <DataTable
                columns={participantColumns}
                data={participants}
                rowKey={(row) => row.elementBpmnId}
                storageKey="pams-e2e-participants-grid"
              />
            ) : (
              <EmptyState
                title={t("participantsEmptyTitle")}
                description={t("participantsEmptyDesc")}
                action={
                  hasModel ? undefined : (
                    <Button
                      size="sm"
                      disabled={ensureBpmn.isPending}
                      onClick={() => void openBpmnEditor()}
                    >
                      {t("createFlow")}
                    </Button>
                  )
                }
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="shrink-0 border-t px-6 py-3">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
        >
          {t("delete")}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc")}
        confirmLabel={t("delete")}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(process.e2eProcessId);
          setDeleteOpen(false);
          onDeleted?.();
        }}
      />
    </div>
  );
};
