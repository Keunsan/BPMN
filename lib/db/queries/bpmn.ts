import "server-only";

import type {
  BpmnElement,
  BpmnElementLinkDto,
  BpmnElementType,
  BpmnFilters,
  BpmnModel,
  BpmnModelKind,
  BpmnModelStatus,
} from "@/types/bpmn";

import { query, queryOne, transaction } from "../pool";

/** DB snake_case → BpmnModel */
const mapBpmnModel = (row: Record<string, unknown>): BpmnModel => ({
  modelId: row.model_id as number,
  nodeId: (row.node_id as number | null) ?? null,
  e2eProcessId: (row.e2e_process_id as number | null) ?? null,
  modelKind: (row.model_kind as BpmnModel["modelKind"]) ?? "L3_PROCESS",
  modelName: row.model_name as string,
  version: row.version as string,
  bpmnXml: (row.bpmn_xml as string | null) ?? null,
  svgContent: (row.svg_content as string | null) ?? null,
  thumbnailPath: (row.thumbnail_path as string | null) ?? null,
  status: row.status as BpmnModelStatus,
  isCurrent: Boolean(row.is_current),
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** DB snake_case → BpmnElement */
const mapBpmnElement = (row: Record<string, unknown>): BpmnElement => ({
  elementId: row.element_id as number,
  modelId: row.model_id as number,
  elementType: row.element_type as BpmnElementType,
  elementBpmnId: row.element_bpmn_id as string,
  elementName: (row.element_name as string | null) ?? null,
  linkedNodeId: (row.linked_node_id as number | null) ?? null,
  properties: row.properties
    ? (JSON.parse(row.properties as string) as Record<string, unknown>)
    : null,
  createdAt: new Date(row.created_at as string),
});

/** 노드의 현재(is_current) BPMN 모델을 조회한다 */
export const findCurrentBpmnModelByNodeId = async (
  nodeId: number,
): Promise<BpmnModel | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT TOP 1 *
     FROM bpmn_model
     WHERE node_id = @nodeId AND is_current = 1
     ORDER BY updated_at DESC, model_id DESC`,
    { nodeId },
  );

  if (row) {
    return mapBpmnModel(row);
  }

  const fallback = await queryOne<Record<string, unknown>>(
    `SELECT TOP 1 *
     FROM bpmn_model
     WHERE node_id = @nodeId
     ORDER BY is_current DESC, updated_at DESC, model_id DESC`,
    { nodeId },
  );

  return fallback ? mapBpmnModel(fallback) : null;
};

export const findCurrentBpmnModelByE2eProcessId = async (
  e2eProcessId: number,
): Promise<BpmnModel | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT TOP 1 *
     FROM bpmn_model
     WHERE e2e_process_id = @e2eProcessId AND is_current = 1
     ORDER BY updated_at DESC, model_id DESC`,
    { e2eProcessId },
  );

  if (row) {
    return mapBpmnModel(row);
  }

  const fallback = await queryOne<Record<string, unknown>>(
    `SELECT TOP 1 *
     FROM bpmn_model
     WHERE e2e_process_id = @e2eProcessId
     ORDER BY is_current DESC, updated_at DESC, model_id DESC`,
    { e2eProcessId },
  );

  return fallback ? mapBpmnModel(fallback) : null;
};

