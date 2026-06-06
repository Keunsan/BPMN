import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type {
  CreateProcessInput,
  ProcessI18nMap,
  ProcessNode,
  UpdateProcessInput,
} from "@/types/process";

import { query, queryOne, transaction, type QueryParams } from "../pool";

/** DB snake_case → ProcessNode */
const mapProcessNode = (row: Record<string, unknown>): ProcessNode => ({
  nodeId: row.node_id as number,
  parentNodeId: (row.parent_node_id as number | null) ?? null,
  level: row.level as ProcessNode["level"],
  code: row.code as string,
  name: row.name as string,
  description: (row.description as string | null) ?? null,
  status: row.status as ProcessNode["status"],
  ownerOrgId: (row.owner_org_id as number | null) ?? null,
  version: (row.version as string | null) ?? null,
  validFrom: row.valid_from ? new Date(row.valid_from as string) : null,
  validTo: row.valid_to ? new Date(row.valid_to as string) : null,
  isStandard: Boolean(row.is_standard),
  variantOf: (row.variant_of as number | null) ?? null,
  sortOrder: (row.sort_order as number) ?? 0,
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** i18n 맵 조회 */
export const findProcessI18n = async (
  nodeId: number,
): Promise<ProcessI18nMap> => {
  const rows = await query<{ locale: string; name: string; description: string | null }>(
    `SELECT locale, name, description FROM process_node_i18n WHERE node_id = @nodeId`,
    { nodeId },
  );

  const map: ProcessI18nMap = {};
  for (const row of rows) {
    const locale = row.locale as keyof ProcessI18nMap;
    map[locale] = { name: row.name, description: row.description };
  }
  return map;
};

/** locale 적용된 display name */
export const resolveDisplayName = (
  node: ProcessNode,
  i18n: ProcessI18nMap,
  locale: Locale,
): string => {
  return i18n[locale]?.name ?? i18n.ko?.name ?? node.name;
};

export const findProcessById = async (
  nodeId: number,
): Promise<ProcessNode | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM process_node WHERE node_id = @nodeId`,
    { nodeId },
  );
  return row ? mapProcessNode(row) : null;
};

export const findProcessByCode = async (
  code: string,
): Promise<ProcessNode | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM process_node WHERE code = @code`,
    { code },
  );
  return row ? mapProcessNode(row) : null;
};

export const countChildProcesses = async (nodeId: number): Promise<number> => {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM process_node WHERE parent_node_id = @nodeId`,
    { nodeId },
  );
  return row?.cnt ?? 0;
};

/** 상위코드 + 순번 자동 생성 */
export const generateProcessCode = async (
  parentNodeId: number | null,
): Promise<string> => {
  if (!parentNodeId) {
    const row = await queryOne<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM process_node WHERE parent_node_id IS NULL`,
    );
    const seq = String((row?.cnt ?? 0) + 1).padStart(2, "0");
    return `STP-${seq}`;
  }

  const parent = await findProcessById(parentNodeId);
  if (!parent) {
    throw new Error("Parent not found");
  }

  const siblingCount = await countChildProcesses(parentNodeId);
  const seq = String(siblingCount + 1).padStart(2, "0");
  return `${parent.code}-${seq}`;
};

/** i18n upsert */
export const upsertProcessI18n = async (
  nodeId: number,
  i18n: ProcessI18nMap,
): Promise<void> => {
  for (const [locale, value] of Object.entries(i18n)) {
    if (!value?.name) continue;

    await queryOne(
      `MERGE process_node_i18n AS target
       USING (SELECT @nodeId AS node_id, @locale AS locale) AS source
       ON target.node_id = source.node_id AND target.locale = source.locale
       WHEN MATCHED THEN
         UPDATE SET name = @name, description = @description
       WHEN NOT MATCHED THEN
         INSERT (node_id, locale, name, description)
         VALUES (@nodeId, @locale, @name, @description);`,
      {
        nodeId,
        locale,
        name: value.name,
        description: value.description ?? null,
      },
    );
  }
};

