/** 운영 지식그래프 노드·엣지 DTO */

import type { ProcessLevel } from "@/types/process";

export type GraphCenterProcessLevel = Extract<ProcessLevel, "L1" | "L2" | "L3">;

export type GraphNodeKind = "E2E" | "L3" | "TASK" | "APPLICATION" | "TABLE" | "INTERFACE";

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
  "E2E",
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

/** Task 컨텍스트 APPLICATION 노드 ID — 동일 시스템도 Task별 분리 */
export const buildTaskScopedApplicationNodeId = (
  taskNodeId: number,
  systemId: number,
): string => `APPLICATION:T${taskNodeId}:${systemId}`;

export const buildTableNodeId = (
  systemId: number,
  schemaName: string | null,
  tableName: string,
): string =>
  `TABLE:${systemId}:${schemaName ?? ""}:${tableName}`;

/** Task 컨텍스트 TABLE 노드 ID */
export const buildTaskScopedTableNodeId = (
  taskNodeId: number,
  systemId: number,
  schemaName: string | null,
  tableName: string,
): string =>
  `TABLE:T${taskNodeId}:${systemId}:${schemaName ?? ""}:${tableName}`;

/** APPLICATION 노드 ID에서 systemId 추출 (전역·Task 스코프 공통) */
export const parseApplicationSystemIdFromNodeId = (
  nodeId: string,
): number | null => {
  if (!nodeId.startsWith("APPLICATION:")) {
    return null;
  }
  const rest = nodeId.slice("APPLICATION:".length);
  if (rest.startsWith("T")) {
    const colonIdx = rest.indexOf(":", 1);
    if (colonIdx === -1) {
      return null;
    }
    const systemId = Number(rest.slice(colonIdx + 1));
    return Number.isFinite(systemId) ? systemId : null;
  }
  const systemId = Number(rest);
  return Number.isFinite(systemId) ? systemId : null;
};

/** TABLE 노드 ID에서 systemId 추출 (전역·Task 스코프 공통) */
export const parseTableSystemIdFromNodeId = (nodeId: string): number | null => {
  if (!nodeId.startsWith("TABLE:")) {
    return null;
  }
  const rest = nodeId.slice("TABLE:".length);
  if (rest.startsWith("T")) {
    const parts = rest.split(":");
    if (parts.length < 3) {
      return null;
    }
    const systemId = Number(parts[1]);
    return Number.isFinite(systemId) ? systemId : null;
  }
  const parts = rest.split(":");
  const systemId = Number(parts[0]);
  return Number.isFinite(systemId) ? systemId : null;
};
