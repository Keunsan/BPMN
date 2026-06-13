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

export type SystemUsageType =
  | "EXECUTE"
  | "INQUIRY"
  | "APPROVAL"
  | "REPORT"
  | "INTERFACE";

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

export interface TaskSystemMapping {
  mappingId: number;
  nodeId: number;
  screenId: number;
  usageType: SystemUsageType;
  usageDescription: string | null;
  isPrimary: boolean;
  createdBy: number | null;
  createdAt: Date;
}

export interface TaskSystemMappingDto extends TaskSystemMapping {
  systemId: number;
  systemCode: string;
  systemName: string;
  companyCode: string | null;
  businessUnitCode: string | null;
  companyName: string | null;
  businessUnitName: string | null;
  moduleCode: string;
  moduleName: string;
  menuId: string;
  screenCode: string;
  screenName: string;
  transactionCode: string | null;
  menuPath: string | null;
  screenType: ScreenType | null;
}

export interface CreateTaskSystemMappingDto {
  nodeId: number;
  screenId: number;
  usageType: SystemUsageType;
  usageDescription?: string | null;
  isPrimary?: boolean;
}

export interface BatchCreateTaskSystemMappingDto {
  screenIds: number[];
  usageType?: SystemUsageType;
  usageDescription?: string | null;
  isPrimary?: boolean;
}

export interface ScreenCatalogFilters {
  systemId?: number;
  moduleCode?: string;
  search?: string;
  excludeNodeId?: number;
  page?: number;
  pageSize?: number;
}

export interface ScreenCatalogItem extends SystemScreenDto {
  companyCode: string | null;
  businessUnitCode: string | null;
  companyName: string | null;
  businessUnitName: string | null;
}