export const createProcess = async (
  input: CreateProcessInput,
): Promise<ProcessNode> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO process_node (
      parent_node_id, level, code, name, description, status,
      owner_org_id, version, valid_from, valid_to, is_standard,
      sort_order, created_by
    )
    OUTPUT INSERTED.*
    VALUES (
      @parentNodeId, @level, @code, @name, @description, @status,
      @ownerOrgId, @version, @validFrom, @validTo, @isStandard,
      @sortOrder, @createdBy
    )`,
    {
      parentNodeId: input.parentNodeId,
      level: input.level,
      code: input.code,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "DRAFT",
      ownerOrgId: input.ownerOrgId ?? null,
      version: input.version ?? "1.0.0",
      validFrom: input.validFrom ?? null,
      validTo: input.validTo ?? null,
      isStandard: input.isStandard ?? true,
      sortOrder: input.sortOrder ?? 0,
      createdBy: input.createdBy ?? null,
    },
  );

  if (!row) {
    throw new Error("Failed to create process node");
  }

  return mapProcessNode(row);
};

export const updateProcess = async (
  nodeId: number,
  input: UpdateProcessInput,
): Promise<ProcessNode | null> => {
  const sets: string[] = [];
  const params: QueryParams = { nodeId };

  if (input.name !== undefined) {
    sets.push("name = @name");
    params.name = input.name;
  }
  if (input.description !== undefined) {
    sets.push("description = @description");
    params.description = input.description;
  }
  if (input.status !== undefined) {
    sets.push("status = @status");
    params.status = input.status;
  }
  if (input.ownerOrgId !== undefined) {
    sets.push("owner_org_id = @ownerOrgId");
    params.ownerOrgId = input.ownerOrgId;
  }
  if (input.version !== undefined) {
    sets.push("version = @version");
    params.version = input.version;
  }
  if (input.validFrom !== undefined) {
    sets.push("valid_from = @validFrom");
    params.validFrom = input.validFrom;
  }
  if (input.validTo !== undefined) {
    sets.push("valid_to = @validTo");
    params.validTo = input.validTo;
  }
  if (input.isStandard !== undefined) {
    sets.push("is_standard = @isStandard");
    params.isStandard = input.isStandard;
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = @sortOrder");
    params.sortOrder = input.sortOrder;
  }
  if (input.updatedBy !== undefined) {
    sets.push("updated_by = @updatedBy");
    params.updatedBy = input.updatedBy;
  }

  if (sets.length === 0) {
    return findProcessById(nodeId);
  }

  sets.push("updated_at = GETDATE()");

  const row = await queryOne<Record<string, unknown>>(
    `UPDATE process_node SET ${sets.join(", ")}
     OUTPUT INSERTED.*
     WHERE node_id = @nodeId`,
    params,
  );

  return row ? mapProcessNode(row) : null;
};

export const deleteProcess = async (nodeId: number): Promise<boolean> => {
  await query(`DELETE FROM process_node_i18n WHERE node_id = @nodeId`, { nodeId });
  const result = await queryOne<{ node_id: number }>(
    `DELETE FROM process_node OUTPUT DELETED.node_id WHERE node_id = @nodeId`,
    { nodeId },
  );
  return Boolean(result);
};

export const listProcessNodes = async (
  search?: string,
): Promise<ProcessNode[]> => {
  if (search?.trim()) {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM process_node
       WHERE code LIKE @search OR name LIKE @search
       ORDER BY sort_order, code`,
      { search: `%${search.trim()}%` },
    );
    return rows.map(mapProcessNode);
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM process_node ORDER BY sort_order, code`,
  );
  return rows.map(mapProcessNode);
};

/** 노드 이동 */
export const moveProcess = async (
  nodeId: number,
  parentNodeId: number | null,
  sortOrder?: number,
): Promise<ProcessNode | null> => {
  const params: QueryParams = { nodeId, parentNodeId, sortOrder: sortOrder ?? 0 };
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE process_node
     SET parent_node_id = @parentNodeId, sort_order = @sortOrder, updated_at = GETDATE()
     OUTPUT INSERTED.*
     WHERE node_id = @nodeId`,
    params,
  );
  return row ? mapProcessNode(row) : null;
};

/** 순환 참조 검사 */
export const isCircularReference = async (
  nodeId: number,
  newParentId: number | null,
): Promise<boolean> => {
  if (!newParentId || newParentId === nodeId) {
    return newParentId === nodeId;
  }

  const visited = new Set<number>();
  let current: number | null = newParentId;

  for (let depth = 0; current && depth < 100; depth++) {
    if (current === nodeId) return true;
    if (visited.has(current)) return true;
    visited.add(current);

    const parentRow: { parent_node_id: number | null } | null = await queryOne(
      `SELECT parent_node_id FROM process_node WHERE node_id = @current`,
      { current },
    );
    current = parentRow?.parent_node_id ?? null;
  }

  return false;
};

