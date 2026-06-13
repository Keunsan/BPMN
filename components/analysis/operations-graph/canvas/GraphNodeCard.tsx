"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { GraphNodeKind } from "@/types/operations-graph";

export type GraphNodeData = {
  label: string;
  code?: string;
  kind: GraphNodeKind;
  status?: string;
  isCritical?: boolean;
  highlighted?: boolean;
};

const kindClassMap: Record<GraphNodeKind, string> = {
  L3: "pams-operations-graph-node-card--kind-l3",
  TASK: "pams-operations-graph-node-card--kind-task",
  APPLICATION: "pams-operations-graph-node-card--kind-application",
  TABLE: "pams-operations-graph-node-card--kind-table",
  INTERFACE: "pams-operations-graph-node-card--kind-interface",
};

/** 운영 지식그래프 공통 노드 카드 */
export const GraphNodeCard = ({ data, selected }: NodeProps<Node<GraphNodeData>>) => {
  const t = useTranslations("operationsGraph");

  return (
    <div
      className={cn(
        "pams-operations-graph-node-card",
        kindClassMap[data.kind],
        selected && "pams-operations-graph-node-card--selected",
        (data.isCritical || data.highlighted) &&
          "pams-operations-graph-node-card--critical",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-1.5 !border-0 !bg-border" />
      <span className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t(`nodeKind.${data.kind}`)}
      </span>
      <span className="truncate text-[12px] font-semibold text-foreground">
        {data.label}
      </span>
      {data.code ? (
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          {data.code}
        </span>
      ) : null}
      <Handle type="source" position={Position.Right} className="!size-1.5 !border-0 !bg-border" />
    </div>
  );
};

export const graphNodeTypes = {
  graphNode: GraphNodeCard,
};
