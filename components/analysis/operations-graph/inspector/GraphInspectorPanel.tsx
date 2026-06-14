"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import type { ProcessStatus } from "@/types/process";
import type {
  GraphNodeKind,
  OperationsGraphEdge,
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

const kindAccentClass: Record<GraphNodeKind, string> = {
  L3: "pams-graph-inspector__kind-mark--l3",
  TASK: "pams-graph-inspector__kind-mark--task",
  APPLICATION: "pams-graph-inspector__kind-mark--application",
  TABLE: "pams-graph-inspector__kind-mark--table",
  INTERFACE: "pams-graph-inspector__kind-mark--interface",
};

type GraphInspectorPanelProps = {
  graph?: OperationsGraphResult;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

type RelatedEntry = {
  node: OperationsGraphNode;
  edgeKind: OperationsGraphEdge["kind"];
  direction: "in" | "out";
};

const findRelatedEntries = (
  graph: OperationsGraphResult,
  nodeId: string,
): RelatedEntry[] => {
  const entries: RelatedEntry[] = [];

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      const node = graph.nodes.find((item) => item.id === edge.target);
      if (node) {
        entries.push({ node, edgeKind: edge.kind, direction: "out" });
      }
    }
    if (edge.target === nodeId) {
      const node = graph.nodes.find((item) => item.id === edge.source);
      if (node) {
        entries.push({ node, edgeKind: edge.kind, direction: "in" });
      }
    }
  }

  return entries.sort((a, b) => {
    if (a.direction !== b.direction) {
      return a.direction === "in" ? -1 : 1;
    }
    if (a.edgeKind !== b.edgeKind) {
      const rank = (entry: RelatedEntry) => {
        if (entry.edgeKind === "CONTAINS" && entry.direction === "in") {
          return 0;
        }
        if (entry.edgeKind === "PRECEDES") {
          return 1;
        }
        return 2;
      };
      return rank(a) - rank(b);
    }
    return a.node.label.localeCompare(b.node.label, "ko");
  });
};

const getRelationLabel = (
  edgeKind: OperationsGraphEdge["kind"],
  direction: "in" | "out",
  t: (key: string) => string,
): string => {
  if (edgeKind === "PRECEDES") {
    return direction === "in"
      ? t("inspector.predecessor")
      : t("inspector.successor");
  }

  const directionLabel =
    direction === "in"
      ? t("inspector.directionIn")
      : t("inspector.directionOut");

  return `${t(`edgeKindShort.${edgeKind}`)} · ${directionLabel}`;
};

const countConnections = (graph: OperationsGraphResult, nodeId: string) => {
  let incoming = 0;
  let outgoing = 0;

  for (const edge of graph.edges) {
    if (edge.source === nodeId) {
      outgoing += 1;
    }
    if (edge.target === nodeId) {
      incoming += 1;
    }
  }

  return { incoming, outgoing, total: incoming + outgoing };
};

const InspectorSection = ({
  title,
  count,
  children,
  className,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("pams-graph-inspector__section", className)}>
    <div className="pams-graph-inspector__section-head">
      <h3 className="pams-graph-inspector__section-title">{title}</h3>
      {count !== undefined ? (
        <span className="pams-graph-inspector__section-count">
          {count.toLocaleString()}
        </span>
      ) : null}
    </div>
    {children}
  </section>
);

const MetricItem = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "critical" | "muted";
}) => (
  <div className="pams-graph-inspector__metric">
    <dt className="pams-graph-inspector__metric-label">{label}</dt>
    <dd
      className={cn(
        "pams-graph-inspector__metric-value",
        tone === "critical" && "pams-graph-inspector__metric-value--critical",
        tone === "muted" && "pams-graph-inspector__metric-value--muted",
      )}
    >
      {value}
    </dd>
  </div>
);

const ExtensionPlaceholder = ({ hint }: { hint: string }) => (
  <p className="pams-graph-inspector__empty">{hint}</p>
);

