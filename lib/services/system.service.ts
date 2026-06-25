import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { Locale } from "@/lib/i18n/config";
import * as processQueries from "@/lib/db/queries/process";
import * as systemQueries from "@/lib/db/queries/system";
import type {
  ApplicationSystemDto,
  BatchCreateTaskSystemLinkDto,
  BatchCreateTaskSystemScreenLinkDto,
  CreateTaskSystemLinkDto,
  ScreenCatalogFilters,
  ScreenCatalogItem,
  SystemCatalogFilters,
  SystemCatalogItem,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModuleOption,
  SystemScreen,
  SystemScreenDto,
  SystemScreenListFilters,
  TaskSystemLinkDto,
  UpdateTaskSystemLinkDto,
  UpsertApplicationSystemDto,
  UpsertSystemScreenDto,
} from "@/types/system";

const CODE_PATTERN = /^[A-Z0-9_-]+$/;

const normalizeCode = (value: string): string => value.trim().toUpperCase();

/** 코드 형식과 필수값을 검증한다. */
const assertCode = (value: string, field: string): string => {
  const normalized = normalizeCode(value);
  if (!normalized) {
    throw new ApiError("E001", "Code is required", 400, undefined, field);
  }
  if (!CODE_PATTERN.test(normalized)) {
    throw new ApiError(
      "E001",
      "Code must contain only letters, numbers, underscores, and hyphens",
      400,
      undefined,
      field,
    );
  }

  return normalized;
};

const assertName = (value: string | undefined, field: string): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new ApiError("E001", "Name is required", 400, undefined, field);
  }

  return normalized;
};

/** Task 매핑 가능한 L4 프로세스인지 확인한다. */
const assertTaskNode = async (nodeId: number): Promise<void> => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404, undefined, "nodeId");
  }
  if (node.level !== "L4") {
    throw new ApiError(
      "E405",
      "System mapping can only be managed for L4 tasks",
      400,
      undefined,
      "nodeId",
    );
  }
};

/** 시스템 목록을 조회한다. */
export const listSystems = async (
  locale: Locale,
  filters: SystemListFilters = {},
): Promise<ApplicationSystemDto[]> => systemQueries.listSystems(filters, locale);

/** 시스템 상세를 조회한다. */
export const getSystem = async (systemId: number): Promise<ApplicationSystemDto> => {
  const system = await systemQueries.findSystemById(systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404);
  }

  const [systems] = await Promise.all([
    systemQueries.listSystems({ isActive: undefined }, "ko"),
  ]);
  const dto = systems.find((item) => item.systemId === systemId);

  return dto ?? { ...system, moduleCount: 0, screenCount: 0 };
};

/** 시스템을 생성한다. */
export const createSystem = async (
  dto: UpsertApplicationSystemDto,
): Promise<ApplicationSystemDto> => {
  const normalized = normalizeSystemDto(dto);
  if (
    await systemQueries.existsSystemIdentity(
      normalized.systemCode,
      normalized.companyCode ?? "",
      normalized.businessUnitCode ?? "",
    )
  ) {
    throw new ApiError(
      "E304",
      "Duplicate system for company and business unit",
      409,
      undefined,
      "systemCode",
    );
  }

  const created = await systemQueries.createSystem(normalized);
  return getSystem(created.systemId);
};

/** 시스템을 수정한다. */
export const updateSystem = async (
  systemId: number,
  dto: UpsertApplicationSystemDto,
): Promise<ApplicationSystemDto> => {
  const existing = await systemQueries.findSystemById(systemId);
  if (!existing) {
    throw new ApiError("E301", "System not found", 404);
  }

  const normalized = normalizeSystemDto(dto);
  if (
    await systemQueries.existsSystemIdentity(
      normalized.systemCode,
      normalized.companyCode ?? "",
      normalized.businessUnitCode ?? "",
      systemId,
    )
  ) {
    throw new ApiError(
      "E304",
      "Duplicate system for company and business unit",
      409,
      undefined,
      "systemCode",
    );
  }

  const updated = await systemQueries.updateSystem(systemId, normalized);
  if (!updated) {
    throw new ApiError("E301", "System not found", 404);
  }

  return getSystem(systemId);
};

