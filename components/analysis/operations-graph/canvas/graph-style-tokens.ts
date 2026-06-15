import type { GraphEdgeKind } from "@/types/operations-graph";

/** 운영 지식그래프 시각 토큰 — 노드·엣지·핸들 공통 */

export const GRAPH_NODE_DIMENSIONS = {
  processWidth: 240,
  processMaxWidth: 520,
  processHeight: 88,
  resourceWidth: 168,
  resourceHeight: 44,
  tableListItemHeight: 34,
  anchorSize: 1,
} as const;

/** 프로세스 노드 카드 너비 — 제목·코드 길이 기반 추정 (dagre·React Flow 공통) */
export const estimateProcessNodeWidth = (
  label: string,
  code?: string,
): number => {
  const minWidth = GRAPH_NODE_DIMENSIONS.processWidth;
  const maxWidth = GRAPH_NODE_DIMENSIONS.processMaxWidth;
  const horizontalPad = 36;
  const metaRowMin = 148;
  const titleCharPx = 15.5;
  const codeCharPx = 6.5;

  const titleWidth = [...label].length * titleCharPx;
  const codeWidth = code ? [...code].length * codeCharPx + 16 : 0;
  const contentWidth = Math.max(titleWidth, codeWidth, metaRowMin);

  return Math.min(
    maxWidth,
    Math.max(minWidth, Math.ceil(contentWidth + horizontalPad)),
  );
};

export const GRAPH_EDGE_STROKE = {
  precedes: {
    default: "oklch(0.38 0.14 250)",
    active: "oklch(0.28 0.16 250)",
    dimmed: "oklch(0.72 0.03 250 / 0.35)",
  },
  resource: {
    default: "oklch(0.52 0.04 280)",
    active: "oklch(0.38 0.08 280)",
    dimmed: "oklch(0.78 0.01 280 / 0.3)",
  },
  default: {
    default: "oklch(0.48 0.06 280)",
    active: "oklch(0.42 0.22 293)",
    dimmed: "oklch(0.76 0.01 280 / 0.32)",
  },
} as const;

export const GRAPH_EDGE_WIDTH = {
  precedes: { default: 2.5, active: 3.5, dimmed: 1.75 },
  resource: { default: 2, active: 2.75, dimmed: 1.5 },
  default: { default: 2.25, active: 3, dimmed: 1.75 },
} as const;

export const GRAPH_EDGE_DASH: Partial<Record<GraphEdgeKind, string>> = {
  CONTAINS: "5 4",
  INTERFACE: "5 3",
  USES_SCREEN: "4 3",
  READS_TABLE: "4 3",
  WRITES_TABLE: "4 3",
};

export const isResourceEdgeKind = (kind: GraphEdgeKind | undefined): boolean =>
  kind === "USES_SCREEN" ||
  kind === "READS_TABLE" ||
  kind === "WRITES_TABLE" ||
  kind === "INTERFACE";

export const resolveEdgeStroke = (
  kind: GraphEdgeKind | undefined,
  isEmphasized: boolean,
  isDimmed: boolean,
): string => {
  const palette =
    kind === "PRECEDES"
      ? GRAPH_EDGE_STROKE.precedes
      : isResourceEdgeKind(kind)
        ? GRAPH_EDGE_STROKE.resource
        : GRAPH_EDGE_STROKE.default;

  if (isEmphasized) {
    return palette.active;
  }
  if (isDimmed) {
    return palette.dimmed;
  }
  return palette.default;
};

export const resolveEdgeWidth = (
  kind: GraphEdgeKind | undefined,
  isEmphasized: boolean,
  isDimmed: boolean,
): number => {
  const widths =
    kind === "PRECEDES"
      ? GRAPH_EDGE_WIDTH.precedes
      : isResourceEdgeKind(kind)
        ? GRAPH_EDGE_WIDTH.resource
        : GRAPH_EDGE_WIDTH.default;

  if (isEmphasized) {
    return widths.active;
  }
  if (isDimmed) {
    return widths.dimmed;
  }
  return widths.default;
};

export const resolveMarkerColor = (
  kind: GraphEdgeKind,
  isActive: boolean,
  isDimmed: boolean,
): string => {
  if (kind === "PRECEDES") {
    return resolveEdgeStroke("PRECEDES", isActive, isDimmed);
  }
  return resolveEdgeStroke(kind, isActive, isDimmed);
};

export const GRAPH_MARKER_SIZE = {
  precedes: { width: 16, height: 16 },
  default: { width: 14, height: 14 },
} as const;
