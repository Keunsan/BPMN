"use client";

import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import type { GraphEdgeKind } from "@/types/operations-graph";

export type GraphEdgeData = {
  kind: GraphEdgeKind;
  label?: string;
  isActive?: boolean;
  isDimmed?: boolean;
};

const strokeDash: Partial<Record<GraphEdgeKind, string>> = {
  PRECEDES: "5 4",
  INTERFACE: "4 3",
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
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  });

  const isEmphasized = selected || data?.isActive;
  const isDimmed = data?.isDimmed && !isEmphasized;

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{
        stroke: isEmphasized
          ? "oklch(0.52 0.24 293 / 0.62)"
          : isDimmed
            ? "oklch(0.82 0.006 280 / 0.28)"
            : "oklch(0.78 0.008 280 / 0.42)",
        strokeWidth: isEmphasized ? 1.15 : 0.9,
        strokeDasharray: data?.kind ? strokeDash[data.kind] : undefined,
      }}
      markerEnd={
        isEmphasized ? "url(#pams-graph-arrow-active)" : "url(#pams-graph-arrow)"
      }
    />
  );
};

export const graphEdgeTypes = {
  graphEdge: GraphEdgeLine,
};
