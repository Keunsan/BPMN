import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import * as e2eQueries from "@/lib/db/queries/e2e-process";
import type {
  CreateE2eProcessDto,
  E2eProcessDto,
  E2eProcessFilters,
  UpdateE2eProcessDto,
} from "@/types/e2e-process";

const toDto = (
  row: Awaited<ReturnType<typeof e2eQueries.listE2eProcesses>>[number],
): E2eProcessDto => ({
  ...row,
  participantL3Count: row.participantL3Count,
  currentBpmnModelId: row.currentBpmnModelId,
});

export const listE2eProcesses = async (
  filters: E2eProcessFilters = {},
): Promise<E2eProcessDto[]> => {
  const rows = await e2eQueries.listE2eProcesses(filters);
  return rows.map(toDto);
};

export const getE2eProcessDetail = async (
  e2eProcessId: number,
): Promise<E2eProcessDto> => {
  const rows = await e2eQueries.listE2eProcesses({});
  const found = rows.find((row) => row.e2eProcessId === e2eProcessId);
  if (!found) {
    const entity = await e2eQueries.findE2eProcessById(e2eProcessId);
    if (!entity) {
      throw new ApiError("E404", "E2E process not found", 404);
    }
    return {
      ...entity,
      participantL3Count: 0,
      currentBpmnModelId: null,
    };
  }
  return toDto(found);
};

export const createE2eProcess = async (
  dto: CreateE2eProcessDto,
  userId?: number,
): Promise<E2eProcessDto> => {
  if (!dto.code?.trim()) {
    throw new ApiError("E001", "E2E code is required", 400, undefined, "code");
  }
  if (!dto.name?.trim()) {
    throw new ApiError("E001", "E2E name is required", 400, undefined, "name");
  }

  const existing = await e2eQueries.findE2eProcessByCode(dto.code.trim());
  if (existing) {
    throw new ApiError("E409", "E2E code already exists", 409, undefined, "code");
  }

  const e2eProcessId = await e2eQueries.insertE2eProcess({
    code: dto.code.trim(),
    name: dto.name.trim(),
    description: dto.description ?? null,
    tags: dto.tags ?? null,
    status: dto.status ?? "DRAFT",
    version: dto.version ?? "1.0.0",
    createdBy: userId ?? null,
  });

  return getE2eProcessDetail(e2eProcessId);
};

export const updateE2eProcess = async (
  e2eProcessId: number,
  dto: UpdateE2eProcessDto,
  userId?: number,
): Promise<E2eProcessDto> => {
  const existing = await e2eQueries.findE2eProcessById(e2eProcessId);
  if (!existing) {
    throw new ApiError("E404", "E2E process not found", 404);
  }

  if (dto.code?.trim() && dto.code.trim() !== existing.code) {
    const duplicate = await e2eQueries.findE2eProcessByCode(dto.code.trim());
    if (duplicate) {
      throw new ApiError("E409", "E2E code already exists", 409, undefined, "code");
    }
  }

  await e2eQueries.updateE2eProcess(e2eProcessId, {
    ...dto,
    code: dto.code?.trim(),
    name: dto.name?.trim(),
    updatedBy: userId ?? null,
  });

  return getE2eProcessDetail(e2eProcessId);
};

export const deleteE2eProcess = async (e2eProcessId: number): Promise<void> => {
  const existing = await e2eQueries.findE2eProcessById(e2eProcessId);
  if (!existing) {
    throw new ApiError("E404", "E2E process not found", 404);
  }

  const modelId =
    await e2eQueries.findCurrentBpmnModelIdByE2eProcessId(e2eProcessId);
  if (modelId) {
    throw new ApiError(
      "E409",
      "Cannot delete E2E process with BPMN model",
      409,
    );
  }

  await e2eQueries.deleteE2eProcess(e2eProcessId);
};

export const listE2eProcessesForTree = async (): Promise<E2eProcessDto[]> =>
  listE2eProcesses({});

export const listE2eProcessesByL3NodeId = async (
  nodeId: number,
): Promise<E2eProcessDto[]> => {
  const rows = await e2eQueries.listE2eProcessesByL3NodeId(nodeId);
  return rows.map((row) => ({
    ...row,
    participantL3Count: undefined,
    currentBpmnModelId: undefined,
  }));
};
