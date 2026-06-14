"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";

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

const kindClassMap: Record<GraphNodeKind, string> = {
  L3: "pams-operations-graph-node-card--kind-l3",
  TASK: "pams-operations-graph-node-card--kind-task",
  APPLICATION: "pams-operations-graph-node-card--kind-application",
  TABLE: "pams-operations-graph-node-card--kind-table",
  INTERFACE: "pams-operations-graph-node-card--kind-interface",
};

/** 운영 지식그래프 노드 — 정보 객체 카드 */
export const GraphNodeCard = ({
  data,
  selected,
}: NodeProps<Node<GraphNodeData>>) => {
  const t = useTranslations("operationsGraph");
  const ts = useTranslations("status");
  const showStatus = data.status ? isProcessStatus(data.status) : false;

  return (
    <article
      className={cn(
        "pams-operations-graph-node-card",
        kindClassMap[data.kind],
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

      <header className="pams-operations-graph-node-card__header">
        <span className="pams-operations-graph-node-card__kind-mark" aria-hidden />
        <span className="pams-operations-graph-node-card__kind-label">
          {t(`nodeKindShort.${data.kind}`)}
        </span>
        {showStatus ? (
          <>
            <span className="pams-operations-graph-node-card__divider" aria-hidden>
              ·
            </span>
            <span className="pams-operations-graph-node-card__status">
              {ts(data.status as ProcessStatus)}
            </span>
          </>
        ) : null}
        {data.isCritical ? (
          <span
            className="pams-operations-graph-node-card__critical-mark"
            title={t("nodeCriticalShort")}
            aria-label={t("nodeCriticalShort")}
          />
        ) : null}
      </header>

      <h3 className="pams-operations-graph-node-card__title">{data.label}</h3>

      {data.code ? (
        <p className="pams-operations-graph-node-card__code">{data.code}</p>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="pams-operations-graph-handle"
      />
    </article>
  );
};

export const graphNodeTypes = {
  graphNode: GraphNodeCard,
};
