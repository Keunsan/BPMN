import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type {
  CreateProcessInput,
  ProcessDeleteBpmnModelImpact,
  ProcessDeleteBpmnTaskLink,
  ProcessDeleteDescendantProcess,
  ProcessDeleteImpact,
  ProcessDeleteImpactCount,
  ProcessDeleteImpactKind,
  ProcessFilters,
  ProcessI18nMap,
  ProcessNode,
  ProcessNodeTree,
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
  companyCode: (row.company_code as string | null) ?? null,
  businessUnitCode: (row.business_unit_code as string | null) ?? null,
  sortOrder: (row.sort_order as number) ?? 0,
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

const IN_CLAUSE_BATCH_SIZE = 500;

/** IN 절 placeholder·파라미터를 만든다 */
const buildInClauseParams = (
  values: number[],
  prefix: string,
): { placeholders: string; params: QueryParams } => {
  const params: QueryParams = {};
  const placeholders = values
    .map((value, index) => {
      const key = `${prefix}${index}`;
      params[key] = value;
      return `@${key}`;
    })
    .join(", ");
  return { placeholders, params };
};

/** i18n 행 목록을 nodeId별 맵으로 변환한다 */
const mapProcessI18nRows = (
  rows: Array<{
    node_id: number;
    locale: string;
    name: string;
    description: string | null;
  }>,
): Map<number, ProcessI18nMap> => {
  const result = new Map<number, ProcessI18nMap>();
  for (const row of rows) {
    const locale = row.locale as keyof ProcessI18nMap;
    const map = result.get(row.node_id) ?? {};
    map[locale] = { name: row.name, description: row.description };
    result.set(row.node_id, map);
  }
  return result;
};

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

/** 여러 노드의 i18n 맵을 한 번에 조회한다 */
export const findProcessI18nByNodeIds = async (
  nodeIds: number[],
): Promise<Map<number, ProcessI18nMap>> => {
  const uniqueIds = [...new Set(nodeIds)];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const result = new Map<number, ProcessI18nMap>();
  for (let offset = 0; offset < uniqueIds.length; offset += IN_CLAUSE_BATCH_SIZE) {
    const batch = uniqueIds.slice(offset, offset + IN_CLAUSE_BATCH_SIZE);
    const { placeholders, params } = buildInClauseParams(batch, "nodeId");
    const rows = await query<{
      node_id: number;
      locale: string;
      name: string;
      description: string | null;
    }>(
      `SELECT node_id, locale, name, description
       FROM process_node_i18n
       WHERE node_id IN (${placeholders})`,
      params,
    );

    for (const [nodeId, i18n] of mapProcessI18nRows(rows)) {
      result.set(nodeId, i18n);
    }
  }

  return result;
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

/** 노드 존재 여부만 조회한다 */
export const processNodeExists = async (nodeId: number): Promise<boolean> => {
  const row = await queryOne<{ node_id: number }>(
    `SELECT node_id FROM process_node WHERE node_id = @nodeId`,
    { nodeId },
  );
  return row != null;
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

/** 변형 코드 생성 */
export const generateVariantCode = (
  standardCode: string,
  companyCode: string,
  businessUnitCode: string,
): string => `${standardCode}-V-${companyCode}-${businessUnitCode}`;

/** 동일 표준·scope 변형 존재 여부 */
export const existsVariantScope = async (
  standardNodeId: number,
  companyCode: string,
  businessUnitCode: string,
): Promise<boolean> => {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM process_node
     WHERE variant_of = @standardNodeId
       AND company_code = @companyCode
       AND business_unit_code = @businessUnitCode`,
    { standardNodeId, companyCode, businessUnitCode },
  );
  return (row?.cnt ?? 0) > 0;
};

/** 표준 노드의 scope 변형 조회 */
export const findVariantByScope = async (
  standardNodeId: number,
  companyCode: string,
  businessUnitCode: string,
): Promise<ProcessNode | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM process_node
     WHERE variant_of = @standardNodeId
       AND company_code = @companyCode
       AND business_unit_code = @businessUnitCode`,
    { standardNodeId, companyCode, businessUnitCode },
  );
  return row ? mapProcessNode(row) : null;
};

/** 표준 노드에 연결된 변형 목록 — locale 표시명을 단일 쿼리로 조회한다 */
export const findVariantsByStandardId = async (
  standardNodeId: number,
  locale: Locale = "ko",
): Promise<ProcessNode[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       pn.node_id,
       pn.parent_node_id,
       pn.level,
       pn.code,
       COALESCE(i18n_loc.name, i18n_ko.name, pn.name) AS name,
       pn.description,
       pn.status,
       pn.owner_org_id,
       pn.version,
       pn.valid_from,
       pn.valid_to,
       pn.is_standard,
       pn.variant_of,
       pn.company_code,
       pn.business_unit_code,
       pn.sort_order,
       pn.created_by,
       pn.created_at,
       pn.updated_by,
       pn.updated_at
     FROM process_node pn
     LEFT JOIN process_node_i18n i18n_loc
       ON i18n_loc.node_id = pn.node_id
      AND i18n_loc.locale = @locale
     LEFT JOIN process_node_i18n i18n_ko
       ON i18n_ko.node_id = pn.node_id
      AND i18n_ko.locale = @koLocale
     WHERE pn.variant_of = @standardNodeId
     ORDER BY pn.company_code, pn.business_unit_code, pn.code`,
    { standardNodeId, locale, koLocale: "ko" },
  );
  return rows.map(mapProcessNode);
};

/** 표준 노드별 변형 개수 */
export const countVariantsByStandardIds = async (
  standardNodeIds: number[],
): Promise<Map<number, number>> => {
  const counts = new Map<number, number>();
  const uniqueIds = [...new Set(standardNodeIds)];
  if (uniqueIds.length === 0) {
    return counts;
  }

  for (let offset = 0; offset < uniqueIds.length; offset += IN_CLAUSE_BATCH_SIZE) {
    const batch = uniqueIds.slice(offset, offset + IN_CLAUSE_BATCH_SIZE);
    const { placeholders, params } = buildInClauseParams(batch, "standardId");
    const rows = await query<{ variant_of: number; cnt: number }>(
      `SELECT variant_of, COUNT(*) AS cnt
       FROM process_node
       WHERE variant_of IN (${placeholders})
       GROUP BY variant_of`,
      params,
    );

    for (const row of rows) {
      counts.set(row.variant_of, row.cnt);
    }
  }

  return counts;
};

/** 표준 노드에 연결된 변형 개수 */
export const countVariantsForStandard = async (
  standardNodeId: number,
): Promise<number> => {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM process_node WHERE variant_of = @standardNodeId`,
    { standardNodeId },
  );
  return row?.cnt ?? 0;
};

/** 하위 프로세스 전체(모든 깊이)를 조회한다 */
export const listDescendantProcesses = async (
  nodeId: number,
): Promise<ProcessDeleteDescendantProcess[]> => {
  const rows = await query<Record<string, unknown>>(
    `WITH descendants AS (
       SELECT
         node_id,
         code,
         name,
         level,
         1 AS depth
       FROM process_node
       WHERE parent_node_id = @nodeId
       UNION ALL
       SELECT
         pn.node_id,
         pn.code,
         pn.name,
         pn.level,
         d.depth + 1
       FROM process_node pn
       INNER JOIN descendants d ON pn.parent_node_id = d.node_id
     )
     SELECT node_id AS nodeId, code, name, level, depth
     FROM descendants
     ORDER BY depth DESC, code`,
    { nodeId },
  );

  return rows.map((row) => ({
    nodeId: row.nodeId as number,
    code: row.code as string,
    name: row.name as string,
    level: row.level as ProcessDeleteDescendantProcess["level"],
    depth: row.depth as number,
  }));
};

/** 직계 자식 프로세스 노드를 조회한다 */
export const listChildProcesses = async (
  parentNodeId: number,
): Promise<ProcessNode[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT *
     FROM process_node
     WHERE parent_node_id = @parentNodeId
     ORDER BY sort_order, code`,
    { parentNodeId },
  );
  return rows.map(mapProcessNode);
};

export const countChildProcesses = async (nodeId: number): Promise<number> => {
  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt
     FROM process_node
     WHERE parent_node_id = @nodeId`,
    { nodeId },
  );
  return row?.cnt ?? 0;
};

