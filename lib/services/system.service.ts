import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as processQueries from "@/lib/db/queries/process";
import * as systemQueries from "@/lib/db/queries/system";
import type {
  ApplicationSystemDto,
  CreateTaskSystemMappingDto,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModule,
  SystemModuleDto,
  SystemScreen,
  SystemScreenDto,
  TaskSystemMappingDto,
  UpsertApplicationSystemDto,
  UpsertSystemModuleDto,
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

/** Task 매핑 가능한 L3/L4 프로세스인지 확인한다. */
const assertTaskNode = async (nodeId: number): Promise<void> => {
  const node = await processQueries.findProcessById(nodeId);
  if (!node) {
    throw new ApiError("E302", "Process not found", 404, undefined, "nodeId");
  }
  if (node.level !== "L3" && node.level !== "L4") {
    throw new ApiError(
      "E405",
      "System mapping can only be managed for L3/L4 nodes",
      400,
      undefined,
      "nodeId",
    );
  }
};

/** 시스템 목록을 조회한다. */
export const listSystems = async (
  filters: SystemListFilters = {},
): Promise<ApplicationSystemDto[]> => systemQueries.listSystems(filters);

/** 시스템 상세를 조회한다. */
export const getSystem = async (systemId: number): Promise<ApplicationSystemDto> => {
  const system = await systemQueries.findSystemById(systemId);
  if (!system) {
    throw new ApiError("E301", "System not found", 404);
  }

  const [modules] = await Promise.all([systemQueries.listModules(systemId)]);
  const screenCount = modules.reduce(
    (sum, module) => sum + (module.screenCount ?? 0),
    0,
  );

  return { ...system, moduleCount: modules.length, screenCount };
};

/** 시스템을 생성한다. */
export const createSystem = async (
  dto: UpsertApplicationSystemDto,
): Promise<ApplicationSystemDto> => {
  const normalized = normalizeSystemDto(dto);
  if (await systemQueries.existsSystemCode(normalized.systemCode)) {
    throw new ApiError("E304", "Duplicate system code", 409, undefined, "systemCode");
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
  if (await systemQueries.existsSystemCode(normalized.systemCode, systemId)) {
    throw new ApiError("E304", "Duplicate system code", 409, undefined, "systemCode");
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
  vendor: dto.vendor?.trim() || null,
  version: dto.version?.trim() || null,
  description: dto.description?.trim() || null,
  tableApiUrl: dto.tableApiUrl?.trim() || null,
  tableApiAuthType: dto.tableApiAuthType ?? null,
  tableApiConfig: dto.tableApiConfig ?? null,
  columnApiUrl: dto.columnApiUrl?.trim() || null,
});

/** 모듈 목록을 조회한다. */
export const listModules = async (systemId: number): Promise<SystemModuleDto[]> => {
  if (!(await systemQueries.findSystemById(systemId))) {
    throw new ApiError("E301", "System not found", 404);
  }
  return systemQueries.listModules(systemId);
};

export const createModule = async (
  dto: UpsertSystemModuleDto,
): Promise<SystemModule> => {
  if (!(await systemQueries.findSystemById(dto.systemId))) {
    throw new ApiError("E301", "System not found", 404, undefined, "systemId");
  }

  const normalized = normalizeModuleDto(dto);
  if (
    await systemQueries.existsModuleCode(
      normalized.systemId,
      normalized.moduleCode,
    )
  ) {
    throw new ApiError("E304", "Duplicate module code", 409, undefined, "moduleCode");
  }

  return systemQueries.createModule(normalized);
};

export const updateModule = async (
  moduleId: number,
  dto: UpsertSystemModuleDto,
): Promise<SystemModule> => {
  const existing = await systemQueries.findModuleById(moduleId);
  if (!existing) {
    throw new ApiError("E301", "Module not found", 404);
  }

  const normalized = normalizeModuleDto(dto);
  if (
    await systemQueries.existsModuleCode(
      normalized.systemId,
      normalized.moduleCode,
      moduleId,
    )
  ) {
    throw new ApiError("E304", "Duplicate module code", 409, undefined, "moduleCode");
  }

  const updated = await systemQueries.updateModule(moduleId, normalized);
  if (!updated) {
    throw new ApiError("E301", "Module not found", 404);
  }

  return updated;
};

export const deactivateModule = async (moduleId: number): Promise<void> => {
  if (!(await systemQueries.findModuleById(moduleId))) {
    throw new ApiError("E301", "Module not found", 404);
  }
  await systemQueries.deactivateModule(moduleId);
};

const normalizeModuleDto = (
  dto: UpsertSystemModuleDto,
): UpsertSystemModuleDto => ({
  ...dto,
  moduleCode: assertCode(dto.moduleCode, "moduleCode"),
  moduleName: assertName(dto.moduleName, "moduleName"),
  description: dto.description?.trim() || null,
});

/** 화면 목록을 조회한다. */
export const listScreens = async (moduleId: number): Promise<SystemScreenDto[]> => {
  if (!(await systemQueries.findModuleById(moduleId))) {
    throw new ApiError("E301", "Module not found", 404);
  }
  return systemQueries.listScreens(moduleId);
};

export const createScreen = async (
  dto: UpsertSystemScreenDto,
): Promise<SystemScreen> => {
  if (!(await systemQueries.findModuleById(dto.moduleId))) {
    throw new ApiError("E301", "Module not found", 404, undefined, "moduleId");
  }

  const normalized = normalizeScreenDto(dto);
  if (
    await systemQueries.existsScreenCode(
      normalized.moduleId,
      normalized.screenCode,
    )
  ) {
    throw new ApiError("E304", "Duplicate screen code", 409, undefined, "screenCode");
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
    await systemQueries.existsScreenCode(
      normalized.moduleId,
      normalized.screenCode,
      screenId,
    )
  ) {
    throw new ApiError("E304", "Duplicate screen code", 409, undefined, "screenCode");
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
): UpsertSystemScreenDto => ({
  ...dto,
  screenCode: assertCode(dto.screenCode, "screenCode"),
  screenName: assertName(dto.screenName, "screenName"),
  transactionCode: dto.transactionCode?.trim() || null,
  menuPath: dto.menuPath?.trim() || null,
  url: dto.url?.trim() || null,
  description: dto.description?.trim() || null,
});

/** 활성 시스템 계층을 조회한다. */
export const listSystemHierarchy = async (): Promise<SystemHierarchyDto[]> =>
  systemQueries.listSystemHierarchy();

/** Task별 시스템 매핑을 조회한다. */
export const listTaskSystemMappings = async (
  nodeId: number,
): Promise<TaskSystemMappingDto[]> => {
  await assertTaskNode(nodeId);
  return systemQueries.listTaskSystemMappings(nodeId);
};

/** Task-시스템 매핑을 생성한다. */
export const createTaskSystemMapping = async (
  dto: CreateTaskSystemMappingDto,
  userId: number,
): Promise<TaskSystemMappingDto> => {
  await assertTaskNode(dto.nodeId);

  const screen = await systemQueries.findScreenById(dto.screenId);
  if (!screen) {
    throw new ApiError("E301", "Screen not found", 404, undefined, "screenId");
  }

  return systemQueries.createTaskSystemMapping(
    {
      ...dto,
      usageDescription: dto.usageDescription?.trim() || null,
      isPrimary: dto.isPrimary ?? false,
    },
    userId,
  );
};

/** Task-시스템 매핑을 삭제한다. */
export const deleteTaskSystemMapping = async (
  nodeId: number,
  mappingId: number,
): Promise<void> => {
  await assertTaskNode(nodeId);
  await systemQueries.deleteTaskSystemMapping(nodeId, mappingId);
};