export const findBpmnModelById = async (
  modelId: number,
): Promise<BpmnModel | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM bpmn_model WHERE model_id = @modelId`,
    { modelId },
  );
  return row ? mapBpmnModel(row) : null;
};

export const listBpmnModels = async (
  filters: BpmnFilters = {},
): Promise<
  Array<
    BpmnModel & {
      processCode: string | null;
      processName: string | null;
      e2eProcessCode: string | null;
      e2eProcessName: string | null;
    }
  >
> => {
  const conditions: string[] = ["1=1"];
  const params: Record<string, string | number | boolean> = {};

  if (filters.nodeId !== undefined) {
    conditions.push("m.node_id = @nodeId");
    params.nodeId = filters.nodeId;
  }

  if (filters.e2eProcessId !== undefined) {
    conditions.push("m.e2e_process_id = @e2eProcessId");
    params.e2eProcessId = filters.e2eProcessId;
  }

  if (filters.modelKind) {
    conditions.push("m.model_kind = @modelKind");
    params.modelKind = filters.modelKind;
  }

  if (filters.linkedNodeId !== undefined) {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM bpmn_element linked
         WHERE linked.model_id = m.model_id
           AND linked.linked_node_id = @linkedNodeId
       )`,
    );
    params.linkedNodeId = filters.linkedNodeId;
  }

  if (filters.status) {
    conditions.push("m.status = @status");
    params.status = filters.status;
  }

  if (filters.isCurrent !== undefined) {
    conditions.push("m.is_current = @isCurrent");
    params.isCurrent = filters.isCurrent ? 1 : 0;
  }

  if (filters.companyCode) {
    conditions.push("(p.node_id IS NULL OR p.company_code = @companyCode)");
    params.companyCode = filters.companyCode;
  }

  if (filters.businessUnitCode) {
    conditions.push("(p.node_id IS NULL OR p.business_unit_code = @businessUnitCode)");
    params.businessUnitCode = filters.businessUnitCode;
  }

  if (filters.search?.trim()) {
    conditions.push(
      "(m.model_name LIKE @search OR p.name LIKE @search OR p.code LIKE @search OR e.name LIKE @search OR e.code LIKE @search)",
    );
    params.search = `%${filters.search.trim()}%`;
  }

  const orderBy =
    filters.sort === "name"
      ? "m.model_name ASC, m.version DESC"
      : "COALESCE(m.updated_at, m.created_at) DESC";

  const rows = await query<Record<string, unknown>>(
    `SELECT m.*,
            p.code AS process_code,
            p.name AS process_name,
            e.code AS e2e_process_code,
            e.name AS e2e_process_name
     FROM bpmn_model m
     LEFT JOIN process_node p ON p.node_id = m.node_id
     LEFT JOIN e2e_process e ON e.e2e_process_id = m.e2e_process_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}`,
    params,
  );

  return rows.map((row) => ({
    ...mapBpmnModel(row),
    processCode: (row.process_code as string | null) ?? null,
    processName: (row.process_name as string | null) ?? null,
    e2eProcessCode: (row.e2e_process_code as string | null) ?? null,
    e2eProcessName: (row.e2e_process_name as string | null) ?? null,
  }));
};

export const listBpmnVersionsByNode = async (
  nodeId: number,
): Promise<BpmnModel[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM bpmn_model
     WHERE node_id = @nodeId
     ORDER BY created_at DESC`,
    { nodeId },
  );
  return rows.map(mapBpmnModel);
};

export const listBpmnElements = async (
  modelId: number,
): Promise<
  Array<
    BpmnElement & {
      linkedProcessCode: string | null;
      linkedProcessName: string | null;
    }
  >
> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT e.*, p.code AS linked_process_code, p.name AS linked_process_name
     FROM bpmn_element e
     LEFT JOIN process_node p ON p.node_id = e.linked_node_id
     WHERE e.model_id = @modelId
     ORDER BY e.element_id`,
    { modelId },
  );

  return rows.map((row) => ({
    ...mapBpmnElement(row),
    linkedProcessCode: (row.linked_process_code as string | null) ?? null,
    linkedProcessName: (row.linked_process_name as string | null) ?? null,
  }));
};

