"use client";

import {
  BaseEdge,
  getSmoothStepPath,
  getStraightPath,
  Position,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

import {
  GRAPH_EDGE_DASH,
  isResourceEdgeKind,
  resolveEdgeStroke,
  resolveEdgeWidth,
} from "@/components/analysis/operations-graph/canvas/graph-style-tokens";
import type { GraphEdgeKind } from "@/types/operations-graph";

export type GraphEdgeData = {
  kind: GraphEdgeKind;
  label?: string;
  isActive?: boolean;
  isDimmed?: boolean;
};

/** 가독성 중심 엔터프라이즈 엣지 */
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
  markerEnd,
}: EdgeProps<Edge<GraphEdgeData>>) => {
  const kind = data?.kind;
  const isPrecedes = kind === "PRECEDES";
  const isResource = isResourceEdgeKind(kind);

  const isVerticalFlow =
    (sourcePosition === Position.Bottom && targetPosition === Position.Top) ||
    (sourcePosition === Position.Top && targetPosition === Position.Bottom);
  const isHorizontalFlow =
    (sourcePosition === Position.Right && targetPosition === Position.Left) ||
    (sourcePosition === Position.Left && targetPosition === Position.Right);
  const useStraightPath = isPrecedes || isVerticalFlow || isHorizontalFlow;

  const [edgePath] = useStraightPath
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: isResource ? 8 : 12,
        offset: isResource ? 24 : 20,
      });

  const isEmphasized = Boolean(selected || data?.isActive);
  const isDimmed = Boolean(data?.isDimmed && !isEmphasized);

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      markerEnd={markerEnd}
      interactionWidth={isPrecedes ? 20 : 16}
      style={{
        stroke: resolveEdgeStroke(kind, isEmphasized, isDimmed),
        strokeWidth: resolveEdgeWidth(kind, isEmphasized, isDimmed),
        strokeDasharray: kind ? GRAPH_EDGE_DASH[kind] : undefined,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
    />
  );
};

export const graphEdgeTypes = {
  graphEdge: GraphEdgeLine,
};