const deleteImpactCountQueries: Array<{
  kind: ProcessDeleteImpactKind;
  sql: string;
}> = [
  {
    kind: "taskAttribute",
    sql: "SELECT COUNT(*) AS cnt FROM task_attribute WHERE node_id = @nodeId",
  },
  {
    kind: "taskPredecessor",
    sql: `SELECT COUNT(*) AS cnt
          FROM task_predecessor
          WHERE node_id = @nodeId OR predecessor_node_id = @nodeId`,
  },
  {
    kind: "taskRoleMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_role_mapping WHERE node_id = @nodeId",
  },
  {
    kind: "taskSystemMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_system_link WHERE node_id = @nodeId",
  },
  {
    kind: "taskInterfaceMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_interface_mapping WHERE node_id = @nodeId",
  },
  {
    kind: "taskDataTableLink",
    sql: "SELECT COUNT(*) AS cnt FROM task_data_table_link WHERE node_id = @nodeId",
  },
  {
    kind: "taskKpiMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_kpi_mapping WHERE node_id = @nodeId",
  },
  {
    kind: "taskRiskMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_risk_mapping WHERE node_id = @nodeId",
  },
  {
    kind: "taskControlMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_control_mapping WHERE node_id = @nodeId",
  },
  {
    kind: "taskDocumentMapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_document_mapping WHERE node_id = @nodeId",
  },
];

