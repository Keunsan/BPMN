import "server-only";

import type {
  CreateE2eProcessDto,
  E2eProcess,
  E2eProcessFilters,
  E2eProcessStatus,
  UpdateE2eProcessDto,
} from "@/types/e2e-process";

import { query, queryOne } from "../pool";

const parseTags = (raw: string | null): string[] | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : null;
  } catch {
    return null;
  }
};

const mapE2eProcess = (row: Record<string, unknown>): E2eProcess => ({
  e2eProcessId: row.e2e_process_id as number,
  code: row.code as string,
  name: row.name as string,
  description: (row.description as string | null) ?? null,
  tags: parseTags((row.tags as string | null) ?? null),
  status: row.status as E2eProcessStatus,
  version: row.version as string,
  ownerOrgId: (row.owner_org_id as number | null) ?? null,
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

export const findE2eProcessById = async (
  e2eProcessId: number,
): Promise<E2eProcess | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM e2e_process WHERE e2e_process_id = @e2eProcessId`,
    { e2eProcessId },
  );
  return row ? mapE2eProcess(row) : null;
};

export const findE2eProcessByCode = async (
  code: string,
): Promise<E2eProcess | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM e2e_process WHERE code = @code`,
    { code },
  );
  return row ? mapE2eProcess(row) : null;
};

export const listE2eProcesses = async (
  filters: E2eProcessFilters = {},
): Promise<
  Array<
    E2eProcess & {
      participantL3Count: number;
      currentBpmnModelId: number | null;
    }
  >
> => {
  const conditions: string[] = ["1=1"];
  const params: Record<string, string | number> = {};

  if (filters.status) {
    conditions.push("e.status = @status");
    params.status = filters.status;
  }

  if (filters.search?.trim()) {
    conditions.push(
      "(e.code LIKE @search OR e.name LIKE @search OR e.description LIKE @search)",
    );
    params.search = `%${filters.search.trim()}%`;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT e.*,
            (
              SELECT COUNT(DISTINCT be.linked_node_id)
              FROM bpmn_model bm
              INNER JOIN bpmn_element be ON be.model_id = bm.model_id
              WHERE bm.e2e_process_id = e.e2e_process_id
                AND be.linked_node_id IS NOT NULL
                AND bm.model_id = (
                  SELECT TOP 1 bm2.model_id
                  FROM bpmn_model bm2
                  WHERE bm2.e2e_process_id = e.e2e_process_id
                  ORDER BY bm2.is_current DESC, bm2.updated_at DESC, bm2.model_id DESC
                )
            ) AS participant_l3_count,
            (
              SELECT TOP 1 bm.model_id
              FROM bpmn_model bm
              WHERE bm.e2e_process_id = e.e2e_process_id
              ORDER BY bm.is_current DESC, bm.updated_at DESC, bm.model_id DESC
            ) AS current_bpmn_model_id
     FROM e2e_process e
     WHERE ${conditions.join(" AND ")}
     ORDER BY e.code ASC`,
    params,
  );

  return rows.map((row) => ({
    ...mapE2eProcess(row),
    participantL3Count: Number(row.participant_l3_count ?? 0),
    currentBpmnModelId: (row.current_bpmn_model_id as number | null) ?? null,
  }));
};

export const insertE2eProcess = async (input: {
  code: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  status?: E2eProcessStatus;
  version?: string;
  createdBy?: number | null;
}): Promise<number> => {
  const row = await queryOne<{ e2e_process_id: number }>(
    `INSERT INTO e2e_process (
       code, name, description, tags, status, version, created_by
     )
     OUTPUT INSERTED.e2e_process_id
     VALUES (
       @code, @name, @description, @tags, @status, @version, @createdBy
     )`,
    {
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      tags: input.tags?.length ? JSON.stringify(input.tags) : null,
      status: input.status ?? "DRAFT",
      version: input.version ?? "1.0.0",
      createdBy: input.createdBy ?? null,
    },
  );

  if (!row?.e2e_process_id) {
    throw new Error("Failed to insert e2e_process");
  }

  return row.e2e_process_id;
};

export const updateE2eProcess = async (
  e2eProcessId: number,
  input: UpdateE2eProcessDto & { updatedBy?: number | null },
): Promise<void> => {
  const sets: string[] = ["updated_at = GETDATE()"];
  const params: Record<string, string | number | null> = { e2eProcessId };

  if (input.code !== undefined) {
    sets.push("code = @code");
    params.code = input.code;
  }
  if (input.name !== undefined) {
    sets.push("name = @name");
    params.name = input.name;
  }
  if (input.description !== undefined) {
    sets.push("description = @description");
    params.description = input.description;
  }
  if (input.tags !== undefined) {
    sets.push("tags = @tags");
    params.tags = input.tags?.length ? JSON.stringify(input.tags) : null;
  }
  if (input.status !== undefined) {
    sets.push("status = @status");
    params.status = input.status;
  }
  if (input.version !== undefined) {
    sets.push("version = @version");
    params.version = input.version;
  }
  if (input.updatedBy !== undefined) {
    sets.push("updated_by = @updatedBy");
    params.updatedBy = input.updatedBy;
  }

  await queryOne(
    `UPDATE e2e_process SET ${sets.join(", ")} WHERE e2e_process_id = @e2eProcessId`,
    params,
  );
};

export const deleteE2eProcess = async (e2eProcessId: number): Promise<void> => {
  await queryOne(
    `DELETE FROM e2e_process WHERE e2e_process_id = @e2eProcessId`,
    { e2eProcessId },
  );
};

export const listE2eParticipantL3Ids = async (
  e2eProcessId: number,
): Promise<number[]> => {
  const rows = await query<{ linked_node_id: number }>(
    `SELECT DISTINCT be.linked_node_id
     FROM bpmn_model bm
     INNER JOIN bpmn_element be ON be.model_id = bm.model_id
     INNER JOIN process_node p ON p.node_id = be.linked_node_id AND p.level = 'L3'
     WHERE bm.e2e_process_id = @e2eProcessId
       AND be.linked_node_id IS NOT NULL
       AND bm.model_id = (
         SELECT TOP 1 bm2.model_id
         FROM bpmn_model bm2
         WHERE bm2.e2e_process_id = @e2eProcessId
         ORDER BY bm2.is_current DESC, bm2.updated_at DESC, bm2.model_id DESC
       )`,
    { e2eProcessId },
  );
  return rows.map((row) => Number(row.linked_node_id));
};

/** L3를 Call하는 E2E 프로세스 목록 (역참조) */
export const listE2eProcessesByL3NodeId = async (
  nodeId: number,
): Promise<E2eProcess[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT DISTINCT e.*
     FROM e2e_process e
     INNER JOIN bpmn_model bm ON bm.e2e_process_id = e.e2e_process_id
     INNER JOIN bpmn_element be ON be.model_id = bm.model_id
     WHERE bm.is_current = 1
       AND be.linked_node_id = @nodeId
     ORDER BY e.code`,
    { nodeId },
  );
  return rows.map(mapE2eProcess);
};

export const findCurrentBpmnModelIdByE2eProcessId = async (
  e2eProcessId: number,
): Promise<number | null> => {
  const row = await queryOne<{ model_id: number }>(
    `SELECT TOP 1 model_id
     FROM bpmn_model
     WHERE e2e_process_id = @e2eProcessId
     ORDER BY is_current DESC, updated_at DESC, model_id DESC`,
    { e2eProcessId },
  );
  return row?.model_id ?? null;
};