/** 버전 이력 저장 */
export const insertProcessHistory = async (input: {
  nodeId: number;
  version: string;
  changeType: string;
  changeReason?: string | null;
  snapshotData?: string | null;
  createdBy?: number | null;
}): Promise<void> => {
  await queryOne(
    `INSERT INTO process_node_history
     (node_id, version, change_type, change_reason, snapshot_data, created_by)
     VALUES (@nodeId, @version, @changeType, @changeReason, @snapshotData, @createdBy)`,
    {
      nodeId: input.nodeId,
      version: input.version,
      changeType: input.changeType,
      changeReason: input.changeReason ?? null,
      snapshotData: input.snapshotData ?? null,
      createdBy: input.createdBy ?? null,
    },
  );
};

/** 버전 이력 조회 */
export const listProcessHistory = async (nodeId: number) => {
  return query<Record<string, unknown>>(
    `SELECT * FROM process_node_history
     WHERE node_id = @nodeId
     ORDER BY created_at DESC`,
    { nodeId },
  );
};

/** 승인 대기 중인 요청 존재 여부 */
export const hasPendingApproval = async (
  nodeId: number,
): Promise<boolean> => {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM approval_request
     WHERE entity_type = 'PROCESS_NODE' AND entity_id = @nodeId AND status = 'PENDING'`,
    { nodeId },
  );
  return (row?.cnt ?? 0) > 0;
};

/** 승인 요청 생성 */
export const createApprovalRequest = async (input: {
  entityId: number;
  requestType: string;
  requesterId: number;
  comment?: string | null;
}): Promise<number> => {
  const row = await queryOne<{ request_id: number }>(
    `INSERT INTO approval_request
     (entity_type, entity_id, request_type, requester_id, request_comment)
     OUTPUT INSERTED.request_id
     VALUES ('PROCESS_NODE', @entityId, @requestType, @requesterId, @comment)`,
    {
      entityId: input.entityId,
      requestType: input.requestType,
      requesterId: input.requesterId,
      comment: input.comment ?? null,
    },
  );
  return row!.request_id;
};

/** 승인 요청 조회 */
export const findApprovalRequest = async (requestId: number) => {
  return queryOne<Record<string, unknown>>(
    `SELECT * FROM approval_request WHERE request_id = @requestId`,
    { requestId },
  );
};

/** 승인/반려 처리 */
export const processApproval = async (input: {
  requestId: number;
  approverId: number;
  action: "APPROVE" | "REJECT";
  comment?: string | null;
  newStatus: string;
  nodeId: number;
}): Promise<void> => {
  await transaction(async (tx) => {
    await tx(
      `UPDATE approval_request
       SET status = @status, completed_at = GETDATE()
       WHERE request_id = @requestId`,
      {
        requestId: input.requestId,
        status: input.action === "APPROVE" ? "APPROVED" : "REJECTED",
      },
    );

    await tx(
      `INSERT INTO approval_history (request_id, approver_id, action, comment)
       VALUES (@requestId, @approverId, @action, @comment)`,
      {
        requestId: input.requestId,
        approverId: input.approverId,
        action: input.action === "APPROVE" ? "APPROVE" : "REJECT",
        comment: input.comment ?? null,
      },
    );

    if (input.action === "APPROVE") {
      await tx(
        `UPDATE process_node SET status = @newStatus, updated_at = GETDATE()
         WHERE node_id = @nodeId`,
        { nodeId: input.nodeId, newStatus: input.newStatus },
      );
    }
  });
};

/** 승인 대기 목록 */
export const listPendingApprovals = async () => {
  return query<Record<string, unknown>>(
    `SELECT r.*, n.code, n.name, n.level
     FROM approval_request r
     INNER JOIN process_node n ON r.entity_id = n.node_id
     WHERE r.entity_type = 'PROCESS_NODE' AND r.status = 'PENDING'
     ORDER BY r.requested_at DESC`,
  );
};

export { transaction, mapProcessNode };
