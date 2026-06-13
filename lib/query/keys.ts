import type { BpmnFilters } from "@/types/bpmn";
import type {
  CommonCodeGroupListFilters,
  CommonCodeItemListFilters,
} from "@/types/common-code";
import type { ExternalTableQuery } from "@/types/external";
import type { ProcessFilters } from "@/types/process";
import type { SystemListFilters } from "@/types/system";

/** 도메인별 쿼리 키 팩토리 — PRD 8.1.1 */
export const processKeys = {
  all: ["process"] as const,
  lists: () => [...processKeys.all, "list"] as const,
  list: (filters: ProcessFilters) => [...processKeys.lists(), filters] as const,
  trees: () => [...processKeys.all, "tree"] as const,
  tree: (filters?: ProcessFilters) => [...processKeys.trees(), filters ?? {}] as const,
  details: () => [...processKeys.all, "detail"] as const,
  detail: (id: number) => [...processKeys.details(), id] as const,
  variants: (id: number) => [...processKeys.all, "variants", id] as const,
  compareVariant: (
    id: number,
    filters: Pick<ProcessFilters, "companyCode" | "businessUnitCode">,
  ) => [...processKeys.all, "compare-variant", id, filters] as const,
};

export const bpmnKeys = {
  all: ["bpmn"] as const,
  lists: () => [...bpmnKeys.all, "list"] as const,
  list: (filters: BpmnFilters) => [...bpmnKeys.lists(), filters] as const,
  details: () => [...bpmnKeys.all, "detail"] as const,
  detail: (id: number) => [...bpmnKeys.details(), id] as const,
};

import type { TaskAttributeListFilters } from "@/types/metadata";

export const metadataKeys = {
  all: ["metadata"] as const,
  taskAttributes: () => [...metadataKeys.all, "task-attribute"] as const,
  taskAttributeList: (filters: TaskAttributeListFilters) =>
    [...metadataKeys.taskAttributes(), "list", filters] as const,
  taskAttribute: (nodeId: number) =>
    [...metadataKeys.taskAttributes(), nodeId] as const,
  raci: (nodeId?: number) => [...metadataKeys.all, "raci", nodeId ?? "all"] as const,
  systems: (nodeId?: number) =>
    [...metadataKeys.all, "system", nodeId ?? "all"] as const,
  dataTables: (nodeId?: number) =>
    [...metadataKeys.all, "data-table", nodeId ?? "all"] as const,
};

export const externalKeys = {
  all: ["external"] as const,
  tables: (query: ExternalTableQuery) =>
    [...externalKeys.all, "tables", query] as const,
  columns: (systemId: number, tableName: string, schemaName?: string) =>
    [...externalKeys.all, "columns", { systemId, tableName, schemaName }] as const,
};

export const externalApiKeys = {
  all: ["external-api"] as const,
  globalConfig: () => [...externalApiKeys.all, "global-config"] as const,
  profiles: () => [...externalApiKeys.all, "profiles"] as const,
  profile: (systemId: number) =>
    [...externalApiKeys.all, "profile", systemId] as const,
};

export const systemKeys = {
  all: ["system"] as const,
  lists: () => [...systemKeys.all, "list"] as const,
  list: (filters: SystemListFilters) => [...systemKeys.lists(), filters] as const,
  detail: (systemId: number) => [...systemKeys.all, "detail", systemId] as const,
  modules: (systemId: number) => [...systemKeys.all, "modules", systemId] as const,
  screens: (systemId: number, moduleCode?: string) =>
    [...systemKeys.all, "screens", systemId, moduleCode ?? ""] as const,
  hierarchy: () => [...systemKeys.all, "hierarchy"] as const,
  screenCatalog: (filters: Record<string, string | number | undefined>) =>
    [...systemKeys.all, "screen-catalog", filters] as const,
  screenCatalogInfinite: (
    filters: Record<string, string | number | undefined>,
  ) => [...systemKeys.all, "screen-catalog-infinite", filters] as const,
};

export const analysisKeys = {
  all: ["analysis"] as const,
  search: (query: string) => [...analysisKeys.all, "search", query] as const,
  impact: (params: Record<string, unknown>) =>
    [...analysisKeys.all, "impact", params] as const,
  operationsGraph: (params: Record<string, unknown>) =>
    [...analysisKeys.all, "operations-graph", params] as const,
};

export const commonCodeKeys = {
  all: ["common-code"] as const,
  groups: () => [...commonCodeKeys.all, "groups"] as const,
  groupList: (filters: CommonCodeGroupListFilters) =>
    [...commonCodeKeys.groups(), "list", filters] as const,
  group: (groupCode: string) => [...commonCodeKeys.groups(), groupCode] as const,
  items: (groupCode: string) => [...commonCodeKeys.all, "items", groupCode] as const,
  itemList: (groupCode: string, filters: CommonCodeItemListFilters) =>
    [...commonCodeKeys.items(groupCode), "list", filters] as const,
  item: (groupCode: string, code: string) =>
    [...commonCodeKeys.all, "item", groupCode, code] as const,
  lookup: (groupCode: string) =>
    [...commonCodeKeys.all, "lookup", groupCode] as const,
};

export const sessionKeys = {
  all: ["session"] as const,
  status: () => [...sessionKeys.all, "status"] as const,
};
