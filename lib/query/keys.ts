import type { BpmnFilters } from "@/types/bpmn";
import type { ExternalTableQuery } from "@/types/external";
import type { ProcessFilters } from "@/types/process";

/** 도메인별 쿼리 키 팩토리 — PRD 8.1.1 */
export const processKeys = {
  all: ["process"] as const,
  lists: () => [...processKeys.all, "list"] as const,
  list: (filters: ProcessFilters) => [...processKeys.lists(), filters] as const,
  trees: () => [...processKeys.all, "tree"] as const,
  tree: (filters?: ProcessFilters) => [...processKeys.trees(), filters ?? {}] as const,
  details: () => [...processKeys.all, "detail"] as const,
  detail: (id: number) => [...processKeys.details(), id] as const,
};

export const bpmnKeys = {
  all: ["bpmn"] as const,
  lists: () => [...bpmnKeys.all, "list"] as const,
  list: (filters: BpmnFilters) => [...bpmnKeys.lists(), filters] as const,
  details: () => [...bpmnKeys.all, "detail"] as const,
  detail: (id: number) => [...bpmnKeys.details(), id] as const,
};

export const metadataKeys = {
  all: ["metadata"] as const,
  taskAttributes: () => [...metadataKeys.all, "task-attribute"] as const,
  taskAttribute: (nodeId: number) =>
    [...metadataKeys.taskAttributes(), nodeId] as const,
  raci: (nodeId?: number) => [...metadataKeys.all, "raci", nodeId ?? "all"] as const,
  systems: (nodeId?: number) =>
    [...metadataKeys.all, "system", nodeId ?? "all"] as const,
};

export const externalKeys = {
  all: ["external"] as const,
  tables: (query: ExternalTableQuery) =>
    [...externalKeys.all, "tables", query] as const,
  columns: (systemId: number, tableName: string, schemaName?: string) =>
    [...externalKeys.all, "columns", { systemId, tableName, schemaName }] as const,
};

export const analysisKeys = {
  all: ["analysis"] as const,
  search: (query: string) => [...analysisKeys.all, "search", query] as const,
  impact: (params: Record<string, unknown>) =>
    [...analysisKeys.all, "impact", params] as const,
};
