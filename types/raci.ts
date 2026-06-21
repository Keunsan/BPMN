import type { RaciType } from "@/types/metadata";

export interface TaskRoleMappingDto {
  mappingId: number;
  nodeId: number;
  orgId: number | null;
  orgCode: string | null;
  orgName: string | null;
  roleId: number | null;
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
  orgId?: number | null;
  roleId?: number | null;
  raciType: RaciType;
  description?: string | null;
}
