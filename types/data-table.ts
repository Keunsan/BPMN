import type { DataLinkType, CrudType, DataVolume } from "@/types/metadata";

export interface TaskDataTableLinkDto {
  linkId: number;
  nodeId: number;
  systemId: number;
  systemCode: string;
  systemName: string;
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

export interface UpsertTaskDataTableLinkDto {
  nodeId: number;
  systemId: number;
  schemaName?: string | null;
  tableName: string;
  tableNameKor?: string | null;
  linkType: DataLinkType;
  crudType?: CrudType | null;
  keyColumns?: string | null;
  filterCondition?: string | null;
  description?: string | null;
  dataVolume?: DataVolume | null;
  isCritical?: boolean;
}
