export type OrganizationType =
  | "COMPANY"
  | "DIVISION"
  | "DEPARTMENT"
  | "TEAM"
  | "PLANT"
  | "SUBSIDIARY";

export type OrganizationSource = "HR_ERP" | "MANUAL";

export interface OrganizationDto {
  orgId: number;
  parentOrgId: number | null;
  orgCode: string;
  orgName: string;
  orgType: OrganizationType;
  orgLevel: number | null;
  buCd: string | null;
  costCd: string | null;
  costName: string | null;
  leaderEmployeeId: string | null;
  leaderName: string | null;
  isLeaf: boolean | null;
  source: OrganizationSource;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export interface OrganizationListFilters {
  search?: string;
  buCd?: string;
  isActive?: boolean;
  leafOnly?: boolean;
}

export interface OrganizationSyncResult {
  totalFetched: number;
  inserted: number;
  updated: number;
  deactivated: number;
  parentLinked: number;
}

export interface OrganizationUpsertInput {
  orgCode: string;
  orgName: string;
  orgType: OrganizationType;
  orgLevel: number;
  buCd: string | null;
  costCd: string | null;
  costName: string | null;
  leaderEmployeeId: string | null;
  leaderName: string | null;
  isLeaf: boolean;
  source: OrganizationSource;
  isActive: boolean;
}

/** HR 동기화 MERGE 1행 입력 (상위 조직 코드 포함) */
export interface OrganizationHrMergeInput extends OrganizationUpsertInput {
  parentOrgCode: string | null;
}

export interface OrganizationMergeResult {
  inserted: number;
  updated: number;
  parentLinked: number;
  deactivated: number;
}
