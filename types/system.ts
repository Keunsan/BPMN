export type SystemType =
  | "ERP"
  | "MES"
  | "SCM"
  | "SRM"
  | "WMS"
  | "QMS"
  | "PLM"
  | "CRM"
  | "HR"
  | "FI"
  | "BI"
  | "GW"
  | "ETS"
  | "PORTAL"
  | "LEGACY"
  | "OTHER";

export type ApiAuthType = "NONE" | "BASIC" | "OAUTH" | "API_KEY";

export type ScreenType =
  | "INPUT"
  | "INQUIRY"
  | "REPORT"
  | "MASTER"
  | "BATCH"
  | "APPROVAL"
  | "DASHBOARD";

export interface ApplicationSystem {
  systemId: number;
  systemCode: string;
  systemName: string;
  systemType: SystemType;
  companyCode: string | null;
  businessUnitCode: string | null;
  vendor: string | null;
  version: string | null;
  description: string | null;
  systemOwnerId: number | null;
  isActive: boolean;
  tableApiUrl: string | null;
  tableApiAuthType: ApiAuthType | null;
  tableApiConfig: Record<string, unknown> | null;
  columnApiUrl: string | null;
  createdAt: Date;
  updatedAt: Date | null;
}

/** 공통코드(MODULE_CD) 기반 업무 모듈 */
export interface SystemModuleOption {
  moduleCode: string;
  moduleName: string;
  screenCount?: number;
}

export interface SystemScreen {
  screenId: number;
  systemId: number;
  moduleCode: string;
  menuId: string;
  screenCode: string;
  screenName: string;
  transactionCode: string | null;
  menuPath: string | null;
  screenType: ScreenType | null;
  url: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface SystemModuleDto extends SystemModuleOption {
  screens?: SystemScreenDto[];
}

export interface SystemScreenDto extends SystemScreen {
  systemCode?: string;
  systemName?: string;
  moduleName?: string;
}

export interface ApplicationSystemDto extends ApplicationSystem {
  companyName?: string | null;
  businessUnitName?: string | null;
  moduleCount?: number;
  screenCount?: number;
}

export interface SystemHierarchyDto extends ApplicationSystemDto {
  modules: Array<SystemModuleDto & { screens: SystemScreenDto[] }>;
}

export interface SystemScreenListFilters {
  moduleCode?: string;
  isActive?: boolean;
}

export interface SystemListFilters {
  search?: string;
  systemType?: SystemType;
  companyCode?: string;
  businessUnitCode?: string;
  isActive?: boolean;
}

export interface UpsertApplicationSystemDto {
  systemCode: string;
  systemName: string;
  systemType: SystemType;
  companyCode?: string | null;
  businessUnitCode?: string | null;
  vendor?: string | null;
  version?: string | null;
  description?: string | null;
  systemOwnerId?: number | null;
  isActive?: boolean;
  tableApiUrl?: string | null;
  tableApiAuthType?: ApiAuthType | null;
  tableApiConfig?: Record<string, unknown> | null;
  columnApiUrl?: string | null;
}

export interface UpsertSystemScreenDto {
  systemId: number;
  moduleCode: string;
  menuId: string;
  screenName: string;
  screenCode?: string;
  transactionCode?: string | null;
  menuPath?: string | null;
  screenType?: ScreenType | null;
  url?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface TaskSystemLink {
  linkId: number;
  nodeId: number;
  systemId: number;
  usageDescription: string | null;
  isPrimary: boolean;
  createdBy: number | null;
  createdAt: Date;
}

export interface TaskSystemScreenLink {
  screenLinkId: number;
  linkId: number;
  screenId: number;
  createdAt: Date;
}

export interface TaskSystemScreenLinkDto extends TaskSystemScreenLink {
  moduleCode: string;
  moduleName: string;
  menuId: string;
  screenCode: string;
  screenName: string;
  transactionCode: string | null;
  menuPath: string | null;
  screenType: ScreenType | null;
}

export interface TaskSystemLinkDto extends TaskSystemLink {
  systemCode: string;
  systemName: string;
  companyCode: string | null;
  businessUnitCode: string | null;
  companyName: string | null;
  businessUnitName: string | null;
  screenCount: number;
  screens: TaskSystemScreenLinkDto[];
}

export interface CreateTaskSystemLinkDto {
  nodeId: number;
  systemId: number;
  usageDescription?: string | null;
  isPrimary?: boolean;
}

export interface BatchCreateTaskSystemLinkDto {
  systemIds: number[];
  isPrimary?: boolean;
}

export interface BatchCreateTaskSystemScreenLinkDto {
  screenIds: number[];
}

export interface UpdateTaskSystemLinkDto {
  isPrimary?: boolean;
}

export interface ScreenCatalogFilters {
  systemId?: number;
  moduleCode?: string;
  search?: string;
  excludeNodeId?: number;
  excludeLinkId?: number;
  /** excludeLinkId와 함께 사용 — 링크 소속 Task(node) 검증 */
  linkNodeId?: number;
  page?: number;
  pageSize?: number;
}

export interface ScreenCatalogItem extends SystemScreenDto {
  companyCode: string | null;
  businessUnitCode: string | null;
  companyName: string | null;
  businessUnitName: string | null;
}

export interface SystemCatalogFilters {
  search?: string;
  companyCode?: string;
  businessUnitCode?: string;
  excludeNodeId?: number;
  page?: number;
  pageSize?: number;
}

export interface SystemCatalogItem extends ApplicationSystemDto {
  companyName: string | null;
  businessUnitName: string | null;
}
