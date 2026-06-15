"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";

import { GraphNodeBadge } from "@/components/analysis/operations-graph/canvas/GraphNodeBadge";
import { cn } from "@/lib/utils";
import type { GraphNodeKind } from "@/types/operations-graph";
import type { ProcessStatus } from "@/types/process";

export type GraphNodeData = {
  label: string;
  code?: string;
  kind: GraphNodeKind;
  status?: string;
  isCritical?: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
  tableListMeta?: { index: number; total: number };
};

const PROCESS_STATUSES: ProcessStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "OBSOLETE",
];

const isProcessStatus = (value: string): value is ProcessStatus =>
  PROCESS_STATUSES.includes(value as ProcessStatus);

const isResourceKind = (kind: GraphNodeKind): boolean =>
  kind === "APPLICATION" || kind === "TABLE" || kind === "INTERFACE";

const processFlowKindClassMap: Record<"TASK" | "L3" | "E2E", string> = {
  TASK: "pams-operations-graph-node-card--kind-task",
  L3: "pams-operations-graph-node-card--kind-l3",
  E2E: "pams-operations-graph-node-card--kind-e2e",
};

const resourceKindClassMap: Record<
  "APPLICATION" | "TABLE" | "INTERFACE",
  string
> = {
  APPLICATION: "pams-operations-graph-resource-card--kind-application",
  TABLE: "pams-operations-graph-resource-card--kind-table",
  INTERFACE: "pams-operations-graph-resource-card--kind-interface",
};

/** APP·TABLE·IF — Task 하위 세로 체인 칩 */
const GraphResourceNodeCard = ({
  data,
  selected,
}: NodeProps<Node<GraphNodeData>>) => {
  const t = useTranslations("operationsGraph");
  const hasOutgoing = data.kind !== "INTERFACE";
  const isTableListItem = data.kind === "TABLE" && Boolean(data.tableListMeta);
  const listIndex = data.tableListMeta?.index ?? 0;
  const listTotal = data.tableListMeta?.total ?? 1;

  return (
    <article
      className={cn(
        "pams-operations-graph-resource-card",
        resourceKindClassMap[data.kind as keyof typeof resourceKindClassMap],
        isTableListItem && "pams-operations-graph-resource-card--table-list-item",
        isTableListItem &&
          listIndex === 0 &&
          "pams-operations-graph-resource-card--table-list-first",
        isTableListItem &&
          listIndex === listTotal - 1 &&
          "pams-operations-graph-resource-card--table-list-last",
        isTableListItem &&
          listTotal > 1 &&
          listIndex > 0 &&
          listIndex < listTotal - 1 &&
          "pams-operations-graph-resource-card--table-list-middle",
        selected && "pams-operations-graph-resource-card--selected",
        data.highlighted && "pams-operations-graph-resource-card--highlighted",
        data.isCritical && "pams-operations-graph-resource-card--critical",
        data.dimmed && "pams-operations-graph-resource-card--dimmed",
      )}
      aria-label={data.label}
    >
      <Handle
        id="chain-in"
        type="target"
        position={Position.Top}
        className="pams-operations-graph-handle pams-operations-graph-handle--resource"
      />

      {!isTableListItem ? (
        <GraphNodeBadge
          variant="kind"
          kind={data.kind}
          label={t(`nodeKindShort.${data.kind}`)}
        />
      ) : (
        <span
          className="pams-operations-graph-resource-card__list-bullet"
          aria-hidden
        />
      )}

      <div className="pams-operations-graph-resource-card__body">
        <p className="pams-operations-graph-resource-card__title">{data.label}</p>
        {data.code && !isTableListItem ? (
          <p className="pams-operations-graph-resource-card__code">{data.code}</p>
        ) : null}
      </div>

      {data.isCritical ? (
        <span
          className="pams-operations-graph-resource-card__critical"
          title={t("nodeCriticalShort")}
          aria-label={t("nodeCriticalShort")}
        />
      ) : null}

      {hasOutgoing ? (
        <Handle
          id="chain-out"
          type="source"
          position={Position.Bottom}
          className="pams-operations-graph-handle pams-operations-graph-handle--resource"
        />
      ) : null}
    </article>
  );
};

/** Task 프로세스 노드 — 제목 우선 정보 계층 카드 */
const GraphProcessFlowNodeCard = ({
  data,
  selected,
  kind,
  kindClassMap,
}: NodeProps<Node<GraphNodeData>> & {
  kind: "TASK" | "L3" | "E2E";
  kindClassMap: Record<"TASK" | "L3" | "E2E", string>;
}) => {
  const t = useTranslations("operationsGraph");
  const ts = useTranslations("status");
  const showStatus = data.status ? isProcessStatus(data.status) : false;

  return (
    <article
      className={cn(
        "pams-operations-graph-node-card",
        kindClassMap[kind],
        selected && "pams-operations-graph-node-card--selected",
        data.highlighted && "pams-operations-graph-node-card--highlighted",
        data.isCritical && "pams-operations-graph-node-card--critical",
        data.dimmed && "pams-operations-graph-node-card--dimmed",
      )}
      aria-label={data.label}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="pams-operations-graph-handle"
      />

      <h3 className="pams-operations-graph-node-card__title">{data.label}</h3>

      <div className="pams-operations-graph-node-card__meta">
        <GraphNodeBadge
          variant="kind"
          kind={kind}
          label={t(`nodeKindShort.${kind}`)}
        />
        {showStatus ? (
          <GraphNodeBadge
            variant="status"
            status={data.status as ProcessStatus}
            label={ts(data.status as ProcessStatus)}
          />
        ) : null}
        {data.isCritical ? (
          <span
            className="pams-operations-graph-node-card__critical-mark"
            title={t("nodeCriticalShort")}
            aria-label={t("nodeCriticalShort")}
          />
        ) : null}
      </div>

      {data.code ? (
        <p className="pams-operations-graph-node-card__code">{data.code}</p>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="pams-operations-graph-handle"
      />
      {kind === "TASK" ? (
        <Handle
          id="chain-out"
          type="source"
          position={Position.Bottom}
          className="pams-operations-graph-handle pams-operations-graph-handle--chain"
        />
      ) : null}
    </article>
  );
};

const GraphTaskNodeCard = (props: NodeProps<Node<GraphNodeData>>) => (
  <GraphProcessFlowNodeCard
    {...props}
    kind="TASK"
    kindClassMap={processFlowKindClassMap}
  />
);

const GraphL3FlowNodeCard = (props: NodeProps<Node<GraphNodeData>>) => (
  <GraphProcessFlowNodeCard
    {...props}
    kind="L3"
    kindClassMap={processFlowKindClassMap}
  />
);

const GraphE2eFlowNodeCard = (props: NodeProps<Node<GraphNodeData>>) => (
  <GraphProcessFlowNodeCard
    {...props}
    kind="E2E"
    kindClassMap={processFlowKindClassMap}
  />
);

/** 운영 지식그래프 노드 — Task 흐름과 리소스 칩을 구분해 렌더 */
export const GraphNodeCard = (props: NodeProps<Node<GraphNodeData>>) => {
  const { data } = props;

  if (data.kind === "E2E") {
    return <GraphE2eFlowNodeCard {...props} />;
  }

  if (data.kind === "L3") {
    return <GraphL3FlowNodeCard {...props} />;
  }

  if (isResourceKind(data.kind)) {
    return <GraphResourceNodeCard {...props} />;
  }

  return <GraphTaskNodeCard {...props} />;
};

export const graphNodeTypes = {
  graphNode: GraphNodeCard,
};
