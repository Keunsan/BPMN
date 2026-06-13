"use client";

import { useTranslations } from "next-intl";

import { FilterField } from "@/components/common/layout/FilterField";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ProcessTree } from "@/components/process/ProcessTree";
import { Badge } from "@/components/ui/badge";
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
  OperationsGraphSummary,
} from "@/types/operations-graph";
import { GRAPH_NODE_KINDS } from "@/types/operations-graph";

type GraphExplorerPanelProps = {
  centerNodeId: number | null;
  onSelectCenter: (nodeId: number, level: "L3" | "L4") => void;
  depth: 1 | 2;
  onDepthChange: (depth: 1 | 2) => void;
  nodeKinds: Record<GraphNodeKind, boolean>;
  onNodeKindChange: (kind: GraphNodeKind, enabled: boolean) => void;
  summary?: OperationsGraphSummary;
  isLoading?: boolean;
};

const legendSwatchClass: Record<GraphNodeKind, string> = {
  L3: "pams-operations-graph-legend-swatch--l3",
  TASK: "pams-operations-graph-legend-swatch--task",
  APPLICATION: "pams-operations-graph-legend-swatch--application",
  TABLE: "pams-operations-graph-legend-swatch--table",
  INTERFACE: "pams-operations-graph-legend-swatch--interface",
};

/** 좌측 탐색·필터·범례·요약 패널 */
export const GraphExplorerPanel = ({
  centerNodeId,
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
    <div className="flex flex-col gap-4 p-3">
      <FilterField label={t("explorer.processSelect")}>
        <div className="max-h-[220px] overflow-auto rounded-md border border-slate-200/80 dark:border-slate-600/60">
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
      </FilterField>

      <FilterField label={t("explorer.depth")}>
        <Select
          value={String(depth)}
          onValueChange={(value) => onDepthChange(value === "1" ? 1 : 2)}
        >
          <SelectTrigger variant="filter" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">{t("explorer.depth1")}</SelectItem>
            <SelectItem value="2">{t("explorer.depth2")}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>

      <div className="space-y-2">
        <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
          {t("explorer.nodeTypeFilter")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {GRAPH_NODE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onNodeKindChange(kind, !nodeKinds[kind])}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors",
                nodeKinds[kind]
                  ? "border-primary/30 bg-primary/8 text-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              {t(`nodeKind.${kind}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
          {t("explorer.legend")}
        </p>
        <ul className="space-y-1.5">
          {GRAPH_NODE_KINDS.map((kind) => (
            <li key={kind} className="flex items-center gap-2 text-[11px] text-foreground">
              <span
                className={cn(
                  "pams-operations-graph-legend-swatch",
                  legendSwatchClass[kind],
                )}
              />
              <span>{t(`nodeKind.${kind}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
          {t("explorer.summary")}
        </p>
        {isLoading ? (
          <LoadingSpinner className="py-4" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="pams-operations-graph-metric">
              <span className="text-[10px] text-muted-foreground">
                {t("explorer.nodeCount")}
              </span>
              <span className="text-[14px] font-semibold tabular-nums">
                {summary?.nodeCount ?? 0}
              </span>
            </div>
            <div className="pams-operations-graph-metric">
              <span className="text-[10px] text-muted-foreground">
                {t("explorer.edgeCount")}
              </span>
              <span className="text-[14px] font-semibold tabular-nums">
                {summary?.edgeCount ?? 0}
              </span>
            </div>
            {GRAPH_NODE_KINDS.map((kind) => (
              <div key={kind} className="pams-operations-graph-metric">
                <span className="text-[10px] text-muted-foreground">
                  {t(`nodeKind.${kind}`)}
                </span>
                <span className="text-[13px] font-semibold tabular-nums">
                  {summary?.countsByKind[kind] ?? 0}
                </span>
              </div>
            ))}
          </div>
        )}
        {summary?.truncated ? (
          <Badge variant="secondary" className="text-[10px]">
            {t("explorer.truncated")}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};
