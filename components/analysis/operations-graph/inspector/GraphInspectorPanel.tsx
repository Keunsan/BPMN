"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { E2eBpmnViewerSheet } from "@/components/bpmn/E2eBpmnViewerSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";
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
  E2E: "pams-graph-inspector__kind-mark--e2e",
  L3: "pams-graph-inspector__kind-mark--l3",
  TASK: "pams-graph-inspector__kind-mark--task",
  APPLICATION: "pams-graph-inspector__kind-mark--application",
  TABLE: "pams-graph-inspector__kind-mark--table",
  INTERFACE: "pams-graph-inspector__kind-mark--interface",
};

type OperationsSectionKey = "impact" | "usage" | "crud" | "incident" | "change";

const OPERATIONS_FIELD_KEYS: Record<OperationsSectionKey, string[]> = {
  impact: ["scope", "relatedSystems", "dependentTasks"],
  usage: ["dailyCalls", "lastUsed", "activeUsers"],
  crud: ["create", "read", "update", "delete"],
  incident: ["lastIncident", "openCount", "mttr"],
  change: ["lastChange", "changeFrequency", "owner"],
};

type GraphInspectorPanelProps = {
  graph?: OperationsGraphResult;
  centerNode?: OperationsGraphNode;
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

const OperationsDataSection = ({
  sectionKey,
  title,
}: {
  sectionKey: OperationsSectionKey;
  title: string;
}) => {
  const t = useTranslations("operationsGraph");

  return (
    <InspectorSection title={title}>
      <dl className="pams-graph-inspector__field-grid">
        {OPERATIONS_FIELD_KEYS[sectionKey].map((fieldKey) => (
          <div key={fieldKey} className="pams-graph-inspector__field-row">
            <dt className="pams-graph-inspector__field-label">
              {t(`inspector.fields.${sectionKey}.${fieldKey}`)}
            </dt>
            <dd className="pams-graph-inspector__field-value">
              {t("inspector.noValue")}
            </dd>
          </div>
        ))}
      </dl>
    </InspectorSection>
  );
};

/** 우측 노드 Inspector — 선택 노드 상세·운영 메타 */
export const GraphInspectorPanel = ({
  graph,
  centerNode,
  selectedNodeId,
  onSelectNode,
}: GraphInspectorPanelProps) => {
  const t = useTranslations("operationsGraph");
  const ts = useTranslations("status");
  const [e2eViewerTarget, setE2eViewerTarget] = useState<{
    e2eProcessId: number;
    label: string;
    code?: string;
    modelId?: number | null;
  } | null>(null);

  const node = useMemo(() => {
    if (!graph) {
      return undefined;
    }
    if (selectedNodeId) {
      return graph.nodes.find((item) => item.id === selectedNodeId);
    }
    return centerNode ?? graph.centerNode;
  }, [graph, selectedNodeId, centerNode]);

  const relatedEntries = useMemo(
    () => (graph && node ? findRelatedEntries(graph, node.id) : []),
    [graph, node],
  );

  const connections = useMemo(
    () =>
      graph && node
        ? countConnections(graph, node.id)
        : { incoming: 0, outgoing: 0, total: 0 },
    [graph, node],
  );

  if (!graph) {
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
        <EmptyState
          title={t("inspector.emptyTitle")}
          description={t("inspector.emptyDescription")}
          className="py-10"
        />
      </div>
    );
  }

  const showStatus = node.status ? isProcessStatus(node.status) : false;
  const description = node.meta?.description
    ? String(node.meta.description)
    : null;
  const e2eCenter =
    graph.centerNode?.kind === "E2E"
      ? graph.centerNode
      : node.kind === "E2E"
        ? node
        : null;
  const e2eViewerId = e2eCenter ? Number(e2eCenter.sourceId) : null;
  const e2eViewerModelId =
    e2eCenter && typeof e2eCenter.meta?.modelId === "number"
      ? e2eCenter.meta.modelId
      : null;
  const inE2eFlow = Boolean(node.meta?.inE2eFlow);
  const l3NodeId = node.kind === "L3" ? Number(node.sourceId) : null;

  const openE2eViewer = () => {
    if (!e2eViewerId || !Number.isFinite(e2eViewerId)) {
      return;
    }
    setE2eViewerTarget({
      e2eProcessId: e2eViewerId,
      label: e2eCenter?.label ?? node.label,
      code: e2eCenter?.code ?? node.code,
      modelId: e2eViewerModelId,
    });
  };

  return (
    <>
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

      {e2eCenter || inE2eFlow ? (
        <section className="pams-graph-inspector__actions border-b px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {e2eCenter ? (
              <Button type="button" size="sm" onClick={openE2eViewer}>
                {t("inspector.viewE2eBpmn")}
              </Button>
            ) : null}
            {inE2eFlow && l3NodeId ? (
              <Link
                href={`/process?nodeId=${l3NodeId}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("inspector.editL3Bpmn")}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

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

      <OperationsDataSection sectionKey="impact" title={t("inspector.impact")} />
      <OperationsDataSection sectionKey="usage" title={t("inspector.usage")} />
      <OperationsDataSection sectionKey="crud" title={t("inspector.crud")} />
      <OperationsDataSection sectionKey="incident" title={t("inspector.incident")} />
      <OperationsDataSection sectionKey="change" title={t("inspector.change")} />

      <p className="pams-graph-inspector__operations-hint">
        {t("inspector.placeholderHint")}
      </p>
    </div>
    <E2eBpmnViewerSheet
      e2eProcessId={e2eViewerTarget?.e2eProcessId ?? null}
      e2eLabel={e2eViewerTarget?.label}
      e2eCode={e2eViewerTarget?.code}
      modelId={e2eViewerTarget?.modelId}
      onClose={() => setE2eViewerTarget(null)}
    />
    </>
  );
};
