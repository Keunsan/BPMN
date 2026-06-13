"use client";

import {
  BaseEdge,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import type { GraphEdgeKind } from "@/types/operations-graph";

export type GraphEdgeData = {
  kind: GraphEdgeKind;
  label?: string;
};

const strokeDash: Partial<Record<GraphEdgeKind, string>> = {
  PRECEDES: "4 3",
  INTERFACE: "6 3",
};

/** 절제된 엔터프라이즈 엣지 */
export const GraphEdgeLine = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<GraphEdgeData>>) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: selected ? "oklch(0.52 0.24 293)" : "oklch(0.72 0.01 280 / 0.55)",
        strokeWidth: selected ? 1.5 : 1,
        strokeDasharray: data?.kind ? strokeDash[data.kind] : undefined,
      }}
      markerEnd="url(#pams-graph-arrow)"
    />
  );
};

export const graphEdgeTypes = {
  graphEdge: GraphEdgeLine,
};
