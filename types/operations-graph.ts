/** 운영 지식그래프 노드·엣지 DTO */

import type { ProcessLevel } from "@/types/process";

export type GraphCenterProcessLevel = Extract<ProcessLevel, "L1" | "L2" | "L3">;

export type GraphNodeKind = "L3" | "TASK" | "APPLICATION" | "TABLE" | "INTERFACE";

export type GraphEdgeKind =
  | "CONTAINS"
  | "PRECEDES"
  | "USES_SCREEN"
  | "READS_TABLE"
  | "WRITES_TABLE"
  | "INTERFACE";

export type GraphViewMode = "hierarchical" | "radial";

export type OperationsGraphNode = {
  id: string;
  kind: GraphNodeKind;
  label: string;
  code?: string;
  status?: string;
  sourceId: number | string;
  isCritical?: boolean;
  meta?: Record<string, unknown>;
};

export type OperationsGraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  label?: string;
};

export type OperationsGraphSummary = {
  nodeCount: number;
  edgeCount: number;
  countsByKind: Partial<Record<GraphNodeKind, number>>;
  truncated: boolean;
};

export type OperationsGraphQuery = {
  centerKind: GraphNodeKind;
  centerId: number | string;
  /** L1/L2/L3 프로세스 탐색 기준 레벨 (L4 Task 직접 선택 시 생략) */
  centerProcessLevel?: GraphCenterProcessLevel;
  depth: 1 | 2;
  includeKinds?: GraphNodeKind[];
  includeEdgeKinds?: GraphEdgeKind[];
  showInterfaces?: boolean;
  showTables?: boolean;
  highlightCritical?: boolean;
};

export type OperationsGraphResult = {
  nodes: OperationsGraphNode[];
  edges: OperationsGraphEdge[];
  summary: OperationsGraphSummary;
  centerNodeId: string;
  /** 탐색 기준 노드 메타 — nodes 배열에는 포함하지 않음 */
  centerNode?: OperationsGraphNode;
};

export type GraphSelectedNodeDetail = OperationsGraphNode & {
  description?: string;
  relatedNodes: Array<{
    id: string;
    kind: GraphNodeKind;
    label: string;
    code?: string;
  }>;
};

export const GRAPH_NODE_KINDS: GraphNodeKind[] = [
  "L3",
  "TASK",
  "APPLICATION",
  "TABLE",
  "INTERFACE",
];

export const buildGraphNodeId = (
  kind: GraphNodeKind,
  sourceId: number | string,
): string => `${kind}:${sourceId}`;

export const buildTableNodeId = (
  systemId: number,
  schemaName: string | null,
  tableName: string,
): string =>
  `TABLE:${systemId}:${schemaName ?? ""}:${tableName}`;