/** 프로세스 삭제 시 함께 정리해야 할 참조 데이터를 조회한다. */
export const getProcessDeleteImpact = async (
  nodeId: number,
): Promise<ProcessDeleteImpact> => {
  const current = await findProcessById(nodeId);
  if (!current) {
    throw new Error("Process not found");
  }

  const childProcessCount = await countChildProcesses(nodeId);
  const descendantProcesses = await listDescendantProcesses(nodeId);
  const variantCount =
    current.variantOf == null
      ? await countVariantsForStandard(nodeId)
      : 0;
  const blockedByVariants = current.variantOf == null && variantCount > 0;
  const blockedByChildren =
    (current.level === "L1" || current.level === "L2") &&
    descendantProcesses.length > 0;
  const cascadeChildProcesses =
    current.level === "L3"
      ? descendantProcesses.filter(
          (item) => item.depth === 1 && item.level === "L4",
        )
      : [];
  const bpmnTaskLinkRows = await query<Record<string, unknown>>(
    `SELECT
       be.element_id AS elementId,
       be.element_bpmn_id AS elementBpmnId,
       be.element_name AS elementName,
       be.element_type AS elementType,
       bm.model_id AS modelId,
       bm.model_name AS modelName,
       COALESCE(owner.code, e2e.code, 'E2E') AS modelProcessCode,
       COALESCE(owner.name, e2e.name, bm.model_name) AS modelProcessName
     FROM bpmn_element be
     INNER JOIN bpmn_model bm ON bm.model_id = be.model_id
     LEFT JOIN process_node owner
       ON owner.node_id = bm.node_id AND bm.model_kind = 'L3_PROCESS'
     LEFT JOIN e2e_process e2e
       ON e2e.e2e_process_id = bm.e2e_process_id AND bm.model_kind = 'E2E'
     WHERE be.linked_node_id = @nodeId
     ORDER BY bm.model_name, be.element_id`,
    { nodeId },
  );
  const ownedBpmnModelRows = await query<Record<string, unknown>>(
    `SELECT
       bm.model_id AS modelId,
       bm.model_name AS modelName,
       bm.version,
       bm.status,
       COUNT(be.element_id) AS elementCount
     FROM bpmn_model bm
     LEFT JOIN bpmn_element be ON be.model_id = bm.model_id
     WHERE bm.node_id = @nodeId
     GROUP BY bm.model_id, bm.model_name, bm.version, bm.status
     ORDER BY bm.model_name, bm.version DESC`,
    { nodeId },
  );
  const bpmnTaskLinks: ProcessDeleteBpmnTaskLink[] = bpmnTaskLinkRows.map(
    (row) => ({
      elementId: row.elementId as number,
      elementBpmnId: row.elementBpmnId as string,
      elementName: (row.elementName as string | null) ?? null,
      elementType: row.elementType as string,
      modelId: row.modelId as number,
      modelName: row.modelName as string,
      modelProcessCode: row.modelProcessCode as string,
      modelProcessName: row.modelProcessName as string,
    }),
  );
  const ownedBpmnModels: ProcessDeleteBpmnModelImpact[] = ownedBpmnModelRows.map(
    (row) => ({
      modelId: row.modelId as number,
      modelName: row.modelName as string,
      version: row.version as string,
      status: row.status as string,
      elementCount: row.elementCount as number,
    }),
  );

  const metadataCounts: ProcessDeleteImpactCount[] = [];
  for (const item of deleteImpactCountQueries) {
    const row = await queryOne<{ cnt: number }>(item.sql, { nodeId });
    if ((row?.cnt ?? 0) > 0) {
      metadataCounts.push({ kind: item.kind, count: row?.cnt ?? 0 });
    }
  }

  const hasLinkedData =
    bpmnTaskLinks.length > 0 ||
    ownedBpmnModels.length > 0 ||
    metadataCounts.length > 0;
  const hasDependencies =
    hasLinkedData ||
    (current.level === "L3" && cascadeChildProcesses.length > 0);

  return {
    nodeId,
    level: current.level,
    childProcessCount,
    variantCount,
    blockedByChildren,
    blockedByVariants,
    descendantProcesses,
    cascadeChildProcesses,
    bpmnTaskLinks,
    ownedBpmnModels,
    metadataCounts,
    hasDependencies,
    canCascadeDelete: !blockedByChildren && !blockedByVariants,
  };
};

