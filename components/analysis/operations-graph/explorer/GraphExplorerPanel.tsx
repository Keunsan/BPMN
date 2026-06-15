"use client";

import { FolderTree, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  ProcessNodeSelectDialog,
  type ProcessNodeSelection,
} from "@/components/process/ProcessNodeSelectDialog";
import { E2eProcessSelectDialog } from "@/components/e2e-process/E2eProcessSelectDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  GraphCenterProcessLevel,
  GraphNodeKind,
  OperationsGraphNode,
  OperationsGraphSummary,
} from "@/types/operations-graph";
import type { ProcessLevel } from "@/types/process";
import { GRAPH_NODE_KINDS } from "@/types/operations-graph";

type GraphExplorerPanelProps = {
  centerNodeId: number | null;
  centerNode?: OperationsGraphNode;
  centerKind?: GraphNodeKind;
  centerProcessLevel?: GraphCenterProcessLevel;
  onSelectCenter: (nodeId: number, level: GraphCenterProcessLevel) => void;
  onSelectE2eCenter?: (e2eProcessId: number) => void;
  nodeKinds: Record<GraphNodeKind, boolean>;
  onNodeKindChange: (kind: GraphNodeKind, enabled: boolean) => void;
  summary?: OperationsGraphSummary;
  isLoading?: boolean;
};

const PROCESS_SELECT_LEVELS: ProcessLevel[] = ["L1", "L2", "L3"];

const kindMarkClass: Record<GraphNodeKind, string> = {
  E2E: "pams-graph-explorer__kind-mark--e2e",
  L3: "pams-graph-explorer__kind-mark--l3",
  TASK: "pams-graph-explorer__kind-mark--task",
  APPLICATION: "pams-graph-explorer__kind-mark--application",
  TABLE: "pams-graph-explorer__kind-mark--table",
  INTERFACE: "pams-graph-explorer__kind-mark--interface",
};

const EDGE_LEGEND_KEYS = [
  "CONTAINS",
  "PRECEDES",
  "USES_SCREEN",
  "READS_TABLE",
] as const;

const ExplorerSection = ({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("pams-graph-explorer__section", className)}>
    <h3 className="pams-graph-explorer__section-title">{title}</h3>
    {hint ? <p className="pams-graph-explorer__section-hint">{hint}</p> : null}
    {children}
  </section>
);