/** 시스템을 비활성화한다. */
export const deactivateSystem = async (systemId: number): Promise<void> => {
  if (!(await systemQueries.findSystemById(systemId))) {
    throw new ApiError("E301", "System not found", 404);
  }
  await systemQueries.deactivateSystem(systemId);
};

const normalizeSystemDto = (
  dto: UpsertApplicationSystemDto,
): UpsertApplicationSystemDto => ({
  ...dto,
  systemCode: assertCode(dto.systemCode, "systemCode"),
  systemName: assertName(dto.systemName, "systemName"),
  companyCode: assertCode(dto.companyCode ?? "", "companyCode"),
  businessUnitCode: assertCode(dto.businessUnitCode ?? "", "businessUnitCode"),
  vendor: dto.vendor?.trim() || null,
  version: dto.version?.trim() || null,
  description: dto.description?.trim() || null,
  tableApiUrl: dto.tableApiUrl?.trim() || null,
  tableApiAuthType: dto.tableApiAuthType ?? null,
  tableApiConfig: dto.tableApiConfig ?? null,
  columnApiUrl: dto.columnApiUrl?.trim() || null,
});

/** 공통 모듈 목록을 조회한다. */
export const listModules = async (
  systemId: number,
  locale: Locale = "ko",
): Promise<SystemModuleOption[]> => {
  if (!(await systemQueries.findSystemById(systemId))) {
    throw new ApiError("E301", "System not found", 404);
  }

  const modules = await systemQueries.listModuleOptions(locale, systemId);
  return modules.filter((module) => (module.screenCount ?? 0) > 0);
};

/** 화면 목록을 조회한다. */
export const listScreens = async (
  systemId: number,
  filters: SystemScreenListFilters = {},
  locale: Locale = "ko",
): Promise<SystemScreenDto[]> => {
  if (!(await systemQueries.findSystemById(systemId))) {
    throw new ApiError("E301", "System not found", 404);
  }

  return systemQueries.listScreensBySystem(systemId, filters, locale);
};

export const createScreen = async (
  dto: UpsertSystemScreenDto,
): Promise<SystemScreen> => {
  if (!(await systemQueries.findSystemById(dto.systemId))) {
    throw new ApiError("E301", "System not found", 404, undefined, "systemId");
  }

  const normalized = normalizeScreenDto(dto);
  if (
    await systemQueries.existsScreenMenu(normalized.systemId, normalized.menuId)
  ) {
    throw new ApiError("E304", "Duplicate menu id", 409, undefined, "menuId");
  }

  return systemQueries.createScreen(normalized);
};

export const updateScreen = async (
  screenId: number,
  dto: UpsertSystemScreenDto,
): Promise<SystemScreen> => {
  const existing = await systemQueries.findScreenById(screenId);
  if (!existing) {
    throw new ApiError("E301", "Screen not found", 404);
  }

  const normalized = normalizeScreenDto(dto);
  if (
    await systemQueries.existsScreenMenu(
      normalized.systemId,
      normalized.menuId,
      screenId,
    )
  ) {
    throw new ApiError("E304", "Duplicate menu id", 409, undefined, "menuId");
  }

  const updated = await systemQueries.updateScreen(screenId, normalized);
  if (!updated) {
    throw new ApiError("E301", "Screen not found", 404);
  }

  return updated;
};

export const deactivateScreen = async (screenId: number): Promise<void> => {
  if (!(await systemQueries.findScreenById(screenId))) {
    throw new ApiError("E301", "Screen not found", 404);
  }
  await systemQueries.deactivateScreen(screenId);
};

const normalizeScreenDto = (
  dto: UpsertSystemScreenDto,
): UpsertSystemScreenDto => {
  const menuId = assertCode(dto.menuId, "menuId");
  const moduleCode = assertCode(dto.moduleCode, "moduleCode");

  return {
    ...dto,
    menuId,
    moduleCode,
    screenCode: dto.screenCode ? assertCode(dto.screenCode, "screenCode") : menuId,
    screenName: assertName(dto.screenName, "screenName"),
    transactionCode: dto.transactionCode?.trim() || menuId,
    menuPath: dto.menuPath?.trim() || null,
    url: dto.url?.trim() || null,
    description: dto.description?.trim() || null,
  };
};