/** 우측 노드 Inspector — 선택 노드 상세·운영 메타 */
export const GraphInspectorPanel = ({
  graph,
  selectedNodeId,
  onSelectNode,
}: GraphInspectorPanelProps) => {
  const t = useTranslations("operationsGraph");
  const ts = useTranslations("status");

  const node = useMemo(
    () => graph?.nodes.find((item) => item.id === selectedNodeId),
    [graph, selectedNodeId],
  );

  const relatedEntries = useMemo(
    () =>
      graph && selectedNodeId
        ? findRelatedEntries(graph, selectedNodeId)
        : [],
    [graph, selectedNodeId],
  );

  const connections = useMemo(
    () =>
      graph && selectedNodeId
        ? countConnections(graph, selectedNodeId)
        : { incoming: 0, outgoing: 0, total: 0 },
    [graph, selectedNodeId],
  );

  if (!selectedNodeId || !graph) {
    return (
      <div className="pams-graph-inspector pams-graph-inspector--empty">
        <EmptyState
          title={t("inspector.emptyTitle")}
          description={t("inspector.emptyDescription")}
          className="py-10"
        />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="pams-graph-inspector pams-graph-inspector--empty">
        <EmptyState title={t("inspector.notFound")} className="py-10" />
      </div>
    );
  }

  const showStatus = node.status ? isProcessStatus(node.status) : false;
  const description = node.meta?.description
    ? String(node.meta.description)
    : null;

  return (
    <div className="pams-graph-inspector">
      <header className="pams-graph-inspector__hero">
        <div className="pams-graph-inspector__hero-top">
          <span
            className={cn(
              "pams-graph-inspector__kind-mark",
              kindAccentClass[node.kind as GraphNodeKind],
            )}
            aria-hidden
          />
          <span className="pams-graph-inspector__kind-label">
            {t(`nodeKind.${node.kind as GraphNodeKind}`)}
          </span>
        </div>

        <h2 className="pams-graph-inspector__title">{node.label}</h2>

        {node.code ? (
          <p className="pams-graph-inspector__code">{node.code}</p>
        ) : null}

        <dl className="pams-graph-inspector__metrics">
          <MetricItem
            label={t("inspector.status")}
            value={
              showStatus ? ts(node.status as ProcessStatus) : t("inspector.noValue")
            }
            tone={showStatus ? "default" : "muted"}
          />
          <MetricItem
            label={t("inspector.importance")}
            value={
              node.isCritical
                ? t("inspector.importanceCritical")
                : t("inspector.importanceNormal")
            }
            tone={node.isCritical ? "critical" : "muted"}
          />
          <MetricItem
            label={t("inspector.connections")}
            value={t("inspector.connectionSummary", {
              total: connections.total,
              incoming: connections.incoming,
              outgoing: connections.outgoing,
            })}
          />
        </dl>
      </header>

      <InspectorSection title={t("inspector.description")}>
        <p
          className={cn(
            "pams-graph-inspector__description",
            !description && "pams-graph-inspector__description--empty",
          )}
        >
          {description ?? t("inspector.descriptionPlaceholder")}
        </p>
      </InspectorSection>

      <InspectorSection
        title={t("inspector.relatedNodes")}
        count={relatedEntries.length}
      >
        {relatedEntries.length === 0 ? (
          <p className="pams-graph-inspector__empty">{t("inspector.noRelated")}</p>
        ) : (
          <ul className="pams-graph-inspector__related-list">
            {relatedEntries.map(({ node: related, edgeKind, direction }) => (
              <li key={`${related.id}-${direction}-${edgeKind}`}>
                <button
                  type="button"
                  onClick={() => onSelectNode(related.id)}
                  className="pams-graph-inspector__related-row"
                >
                  <span
                    className={cn(
                      "pams-graph-inspector__kind-mark pams-graph-inspector__kind-mark--sm",
                      kindAccentClass[related.kind],
                    )}
                    aria-hidden
                  />
                  <span className="pams-graph-inspector__related-body">
                    <span className="pams-graph-inspector__related-label">
                      {related.label}
                    </span>
                    <span className="pams-graph-inspector__related-meta">
                      {t(`nodeKindShort.${related.kind}`)}
                      {related.code ? ` · ${related.code}` : ""}
                      {" · "}
                      {getRelationLabel(edgeKind, direction, t)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </InspectorSection>

      <div className="pams-graph-inspector__group-label">
        {t("inspector.operationsGroup")}
      </div>

      <InspectorSection title={t("inspector.impact")}>
        <ExtensionPlaceholder hint={t("inspector.noData")} />
      </InspectorSection>

      <InspectorSection title={t("inspector.usage")}>
        <ExtensionPlaceholder hint={t("inspector.noData")} />
      </InspectorSection>

      <InspectorSection title={t("inspector.crud")}>
        <ExtensionPlaceholder hint={t("inspector.noData")} />
      </InspectorSection>

      <InspectorSection title={t("inspector.incident")}>
        <ExtensionPlaceholder hint={t("inspector.noData")} />
      </InspectorSection>

      <InspectorSection title={t("inspector.change")}>
        <ExtensionPlaceholder hint={t("inspector.noData")} />
      </InspectorSection>
    </div>
  );
};