export const insertBpmnModel = async (input: {
  nodeId?: number | null;
  e2eProcessId?: number | null;
  modelKind?: BpmnModelKind;
  modelName: string;
  version?: string;
  bpmnXml?: string | null;
  svgContent?: string | null;
  status?: BpmnModelStatus;
  isCurrent?: boolean;
  createdBy?: number | null;
}): Promise<number> => {
  const modelKind = input.modelKind ?? "L3_PROCESS";
  const row = await queryOne<{ model_id: number }>(
    `INSERT INTO bpmn_model (
       node_id, e2e_process_id, model_kind, model_name, version, bpmn_xml, svg_content, status, is_current, created_by
     )
     OUTPUT INSERTED.model_id
     VALUES (
       @nodeId, @e2eProcessId, @modelKind, @modelName, @version, @bpmnXml, @svgContent, @status, @isCurrent, @createdBy
     )`,
    {
      nodeId: input.nodeId ?? null,
      e2eProcessId: input.e2eProcessId ?? null,
      modelKind,
      modelName: input.modelName,
      version: input.version ?? "1.0.0",
      bpmnXml: input.bpmnXml ?? null,
      svgContent: input.svgContent ?? null,
      status: input.status ?? "DRAFT",
      isCurrent: input.isCurrent !== false ? 1 : 0,
      createdBy: input.createdBy ?? null,
    },
  );

  if (!row?.model_id) {
    throw new Error("Failed to insert bpmn_model");
  }

  return row.model_id;
};

export const updateBpmnModel = async (
  modelId: number,
  input: {
    modelName?: string;
    bpmnXml?: string | null;
    svgContent?: string | null;
    status?: BpmnModelStatus;
    isCurrent?: boolean;
    updatedBy?: number | null;
  },
): Promise<void> => {
  const sets: string[] = ["updated_at = GETDATE()"];
  const params: Record<string, string | number | boolean | null> = { modelId };

  if (input.modelName !== undefined) {
    sets.push("model_name = @modelName");
    params.modelName = input.modelName;
  }
  if (input.bpmnXml !== undefined) {
    sets.push("bpmn_xml = @bpmnXml");
    params.bpmnXml = input.bpmnXml;
  }
  if (input.svgContent !== undefined) {
    sets.push("svg_content = @svgContent");
    params.svgContent = input.svgContent;
  }
  if (input.status !== undefined) {
    sets.push("status = @status");
    params.status = input.status;
  }
  if (input.isCurrent !== undefined) {
    sets.push("is_current = @isCurrent");
    params.isCurrent = input.isCurrent ? 1 : 0;
  }
  if (input.updatedBy !== undefined) {
    sets.push("updated_by = @updatedBy");
    params.updatedBy = input.updatedBy;
  }

  await queryOne(
    `UPDATE bpmn_model SET ${sets.join(", ")} WHERE model_id = @modelId`,
    params,
  );
};

export const clearCurrentFlagForNode = async (nodeId: number): Promise<void> => {
  await queryOne(
    `UPDATE bpmn_model SET is_current = 0 WHERE node_id = @nodeId AND is_current = 1`,
    { nodeId },
  );
};

export const clearCurrentFlagForE2eProcess = async (
  e2eProcessId: number,
): Promise<void> => {
  await queryOne(
    `UPDATE bpmn_model SET is_current = 0 WHERE e2e_process_id = @e2eProcessId AND is_current = 1`,
    { e2eProcessId },
  );
};

export const deleteBpmnModel = async (modelId: number): Promise<void> => {
  await transaction(async (txRequest) => {
    await txRequest(
      `DELETE FROM bpmn_element WHERE model_id = @modelId`,
      { modelId },
    );
    await txRequest(`DELETE FROM bpmn_model WHERE model_id = @modelId`, {
      modelId,
    });
  });
};

/** 요소 연결 정보 동기화 */
export const syncBpmnElements = async (
  modelId: number,
  elements: BpmnElementLinkDto[],
): Promise<void> => {
  await transaction(async (txRequest) => {
    await insertBpmnElementsWithTx(txRequest, modelId, elements);
  });
};