/** 활성 시스템 계층을 조회한다. */
export const listSystemHierarchy = async (
  locale: Locale,
): Promise<SystemHierarchyDto[]> => systemQueries.listSystemHierarchy(locale);

/** Task별 시스템 1차 연결 목록을 조회한다. */
export const listTaskSystemLinks = async (
  nodeId: number,
  locale: Locale = "ko",
  options: { includeScreens?: boolean } = {},
): Promise<TaskSystemLinkDto[]> => {
  await assertTaskNode(nodeId);
  return systemQueries.listTaskSystemLinks(nodeId, locale, options);
};

/** Task-시스템 1차 연결 상세(화면 포함)를 조회한다. */
export const getTaskSystemLink = async (
  nodeId: number,
  linkId: number,
  locale: Locale = "ko",
): Promise<TaskSystemLinkDto> => {
  await assertTaskNode(nodeId);
  const link = await systemQueries.findTaskSystemLinkById(nodeId, linkId, locale);
  if (!link) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }
  return link;
};

/** Task-시스템 1차 연결을 생성한다. */
export const createTaskSystemLink = async (
  dto: CreateTaskSystemLinkDto,
  userId: number,
): Promise<TaskSystemLinkDto> => {
  await assertTaskNode(dto.nodeId);

  const system = await systemQueries.findSystemById(dto.systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404, undefined, "systemId");
  }

  return systemQueries.createTaskSystemLink(
    {
      ...dto,
      usageDescription: dto.usageDescription?.trim() || null,
      isPrimary: dto.isPrimary ?? false,
    },
    userId,
  );
};

/** Task-시스템 1차 연결을 삭제한다. */
export const deleteTaskSystemLink = async (
  nodeId: number,
  linkId: number,
): Promise<void> => {
  await assertTaskNode(nodeId);
  const link = await systemQueries.findTaskSystemLinkById(nodeId, linkId);
  if (!link) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }
  await systemQueries.deleteTaskSystemLink(nodeId, linkId);
};

/** Task-시스템 1차 연결의 주요 시스템을 지정한다. */
export const setTaskSystemLinkPrimary = async (
  nodeId: number,
  linkId: number,
): Promise<TaskSystemLinkDto> => {
  await assertTaskNode(nodeId);
  const link = await systemQueries.findTaskSystemLinkById(nodeId, linkId);
  if (!link) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }

  await systemQueries.setTaskSystemLinkPrimary(nodeId, linkId);
  const updated = await systemQueries.findTaskSystemLinkById(nodeId, linkId);
  if (!updated) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }

  return updated;
};

/** Task-시스템 1차 연결을 일괄 생성한다. */
export const createTaskSystemLinksBatch = async (
  nodeId: number,
  dto: BatchCreateTaskSystemLinkDto,
  userId: number,
): Promise<{ createdCount: number }> => {
  await assertTaskNode(nodeId);

  if (!dto.systemIds.length) {
    throw new ApiError("E001", "System ids are required", 400, undefined, "systemIds");
  }

  const createdCount = await systemQueries.createTaskSystemLinksBatch(
    nodeId,
    {
      systemIds: dto.systemIds,
      isPrimary: dto.isPrimary ?? false,
    },
    userId,
  );

  return { createdCount };
};

/** Task-시스템 1차 연결을 수정한다. */
export const updateTaskSystemLink = async (
  nodeId: number,
  linkId: number,
  dto: UpdateTaskSystemLinkDto,
): Promise<TaskSystemLinkDto> => {
  if (dto.isPrimary) {
    return setTaskSystemLinkPrimary(nodeId, linkId);
  }

  const link = await systemQueries.findTaskSystemLinkById(nodeId, linkId);
  if (!link) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }

  return link;
};

/** 연결 후보 시스템 카탈로그를 조회한다. */
export const listSystemCatalog = async (
  filters: SystemCatalogFilters,
  locale: Locale = "ko",
): Promise<{ items: SystemCatalogItem[]; total: number }> => {
  if (filters.excludeNodeId) {
    await assertTaskNode(filters.excludeNodeId);
  }

  return systemQueries.listSystemCatalog(filters, locale);
};

