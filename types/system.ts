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

export interface SystemModule {
  moduleId: number;
  systemId: number;
  moduleCode: string;
  moduleName: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface SystemScreen {
  screenId: number;
  moduleId: number;
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

export interface SystemModuleDto extends SystemModule {
  screenCount?: number;
}

export interface SystemScreenDto extends SystemScreen {
  systemId?: number;
  systemCode?: string;
  systemName?: string;
  moduleCode?: string;
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

export interface UpsertSystemModuleDto {
  systemId: number;
  moduleCode: string;
  moduleName: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpsertSystemScreenDto {
  moduleId: number;
  screenCode: string;
  screenName: string;
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
  moduleId: number;
  moduleCode: string;
  moduleName: string;
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
