"use client";

import { useTranslations } from "next-intl";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ProcessTree } from "@/components/process/ProcessTree";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  GraphNodeKind,
  OperationsGraphNode,
  OperationsGraphSummary,
} from "@/types/operations-graph";
import { GRAPH_NODE_KINDS } from "@/types/operations-graph";

type GraphExplorerPanelProps = {
  centerNodeId: number | null;
  centerNode?: OperationsGraphNode;
  centerKind?: GraphNodeKind;
  onSelectCenter: (nodeId: number, level: "L3" | "L4") => void;
  depth: 1 | 2;
  onDepthChange: (depth: 1 | 2) => void;
  nodeKinds: Record<GraphNodeKind, boolean>;
  onNodeKindChange: (kind: GraphNodeKind, enabled: boolean) => void;
  summary?: OperationsGraphSummary;
  isLoading?: boolean;
};

const kindMarkClass: Record<GraphNodeKind, string> = {
  L3: "pams-graph-explorer__kind-mark--l3",
  TASK: "pams-graph-explorer__kind-mark--task",
  APPLICATION: "pams-graph-explorer__kind-mark--application",
  TABLE: "pams-graph-explorer__kind-mark--table",
  INTERFACE: "pams-graph-explorer__kind-mark--interface",
};

const ExplorerSection = ({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("pams-graph-explorer__section", className)}>
    <h3 className="pams-graph-explorer__section-title">{title}</h3>
    {children}
  </section>
);

/** 좌측 프로세스 탐색·필터 패널 */
export const GraphExplorerPanel = ({
  centerNodeId,
  centerNode,
  centerKind,
  onSelectCenter,
  depth,
  onDepthChange,
  nodeKinds,
  onNodeKindChange,
  summary,
  isLoading,
}: GraphExplorerPanelProps) => {
  const t = useTranslations("operationsGraph");

  return (
    <div className="pams-graph-explorer">
      <div className="pams-graph-explorer__context">
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
              {centerKind
                ? t(`nodeKindShort.${centerKind}`)
                : t("explorer.contextLoading")}
              {" · "}
              {depth === 1 ? t("explorer.depth1") : t("explorer.depth2")}
            </p>
          </>
        )}
      </div>

      <ExplorerSection title={t("explorer.scope")}>
        <div className="pams-graph-explorer__tree-shell">
          <ProcessTree
            variant="picker"
            selectedId={centerNodeId ?? undefined}
            fixSearchOnScroll
            onSelect={(node) => {
              if (node.level === "L3" || node.level === "L4") {
                onSelectCenter(node.nodeId, node.level);
              }
            }}
          />
        </div>
        <div className="pams-graph-explorer__depth">
          <span className="pams-graph-explorer__field-label">
            {t("explorer.depth")}
          </span>
          <Select
            value={String(depth)}
            onValueChange={(value) => onDepthChange(value === "1" ? 1 : 2)}
          >
            <SelectTrigger variant="filter" className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t("explorer.depth1")}</SelectItem>
              <SelectItem value="2">{t("explorer.depth2")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ExplorerSection>

      <ExplorerSection
        title={t("explorer.nodeTypeFilter")}
        className="pams-graph-explorer__section--filters"
      >
        <ul className="pams-graph-explorer__filter-list">
          {GRAPH_NODE_KINDS.map((kind) => {
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