/** 새 BPMN 버전을 트랜잭션으로 생성한다 — 실패 시 고아 model 방지 */
export const insertBpmnModelVersion = async (
  existingModelId: number,
  input: {
    nodeId?: number | null;
    e2eProcessId?: number | null;
    modelKind?: BpmnModelKind;
    modelName: string;
    version: string;
    bpmnXml: string | null;
    svgContent: string | null;
    status: BpmnModelStatus;
    createdBy: number | null;
    elements: BpmnElementLinkDto[];
  },
): Promise<number> => {
  const modelKind = input.modelKind ?? "L3_PROCESS";
  return transaction(async (txRequest) => {
    if (input.nodeId != null) {
      await txRequest(
        `UPDATE bpmn_model SET is_current = 0 WHERE node_id = @nodeId AND is_current = 1`,
        { nodeId: input.nodeId },
      );
    } else if (input.e2eProcessId != null) {
      await txRequest(
        `UPDATE bpmn_model SET is_current = 0 WHERE e2e_process_id = @e2eProcessId AND is_current = 1`,
        { e2eProcessId: input.e2eProcessId },
      );
    }

    const insertResult = await txRequest(
      `INSERT INTO bpmn_model (
         node_id, e2e_process_id, model_kind, model_name, version, bpmn_xml, svg_content, status, is_current, created_by
       )
       OUTPUT INSERTED.model_id AS model_id
       VALUES (
         @nodeId, @e2eProcessId, @modelKind, @modelName, @version, @bpmnXml, @svgContent, @status, 1, @createdBy
       )`,
      {
        nodeId: input.nodeId ?? null,
        e2eProcessId: input.e2eProcessId ?? null,
        modelKind,
        modelName: input.modelName,
        version: input.version,
        bpmnXml: input.bpmnXml,
        svgContent: input.svgContent,
        status: input.status,
        createdBy: input.createdBy,
      },
    );

    const newModelId = (
      insertResult.recordset as { model_id: number }[] | undefined
    )?.[0]?.model_id;

    if (!newModelId) {
      throw new Error("Failed to insert bpmn_model version");
    }

    if (input.elements.length > 0) {
      await insertBpmnElementsWithTx(txRequest, newModelId, input.elements);
    }

    await txRequest(`UPDATE bpmn_model SET is_current = 0 WHERE model_id = @modelId`, {
      modelId: existingModelId,
    });

    return newModelId;
  });
};

const insertBpmnElementsWithTx = async (
  txRequest: (
    queryText: string,
    params?: Record<string, string | number | boolean | Date | null | undefined>,
  ) => Promise<unknown>,
  modelId: number,
  elements: BpmnElementLinkDto[],
): Promise<void> => {
  await txRequest(`DELETE FROM bpmn_element WHERE model_id = @modelId`, {
    modelId,
  });

  for (const el of elements) {
    await txRequest(
      `INSERT INTO bpmn_element (
         model_id, element_type, element_bpmn_id, element_name, linked_node_id, properties
       ) VALUES (
         @modelId, @elementType, @elementBpmnId, @elementName, @linkedNodeId, @properties
       )`,
      {
        modelId,
        elementType: el.elementType,
        elementBpmnId: el.elementBpmnId,
        elementName: el.elementName ?? null,
        linkedNodeId: el.linkedNodeId ?? null,
        properties: el.properties ? JSON.stringify(el.properties) : null,
      },
    );
  }
};

/** 단일 BPMN 요소와 프로세스 노드 연결을 저장한다. */
export const upsertBpmnElementLink = async (
  modelId: number,
  element: BpmnElementLinkDto,
): Promise<void> => {
  await queryOne(
    `MERGE bpmn_element AS target
     USING (
       SELECT @modelId AS model_id, @elementBpmnId AS element_bpmn_id
     ) AS source
     ON target.model_id = source.model_id
       AND target.element_bpmn_id = source.element_bpmn_id
     WHEN MATCHED THEN
       UPDATE SET
         element_type = @elementType,
         element_name = @elementName,
         linked_node_id = @linkedNodeId,
         properties = @properties
     WHEN NOT MATCHED THEN
       INSERT (
         model_id, element_type, element_bpmn_id, element_name,
         linked_node_id, properties
       )
       VALUES (
         @modelId, @elementType, @elementBpmnId, @elementName,
         @linkedNodeId, @properties
       );`,
    {
      modelId,
      elementBpmnId: element.elementBpmnId,
      elementType: element.elementType,
      elementName: element.elementName ?? null,
      linkedNodeId: element.linkedNodeId ?? null,
      properties: element.properties ? JSON.stringify(element.properties) : null,
    },
  );
};
