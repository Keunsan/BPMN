export type RoleCategory =
  | "BUSINESS"
  | "IT"
  | "MANAGEMENT"
  | "AUDIT"
  | "EXTERNAL";

export interface RoleDto {
  roleId: number;
  roleCode: string;
  roleName: string;
  roleDescription: string | null;
  roleCategory: RoleCategory | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface RoleListFilters {
  search?: string;
  isActive?: boolean;
  roleCategory?: RoleCategory;
}

export interface UpsertRoleDto {
  roleCode: string;
  roleName: string;
  roleDescription?: string | null;
  roleCategory?: RoleCategory | null;
  isActive?: boolean;
}
