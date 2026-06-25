import type { RaciType } from "@/types/metadata";

export interface TaskRoleMappingDto {
  mappingId: number;
  nodeId: number;
  roleId: number;
  roleCode: string | null;
  roleName: string | null;
  raciType: RaciType;
  description: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

export interface UpsertTaskRoleMappingDto {
  nodeId: number;
  roleId: number;
  raciType: RaciType;
  description?: string | null;
}