/** 형제 코드 접미 순번의 최댓값을 구한다 — COUNT+1 방식은 삭제 후 중복을 유발한다 */
const maxSiblingCodeSeq = (codes: string[], prefix: string): number => {
  let maxSeq = 0;
  for (const code of codes) {
    if (!code.startsWith(prefix)) {
      continue;
    }
    const suffix = code.slice(prefix.length);
    const match = /^(\d+)$/.exec(suffix);
    if (match) {
      maxSeq = Math.max(maxSeq, Number.parseInt(match[1], 10));
    }
  }
  return maxSeq;
};

/** 상위코드 + 순번 자동 생성 — 기존 코드 최대 순번 기준, 충돌 시 증가 */
export const generateProcessCode = async (
  parentNodeId: number | null,
): Promise<string> => {
  if (!parentNodeId) {
    const rows = await query<{ code: string }>(
      `SELECT code
       FROM process_node
       WHERE parent_node_id IS NULL AND variant_of IS NULL`,
    );
    const maxSeq = maxSiblingCodeSeq(
      rows.map((row) => row.code),
      "STP-",
    );
    let seq = maxSeq + 1;
    let code = `STP-${String(seq).padStart(2, "0")}`;
    while (await findProcessByCode(code)) {
      seq += 1;
      code = `STP-${String(seq).padStart(2, "0")}`;
    }
    return code;
  }

  const parent = await findProcessById(parentNodeId);
  if (!parent) {
    throw new Error("Parent not found");
  }

  const rows = await query<{ code: string }>(
    `SELECT code FROM process_node WHERE parent_node_id = @parentNodeId`,
    { parentNodeId },
  );
  const prefix = `${parent.code}-`;
  let seq = maxSiblingCodeSeq(
    rows.map((row) => row.code),
    prefix,
  ) + 1;
  let code = `${prefix}${String(seq).padStart(2, "0")}`;
  while (await findProcessByCode(code)) {
    seq += 1;
    code = `${prefix}${String(seq).padStart(2, "0")}`;
  }
  return code;
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
      variant_of, company_code, business_unit_code,
      sort_order, created_by
    )
    OUTPUT INSERTED.*
    VALUES (
      @parentNodeId, @level, @code, @name, @description, @status,
      @ownerOrgId, @version, @validFrom, @validTo, @isStandard,
      @variantOf, @companyCode, @businessUnitCode,
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
      variantOf: input.variantOf ?? null,
      companyCode: input.companyCode ?? null,
      businessUnitCode: input.businessUnitCode ?? null,
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

/** 프로세스와 연결 데이터를 DB에서 완전히 삭제한다 */
export const deleteProcess = async (
  nodeId: number,
): Promise<boolean> => {
  return transaction(async (txRequest) => {
    await txRequest(
      `DELETE FROM approval_history
       WHERE request_id IN (
         SELECT request_id
         FROM approval_request
         WHERE entity_type = 'PROCESS_NODE' AND entity_id = @nodeId
       )`,
      { nodeId },
    );
    await txRequest(
      `DELETE FROM approval_request
       WHERE entity_type = 'PROCESS_NODE' AND entity_id = @nodeId`,
      { nodeId },
    );
    await txRequest(`DELETE FROM bpmn_element WHERE linked_node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(
      `DELETE be
       FROM bpmn_element be
       INNER JOIN bpmn_model bm ON bm.model_id = be.model_id
       WHERE bm.node_id = @nodeId`,
      { nodeId },
    );
    await txRequest(`DELETE FROM bpmn_model WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(
      `DELETE FROM task_attribute_i18n
       WHERE attr_id IN (
         SELECT attr_id FROM task_attribute WHERE node_id = @nodeId
       )`,
      { nodeId },
    );
    await txRequest(
      `DELETE FROM task_predecessor
       WHERE node_id = @nodeId OR predecessor_node_id = @nodeId`,
      { nodeId },
    );
    await txRequest(`DELETE FROM task_role_mapping WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(`DELETE FROM task_system_link WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(
      `DELETE FROM task_interface_mapping WHERE node_id = @nodeId`,
      { nodeId },
    );
    await txRequest(
      `DELETE FROM task_data_table_link WHERE node_id = @nodeId`,
      { nodeId },
    );
    await txRequest(`DELETE FROM task_kpi_mapping WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(`DELETE FROM task_risk_mapping WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(`DELETE FROM task_control_mapping WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(
      `DELETE FROM task_document_mapping WHERE node_id = @nodeId`,
      { nodeId },
    );
    await txRequest(`DELETE FROM task_attribute WHERE node_id = @nodeId`, {
      nodeId,
    });

    await txRequest(`DELETE FROM process_node_i18n WHERE node_id = @nodeId`, {
      nodeId,
    });
    await txRequest(`DELETE FROM process_node_history WHERE node_id = @nodeId`, {
      nodeId,
    });

    const result = await txRequest(
      `DELETE FROM process_node OUTPUT DELETED.node_id WHERE node_id = @nodeId`,
      { nodeId },
    );
    const deletedRows = result.recordset as Array<{ node_id: number }> | undefined;
    return Boolean(deletedRows?.[0]);
  });
};

/** process_node 필터 조건을 만든다 */
const buildProcessNodeFilterClause = (
  filters: ProcessFilters,
  tableAlias = "",
  options?: { searchI18n?: boolean },
): { conditions: string[]; params: QueryParams } => {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  const conditions = ["1=1"];
  const params: QueryParams = {};

  if (!filters.includeVariants) {
    conditions.push(`${prefix}variant_of IS NULL`);
  }
  if (filters.companyCode) {
    conditions.push(`${prefix}company_code = @companyCode`);
    params.companyCode = filters.companyCode;
  }
  if (filters.businessUnitCode) {
    conditions.push(`${prefix}business_unit_code = @businessUnitCode`);
    params.businessUnitCode = filters.businessUnitCode;
  }
  if (filters.level) {
    conditions.push(`${prefix}level = @level`);
    params.level = filters.level;
  }
  if (filters.status) {
    conditions.push(`${prefix}status = @status`);
    params.status = filters.status;
  }
  if (filters.parentNodeId !== undefined) {
    if (filters.parentNodeId === null) {
      conditions.push(`${prefix}parent_node_id IS NULL`);
    } else {
      conditions.push(`${prefix}parent_node_id = @parentNodeId`);
      params.parentNodeId = filters.parentNodeId;
    }
  }
  if (filters.search?.trim()) {
    const searchExpr = options?.searchI18n
      ? `(${prefix}code LIKE @search OR ${prefix}name LIKE @search OR i18n_loc.name LIKE @search OR i18n_ko.name LIKE @search)`
      : `(code LIKE @search OR ${prefix}name LIKE @search)`;
    conditions.push(searchExpr);
    params.search = `%${filters.search.trim()}%`;
  }

  return { conditions, params };
};

/** DB 행을 트리용 노드로 변환한다 */
const mapProcessTreeNode = (row: Record<string, unknown>): ProcessNodeTree => {
  const variantCount = row.variant_count;
  return {
    ...mapProcessNode(row),
    variantCount:
      variantCount == null ? undefined : Number(variantCount as number),
  };
};

export const listProcessNodes = async (
  filters: ProcessFilters = {},
): Promise<ProcessNode[]> => {
  const { conditions, params } = buildProcessNodeFilterClause(filters);

  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM process_node
     WHERE ${conditions.join(" AND ")}
     ORDER BY sort_order, code`,
    params,
  );
  return rows.map(mapProcessNode);
};

/** 트리 조회용 노드 목록 — locale 표시명·변형 개수를 단일 쿼리로 조회한다 */
export const listProcessNodesForTree = async (
  locale: Locale,
  filters: ProcessFilters & { withVariantCounts?: boolean } = {},
): Promise<ProcessNodeTree[]> => {
  const withVariantCounts = filters.withVariantCounts ?? !filters.includeVariants;
  const { conditions, params } = buildProcessNodeFilterClause(filters, "pn", {
    searchI18n: true,
  });
  params.locale = locale;
  params.koLocale = "ko";

  const variantCountSelect = withVariantCounts
    ? `CASE
         WHEN pn.level IN ('L3', 'L4') THEN COALESCE(vc.cnt, 0)
         ELSE NULL
       END AS variant_count`
    : "NULL AS variant_count";
  const variantCountJoin = withVariantCounts
    ? `LEFT JOIN (
         SELECT variant_of, COUNT(*) AS cnt
         FROM process_node
         WHERE variant_of IS NOT NULL
         GROUP BY variant_of
       ) vc ON vc.variant_of = pn.node_id`
    : "";

  const rows = await query<Record<string, unknown>>(
    `SELECT
       pn.node_id,
       pn.parent_node_id,
       pn.level,
       pn.code,
       COALESCE(i18n_loc.name, i18n_ko.name, pn.name) AS name,
       pn.description,
       pn.status,
       pn.owner_org_id,
       pn.version,
       pn.valid_from,
       pn.valid_to,
       pn.is_standard,
       pn.variant_of,
       pn.company_code,
       pn.business_unit_code,
       pn.sort_order,
       pn.created_by,
       pn.created_at,
       pn.updated_by,
       pn.updated_at,
       ${variantCountSelect}
     FROM process_node pn
     LEFT JOIN process_node_i18n i18n_loc
       ON i18n_loc.node_id = pn.node_id
      AND i18n_loc.locale = @locale
     LEFT JOIN process_node_i18n i18n_ko
       ON i18n_ko.node_id = pn.node_id
      AND i18n_ko.locale = @koLocale
     ${variantCountJoin}
     WHERE ${conditions.join(" AND ")}
     ORDER BY pn.sort_order, pn.code`,
    params,
  );

  return rows.map(mapProcessTreeNode);
};

/** scope에 해당하는 변형 노드 목록 */
export const listVariantsByScope = async (
  companyCode: string,
  businessUnitCode: string,
  search?: string,
  locale: Locale = "ko",
): Promise<ProcessNodeTree[]> => {
  return listProcessNodesForTree(locale, {
    includeVariants: true,
    companyCode,
    businessUnitCode,
    search,
    withVariantCounts: false,
  });
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
