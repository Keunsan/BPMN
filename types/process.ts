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
  companyCode: string | null;
  businessUnitCode: string | null;
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
  /** overlay 조회 시 변형 노드 여부 */
  isOverlayVariant?: boolean;
  /** 표준 노드에 연결된 변형 개수 */
  variantCount?: number;
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
  variantOf?: number | null;
  companyCode?: string | null;
  businessUnitCode?: string | null;
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

export type ProcessScopeMode = "enterprise" | "scoped";

export type ProcessTreeViewMode = "catalog" | "enterprise" | "organization";

export interface ProcessFilters {
  level?: ProcessLevel;
  status?: ProcessStatus;
  parentNodeId?: number | null;
  search?: string;
  companyCode?: string;
  businessUnitCode?: string;
  /** true면 변형 노드도 포함한다 */
  includeVariants?: boolean;
  viewMode?: ProcessTreeViewMode;
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
  companyName?: string | null;
  businessUnitName?: string | null;
  standardProcess?: Pick<ProcessNode, "nodeId" | "code" | "name"> | null;
  variantCount?: number;
}

export interface CreateVariantDto {
  companyCode: string;
  businessUnitCode: string;
  copyBpmn?: boolean;
  copyMetadata?: boolean;
}

export interface StandardVariantCompareDto {
  standard: ProcessNodeDto;
  variant: ProcessNodeDto | null;
  diffRows: Array<{
    key: string;
    standardValue: string;
    variantValue: string;
    changed: boolean;
  }>;
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
  /** L3 등록 시 전사 공통 또는 특정 법인·사업부 */
  scopeMode?: ProcessScopeMode;
  companyCode?: string | null;
  businessUnitCode?: string | null;
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