/** 연결 후보 화면 카탈로그를 조회한다. */
export const listScreenCatalog = async (
  filters: ScreenCatalogFilters,
  locale: Locale = "ko",
): Promise<{ items: ScreenCatalogItem[]; total: number }> => {
  if (filters.excludeNodeId) {
    await assertTaskNode(filters.excludeNodeId);
  }

  if (filters.excludeLinkId) {
    const systemId = await systemQueries.findTaskSystemLinkSystemId(
      filters.excludeLinkId,
      filters.linkNodeId,
    );
    if (!systemId) {
      throw new ApiError("E301", "System link not found", 404, undefined, "excludeLinkId");
    }
    filters = { ...filters, systemId };
  }

  return systemQueries.listScreenCatalog(filters, locale);
};

/** Task-시스템 2차 화면 연결을 일괄 생성한다. */
export const createTaskSystemScreenLinksBatch = async (
  nodeId: number,
  linkId: number,
  dto: BatchCreateTaskSystemScreenLinkDto,
): Promise<{ createdCount: number }> => {
  await assertTaskNode(nodeId);

  const link = await systemQueries.findTaskSystemLinkById(nodeId, linkId);
  if (!link) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }

  const screenIds = [...new Set(dto.screenIds.map((id) => Number(id)).filter((id) => id > 0))];
  if (!screenIds.length) {
    throw new ApiError("E001", "Screen ids are required", 400, undefined, "screenIds");
  }

  const missingScreenIds: number[] = [];
  for (const screenId of screenIds) {
    if (!(await systemQueries.findScreenById(screenId))) {
      missingScreenIds.push(screenId);
    }
  }
  if (missingScreenIds.length > 0) {
    throw new ApiError("E301", "Screen not found", 404, undefined, "screenId");
  }

  const foreignScreenIds = await systemQueries.findScreenIdsOutsideTaskSystemLink(
    nodeId,
    linkId,
    screenIds,
  );
  if (foreignScreenIds.length > 0) {
    throw new ApiError(
      "E406",
      "Screen does not belong to the linked system",
      400,
      undefined,
      "screenId",
    );
  }

  const createdCount = await systemQueries.createTaskSystemScreenLinksBatch(
    linkId,
    { screenIds },
  );

  return { createdCount };
};

/** Task-시스템 2차 화면 연결을 삭제한다. */
export const deleteTaskSystemScreenLink = async (
  nodeId: number,
  linkId: number,
  screenLinkId: number,
): Promise<void> => {
  await assertTaskNode(nodeId);
  const link = await systemQueries.findTaskSystemLinkById(nodeId, linkId);
  if (!link) {
    throw new ApiError("E301", "System link not found", 404, undefined, "linkId");
  }

  const exists = link.screens.some((screen) => screen.screenLinkId === screenLinkId);
  if (!exists) {
    throw new ApiError("E301", "Screen link not found", 404, undefined, "screenLinkId");
  }

  await systemQueries.deleteTaskSystemScreenLink(linkId, screenLinkId);
};

/** 화면을 upsert한다. (마이그레이션/동기화용) */
export const upsertScreen = async (
  dto: UpsertSystemScreenDto,
): Promise<SystemScreen> => {
  const normalized = normalizeScreenDto(dto);
  return systemQueries.upsertScreen(normalized);
};

/** MODULE_CD 공통코드를 upsert한다. */
export const upsertModuleCode = async (
  moduleCode: string,
  moduleName?: string,
  sortOrder = 0,
): Promise<void> => {
  await systemQueries.upsertModuleCode(
    assertCode(moduleCode, "moduleCode"),
    moduleName?.trim() || moduleCode,
    sortOrder,
  );
};

/** 법인·사업부·시스템 코드로 시스템을 조회한다. */
export const findSystemByScope = async (
  systemCode: string,
  companyCode: string,
  businessUnitCode: string,
) =>
  systemQueries.findSystemByScope(
    assertCode(systemCode, "systemCode"),
    assertCode(companyCode, "companyCode"),
    assertCode(businessUnitCode, "businessUnitCode"),
  );
