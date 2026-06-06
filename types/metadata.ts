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
