"use client";

import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProcessStatus } from "@/types/process";
import type {
  GraphNodeKind,
  OperationsGraphNode,
  OperationsGraphResult,
} from "@/types/operations-graph";

const PROCESS_STATUSES: ProcessStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "OBSOLETE",
];

const isProcessStatus = (value: string): value is ProcessStatus =>
  PROCESS_STATUSES.includes(value as ProcessStatus);

type GraphInspectorPanelProps = {
  graph?: OperationsGraphResult;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

const InspectorSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="pams-operations-graph-inspector-section px-3 py-3">
    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h3>
    {children}
  </section>
);

const PlaceholderRows = ({ count = 2 }: { count?: number }) => (
  <div className="space-y-1.5">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="h-7 rounded-md border border-dashed border-slate-200/80 bg-slate-50/50 dark:border-slate-600/50 dark:bg-slate-900/30"
      />
    ))}
  </div>
);

const findRelatedNodes = (
  graph: OperationsGraphResult,
  nodeId: string,
): OperationsGraphNode[] => {
  const relatedIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      relatedIds.add(edge.target);
    }
    if (edge.target === nodeId) {
      relatedIds.add(edge.source);
    }
  }
  return graph.nodes.filter((node) => relatedIds.has(node.id));
};

/** 우측 노드 상세·관련 정보 패널 */
export const GraphInspectorPanel = ({
  graph,
  selectedNodeId,
  onSelectNode,
}: GraphInspectorPanelProps) => {
  const t = useTranslations("operationsGraph");

  if (!selectedNodeId || !graph) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState
          title={t("inspector.emptyTitle")}
          description={t("inspector.emptyDescription")}
        />
      </div>
    );
  }

  const node = graph.nodes.find((item) => item.id === selectedNodeId);
  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <EmptyState title={t("inspector.notFound")} />
      </div>
    );
  }

  const relatedNodes = findRelatedNodes(graph, selectedNodeId);

  return (
    <div className="flex flex-col">
      <div className="border-b border-slate-200/80 px-3 py-3 dark:border-slate-600/60">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {t(`nodeKind.${node.kind as GraphNodeKind}`)}
          </Badge>
          {node.status && isProcessStatus(node.status) ? (
            <StatusBadge status={node.status} />
          ) : null}
          {node.isCritical ? (
            <Badge variant="destructive" className="text-[10px]">
              {t("inspector.critical")}
            </Badge>
          ) : null}
        </div>
        <h2 className="text-[14px] font-semibold leading-snug text-foreground">
          {node.label}
        </h2>
        {node.code ? (
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            {node.code}
          </p>
        ) : null}
      </div>

      <InspectorSection title={t("inspector.description")}>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {node.meta?.description
            ? String(node.meta.description)
            : t("inspector.descriptionPlaceholder")}
        </p>
      </InspectorSection>

      <InspectorSection title={t("inspector.relatedNodes")}>
        {relatedNodes.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            {t("inspector.noRelated")}
          </p>
        ) : (
          <ul className="space-y-1">
            {relatedNodes.map((related) => (
              <li key={related.id}>
                <button
                  type="button"
                  onClick={() => onSelectNode(related.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md border border-slate-200/80 px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-muted/50 dark:border-slate-600/60",
                  )}
                >
                  <span className="truncate font-medium">{related.label}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {t(`nodeKind.${related.kind}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </InspectorSection>

      <InspectorSection title={t("inspector.impact")}>
        <PlaceholderRows />
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("inspector.placeholderHint")}
        </p>
      </InspectorSection>

      <InspectorSection title={t("inspector.crud")}>
        <PlaceholderRows count={3} />
      </InspectorSection>

      <InspectorSection title={t("inspector.usage")}>
        <PlaceholderRows count={2} />
      </InspectorSection>

      <InspectorSection title={t("inspector.incident")}>
        <PlaceholderRows count={1} />
      </InspectorSection>
    </div>
  );
};
