import type { ProcessStatus } from "@/types/process";

export type FrequencyType =
  | "AD_HOC"
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY"
  | "EVENT_DRIVEN";

export type RaciType =
  | "RESPONSIBLE"
  | "ACCOUNTABLE"
  | "CONSULTED"
  | "INFORMED";

export type DataLinkType = "INPUT" | "OUTPUT" | "REFERENCE";

export type CrudType =
  | "C"
  | "R"
  | "U"
  | "D"
  | "CR"
  | "CU"
  | "CRU"
  | "CRUD"
  | "RU"
  | "RD"
  | "CRD"
  | "RUD";

export type DataVolume = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

export type TaskAttributeI18nField =
  | "definition"
  | "purpose"
  | "inputDeliverable"
  | "inputDataDesc"
  | "inputCondition"
  | "outputDeliverable"
  | "outputDataDesc"
  | "outputCondition"
  | "issues"
  | "exceptions"
  | "remarks";

export type TaskAttributeI18nValue = Partial<
  Record<TaskAttributeI18nField, string | null>
>;

export type TaskAttributeI18nMap = Partial<
  Record<"ko" | "en" | "zh-TW", TaskAttributeI18nValue>
>;

export interface TaskAttribute {
  attrId: number;
  nodeId: number;
  definition: string | null;
  purpose: string | null;
  inputDeliverable: string | null;
  inputDataDesc: string | null;
  inputCondition: string | null;
  outputDeliverable: string | null;
  outputDataDesc: string | null;
  outputCondition: string | null;
  frequency: FrequencyType | null;
  triggerEvent: string | null;
  duration: string | null;
  issues: string | null;
  exceptions: string | null;
  remarks: string | null;
  version: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

export interface TaskPredecessor {
  predecessorId: number;
  nodeId: number;
  predecessorNodeId: number;
  conditionDesc: string | null;
  isMandatory: boolean;
  createdAt: Date;
}

export interface TaskPredecessorDto extends TaskPredecessor {
  predecessorCode: string;
  predecessorName: string;
  predecessorLevel: "L1" | "L2" | "L3" | "L4";
}

export interface UpsertTaskPredecessorDto {
  predecessorNodeId: number;
  conditionDesc?: string | null;
  isMandatory?: boolean;
}

export interface TaskAttributeDto extends TaskAttribute {
  i18n: TaskAttributeI18nMap;
  predecessors: TaskPredecessorDto[];
}

export interface UpsertTaskAttributeDto {
  nodeId: number;
  definition?: string | null;
  purpose?: string | null;
  inputDeliverable?: string | null;
  inputDataDesc?: string | null;
  inputCondition?: string | null;
  outputDeliverable?: string | null;
  outputDataDesc?: string | null;
  outputCondition?: string | null;
  frequency?: FrequencyType | null;
  triggerEvent?: string | null;
  duration?: string | null;
  issues?: string | null;
  exceptions?: string | null;
  remarks?: string | null;
  version?: string | null;
  i18n?: TaskAttributeI18nMap;
  predecessors?: UpsertTaskPredecessorDto[];
}

export interface TaskAttributeListFilters {
  search?: string;
  level?: "L3" | "L4";
  nodeId?: number;
  bpmnModelId?: number;
}

export interface TaskAttributeListItem {
  attrId: number;
  nodeId: number;
  processCode: string;
  processName: string;
  processLevel: "L3" | "L4";
  processStatus: ProcessStatus;
  parentCode: string | null;
  parentName: string | null;
  definition: string | null;
  purpose: string | null;
  inputDeliverable: string | null;
  inputDataDesc: string | null;
  inputCondition: string | null;
  outputDeliverable: string | null;
  outputDataDesc: string | null;
  outputCondition: string | null;
  frequency: FrequencyType | null;
  triggerEvent: string | null;
  duration: string | null;
  issues: string | null;
  exceptions: string | null;
  remarks: string | null;
  version: string | null;
  bpmnModelId: number | null;
  bpmnModelName: string | null;
  bpmnElementName: string | null;
  updatedAt: Date | null;
}

export interface TaskDataTableLink {
  linkId: number;
  nodeId: number;
  systemId: number;
  schemaName: string | null;
  tableName: string;
  tableNameKor: string | null;
  linkType: DataLinkType;
  crudType: CrudType | null;
  keyColumns: string | null;
  filterCondition: string | null;
  description: string | null;
  dataVolume: DataVolume | null;
  isCritical: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

export interface TaskRoleMapping {
  mappingId: number;
  nodeId: number;
  orgId: number | null;
  roleId: number | null;
  raciType: RaciType;
  description: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}