/** 좌측 프로세스 탐색·필터 패널 */
export const GraphExplorerPanel = ({
  centerNodeId,
  centerNode,
  centerKind,
  centerProcessLevel,
  onSelectCenter,
  onSelectE2eCenter,
  nodeKinds,
  onNodeKindChange,
  summary,
  isLoading,
}: GraphExplorerPanelProps) => {
  const t = useTranslations("operationsGraph");
  const tCommon = useTranslations("common");
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [e2eDialogOpen, setE2eDialogOpen] = useState(false);

  const excludedGraphKind = useMemo((): GraphNodeKind | undefined => {
    if (centerKind === "E2E") {
      return "E2E";
    }
    if (centerProcessLevel === "L3") {
      return "L3";
    }
    if (!centerProcessLevel && centerKind === "TASK") {
      return "TASK";
    }
    return undefined;
  }, [centerKind, centerProcessLevel]);

  const selectedE2eId =
    centerKind === "E2E" && centerNodeId ? centerNodeId : null;

  const activeKindCount = useMemo(
    () =>
      GRAPH_NODE_KINDS.filter(
        (kind) => nodeKinds[kind] && kind !== excludedGraphKind,
      ).length,
    [nodeKinds, excludedGraphKind],
  );

  const filterableKinds = useMemo(
    () => GRAPH_NODE_KINDS.filter((kind) => kind !== excludedGraphKind),
    [excludedGraphKind],
  );

  const selectedProcess = useMemo<ProcessNodeSelection | null>(() => {
    if (!centerNodeId || !centerNode) {
      return null;
    }

    const level: ProcessLevel =
      centerProcessLevel ??
      (centerKind === "TASK" ? "L4" : "L3");

    return {
      nodeId: centerNodeId,
      code: centerNode.code ?? "",
      name: centerNode.label,
      level,
    };
  }, [centerNode, centerKind, centerNodeId, centerProcessLevel]);

  const handleConfirmProcess = (process: ProcessNodeSelection | null) => {
    if (
      process &&
      (process.level === "L1" ||
        process.level === "L2" ||
        process.level === "L3")
    ) {
      onSelectCenter(process.nodeId, process.level);
    }
  };

  const contextLevelLabel = centerProcessLevel ?? centerKind;

  return (
    <div className="pams-graph-explorer">
      <div className="pams-graph-explorer__context">
        <div className="pams-graph-explorer__context-main">
          <span className="pams-graph-explorer__context-label">
            {t("explorer.contextLabel")}
          </span>
          {!centerNodeId ? (
            <p className="pams-graph-explorer__context-empty">
              {t("explorer.contextEmpty")}
            </p>
          ) : isLoading && !centerNode ? (
            <p className="pams-graph-explorer__context-meta">
              {t("explorer.contextLoading")}
            </p>
          ) : (
            <>
              <p className="pams-graph-explorer__context-title">
                {centerNode?.label ?? t("explorer.contextLoading")}
              </p>
              <p className="pams-graph-explorer__context-meta">
                {centerNode?.code ? `${centerNode.code} · ` : ""}
                {contextLevelLabel
                  ? t(`nodeKindShort.${contextLevelLabel}`, {
                      defaultValue: String(contextLevelLabel),
                    })
                  : t("explorer.contextLoading")}
              </p>
            </>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pams-graph-explorer__context-action shrink-0"
            onClick={() => setProcessDialogOpen(true)}
            aria-label={t("explorer.processSelect")}
          >
            <FolderTree className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden min-[360px]:inline">{t("explorer.processSelect")}</span>
          </Button>
          {onSelectE2eCenter ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="pams-graph-explorer__context-action shrink-0"
              onClick={() => setE2eDialogOpen(true)}
              aria-label={t("explorer.e2eSelect")}
            >
              <GitBranch className="size-3.5 shrink-0" aria-hidden />
              <span className="hidden min-[360px]:inline">{t("explorer.e2eSelect")}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <ProcessNodeSelectDialog
        open={processDialogOpen}
        onOpenChange={setProcessDialogOpen}
        title={t("explorer.processSelect")}
        description={t("explorer.processSelectDesc")}
        allowedLevels={PROCESS_SELECT_LEVELS}
        selectedProcess={selectedProcess}
        helperText={t("explorer.processSelectHint")}
        confirmLabel={t("explorer.processSelectConfirm")}
        cancelLabel={tCommon("cancel")}
        onConfirm={handleConfirmProcess}
        contentClassName="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        treeShellClassName="max-h-[min(60vh,28rem)] overflow-y-auto rounded-md border p-2"
      />

      {onSelectE2eCenter ? (
        <E2eProcessSelectDialog
          open={e2eDialogOpen}
          onOpenChange={setE2eDialogOpen}
          selectedId={selectedE2eId}
          onConfirm={(process) => onSelectE2eCenter(process.e2eProcessId)}
        />
      ) : null}

      <ExplorerSection
        title={t("explorer.nodeTypeFilter")}
        hint={t("explorer.filterHint", { count: activeKindCount })}
        className="pams-graph-explorer__section--filters"
      >
        <ul className="pams-graph-explorer__filter-list">
          {filterableKinds.map((kind) => {
            const active = nodeKinds[kind];
            return (
              <li key={kind}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onNodeKindChange(kind, !active)}
                  className={cn(
                    "pams-graph-explorer__filter-row",
                    active && "pams-graph-explorer__filter-row--active",
                  )}
                >
                  <span
                    className={cn(
                      "pams-graph-explorer__kind-mark",
                      kindMarkClass[kind],
                    )}
                    aria-hidden
                  />
                  <span className="pams-graph-explorer__filter-label">
                    {t(`nodeKind.${kind}`)}
                  </span>
                  <span
                    className={cn(
                      "pams-graph-explorer__filter-state",
                      active && "pams-graph-explorer__filter-state--on",
                    )}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
        {centerNodeId && excludedGraphKind ? (
          <p className="pams-graph-explorer__section-hint mt-2">
            {t("explorer.centerKindExcluded", {
              kind: t(`nodeKindShort.${excludedGraphKind}`),
            })}
          </p>
        ) : null}
      </ExplorerSection>

      <ExplorerSection title={t("explorer.legend")}>
        <div className="pams-graph-explorer__legend-grid">
          {GRAPH_NODE_KINDS.map((kind) => (
            <div key={kind} className="pams-graph-explorer__legend-item">
              <span
                className={cn(
                  "pams-graph-explorer__kind-mark",
                  kindMarkClass[kind],
                )}
                aria-hidden
              />
              <span className="pams-graph-explorer__legend-label">
                {t(`nodeKindShort.${kind}`)}
              </span>
              <span className="pams-graph-explorer__legend-name">
                {t(`nodeKind.${kind}`)}
              </span>
            </div>
          ))}
        </div>
        <ul className="pams-graph-explorer__edge-legend">
          {EDGE_LEGEND_KEYS.map((kind) => (
            <li key={kind} className="pams-graph-explorer__edge-legend-item">
              <span
                className={cn(
                  "pams-graph-explorer__edge-sample",
                  `pams-graph-explorer__edge-sample--${kind.toLowerCase()}`,
                )}
                aria-hidden
              />
              <span>{t(`edgeKindShort.${kind}`)}</span>
            </li>
          ))}
        </ul>
      </ExplorerSection>

      <ExplorerSection
        title={t("explorer.summary")}
        className="pams-graph-explorer__section--summary"
      >
        {!centerNodeId ? (
          <p className="pams-graph-explorer__empty">{t("explorer.summaryEmpty")}</p>
        ) : isLoading ? (
          <LoadingSpinner className="py-3" />
        ) : (
          <>
            <div className="pams-graph-explorer__metric-primary">
              <div className="pams-graph-explorer__metric-cell">
                <span className="pams-graph-explorer__metric-label">
                  {t("explorer.nodeCount")}
                </span>
                <span className="pams-graph-explorer__metric-value">
                  {summary?.nodeCount ?? 0}
                </span>
              </div>
              <div className="pams-graph-explorer__metric-cell">
                <span className="pams-graph-explorer__metric-label">
                  {t("explorer.edgeCount")}
                </span>
                <span className="pams-graph-explorer__metric-value">
                  {summary?.edgeCount ?? 0}
                </span>
              </div>
            </div>
            <div className="pams-graph-explorer__metric-grid">
              {GRAPH_NODE_KINDS.map((kind) => (
                <div key={kind} className="pams-graph-explorer__metric-cell">
                  <span className="pams-graph-explorer__metric-label">
                    {t(`nodeKindShort.${kind}`)}
                  </span>
                  <span className="pams-graph-explorer__metric-value pams-graph-explorer__metric-value--sm">
                    {summary?.countsByKind[kind] ?? 0}
                  </span>
                </div>
              ))}
            </div>
            {summary?.truncated ? (
              <p className="pams-graph-explorer__truncated">
                {t("explorer.truncated")}
              </p>
            ) : null}
          </>
        )}
      </ExplorerSection>
    </div>
  );
};
