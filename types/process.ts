export type ProcessLevel = "L1" | "L2" | "L3" | "L4";

export type ProcessStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "OBSOLETE";

export interface ProcessNode {
  nodeId: number;
  parentNodeId: number | null;
  level: ProcessLevel;
  code: string;
  name: string;
  description: string | null;
  status: ProcessStatus;
  ownerOrgId: number | null;
  version: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  isStandard: boolean;
  variantOf: number | null;
  sortOrder: number;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

export interface ProcessNodeHistory {
  historyId: number;
  nodeId: number;
  version: string;
  changeType:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "STATUS_CHANGE"
    | "VERSION_UP";
  changeReason: string | null;
  snapshotData: string | null;
  createdBy: number | null;
  createdAt: Date;
}

export interface ProcessNodeTree extends ProcessNode {
  children?: ProcessNodeTree[];
}

export interface CreateProcessInput {
  parentNodeId: number | null;
  level: ProcessLevel;
  code: string;
  name: string;
  description?: string | null;
  status?: ProcessStatus;
  ownerOrgId?: number | null;
  version?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  isStandard?: boolean;
  sortOrder?: number;
  createdBy?: number | null;
}

export interface UpdateProcessInput {
  name?: string;
  description?: string | null;
  status?: ProcessStatus;
  ownerOrgId?: number | null;
  version?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  isStandard?: boolean;
  sortOrder?: number;
  updatedBy?: number | null;
}

export interface ProcessFilters {
  level?: ProcessLevel;
  status?: ProcessStatus;
  parentNodeId?: number | null;
  search?: string;
}

/** locale별 프로세스명/설명 */
export type ProcessI18nMap = Partial<
  Record<"ko" | "en" | "zh-TW", { name: string; description?: string | null }>
>;

/** API 응답용 — locale 적용된 노드 */
export interface ProcessNodeDto extends ProcessNode {
  i18n?: ProcessI18nMap;
  displayName?: string;
  displayDescription?: string | null;
}

export interface CreateProcessDto {
  parentNodeId: number | null;
  level?: ProcessLevel;
  code?: string;
  autoCode?: boolean;
  name: string;
  description?: string | null;
  status?: ProcessStatus;
  ownerOrgId?: number | null;
  version?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  isStandard?: boolean;
  sortOrder?: number;
  i18n?: ProcessI18nMap;
}

export interface UpdateProcessDto {
  name?: string;
  description?: string | null;
  status?: ProcessStatus;
  ownerOrgId?: number | null;
  version?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  isStandard?: boolean;
  sortOrder?: number;
  i18n?: ProcessI18nMap;
}

export interface MoveProcessDto {
  parentNodeId: number | null;
  sortOrder?: number;
}

export interface ProcessHistoryDto {
  historyId: number;
  nodeId: number;
  version: string;
  changeType: ProcessNodeHistory["changeType"];
  changeReason: string | null;
  createdAt: Date;
  snapshotData: Record<string, unknown> | null;
}

export type ProcessDeleteImpactKind =
  | "taskAttribute"
  | "taskPredecessor"
  | "taskRoleMapping"
  | "taskSystemMapping"
  | "taskInterfaceMapping"
  | "taskDataTableLink"
  | "taskKpiMapping"
  | "taskRiskMapping"
  | "taskControlMapping"
  | "taskDocumentMapping";

export interface ProcessDeleteImpactCount {
  kind: ProcessDeleteImpactKind;
  count: number;
}

export interface ProcessDeleteBpmnTaskLink {
  elementId: number;
  elementBpmnId: string;
  elementName: string | null;
  elementType: string;
  modelId: number;
  modelName: string;
  modelProcessCode: string;
  modelProcessName: string;
}

export interface ProcessDeleteBpmnModelImpact {
  modelId: number;
  modelName: string;
  version: string;
  status: string;
  elementCount: number;
}

export interface ProcessDeleteImpact {
  nodeId: number;
  childProcessCount: number;
  bpmnTaskLinks: ProcessDeleteBpmnTaskLink[];
  ownedBpmnModels: ProcessDeleteBpmnModelImpact[];
  metadataCounts: ProcessDeleteImpactCount[];
  hasDependencies: boolean;
  canCascadeDelete: boolean;
}
