import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type {
  TaskAttribute,
  TaskAttributeI18nMap,
  TaskAttributeI18nValue,
  TaskAttributeListFilters,
  TaskAttributeListItem,
  TaskPredecessorDto,
  UpsertTaskAttributeDto,
  UpsertTaskPredecessorDto,
} from "@/types/metadata";
import type { ProcessStatus } from "@/types/process";

import { query, queryOne, transaction, type QueryParams } from "../pool";

/** DB snake_case 행을 TaskAttribute로 변환한다. */
const mapTaskAttribute = (row: Record<string, unknown>): TaskAttribute => ({
  attrId: row.attr_id as number,
  nodeId: row.node_id as number,
  definition: (row.definition as string | null) ?? null,
  purpose: (row.purpose as string | null) ?? null,
  inputDeliverable: (row.input_deliverable as string | null) ?? null,
  inputDataDesc: (row.input_data_desc as string | null) ?? null,
  inputCondition: (row.input_condition as string | null) ?? null,
  outputDeliverable: (row.output_deliverable as string | null) ?? null,
  outputDataDesc: (row.output_data_desc as string | null) ?? null,
  outputCondition: (row.output_condition as string | null) ?? null,
  frequency: (row.frequency as TaskAttribute["frequency"]) ?? null,
  triggerEvent: (row.trigger_event as string | null) ?? null,
  duration: (row.duration as string | null) ?? null,
  issues: (row.issues as string | null) ?? null,
  exceptions: (row.exceptions as string | null) ?? null,
  remarks: (row.remarks as string | null) ?? null,
  version: (row.version as string | null) ?? null,
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** DB snake_case 행을 선행 프로세스 DTO로 변환한다. */
const mapTaskPredecessor = (
  row: Record<string, unknown>,
): TaskPredecessorDto => ({
  predecessorId: row.predecessor_id as number,
  nodeId: row.node_id as number,
  predecessorNodeId: row.predecessor_node_id as number,
  conditionDesc: (row.condition_desc as string | null) ?? null,
  isMandatory: Boolean(row.is_mandatory),
  createdAt: new Date(row.created_at as string),
  predecessorCode: row.predecessor_code as string,
  predecessorName: row.predecessor_name as string,
  predecessorLevel: row.predecessor_level as TaskPredecessorDto["predecessorLevel"],
});

/** Task 속성 i18n 행을 locale 맵으로 변환한다. */
const mapTaskAttributeI18n = (
  rows: Record<string, unknown>[],
): TaskAttributeI18nMap => {
  const map: TaskAttributeI18nMap = {};

  for (const row of rows) {
    const locale = row.locale as keyof TaskAttributeI18nMap;
    map[locale] = {
      definition: (row.definition as string | null) ?? null,
      purpose: (row.purpose as string | null) ?? null,
      inputDeliverable: (row.input_deliverable as string | null) ?? null,
      inputDataDesc: (row.input_data_desc as string | null) ?? null,
      inputCondition: (row.input_condition as string | null) ?? null,
      outputDeliverable: (row.output_deliverable as string | null) ?? null,
      outputDataDesc: (row.output_data_desc as string | null) ?? null,
      outputCondition: (row.output_condition as string | null) ?? null,
      issues: (row.issues as string | null) ?? null,
      exceptions: (row.exceptions as string | null) ?? null,
      remarks: (row.remarks as string | null) ?? null,
    };
  }

  return map;
};

/** Task 속성 목록 행을 DTO로 변환한다. */
const mapTaskAttributeListItem = (
  row: Record<string, unknown>,
): TaskAttributeListItem => ({
  attrId: row.attr_id as number,
  nodeId: row.node_id as number,
  processCode: row.process_code as string,
  processName: row.process_name as string,
  processLevel: row.process_level as TaskAttributeListItem["processLevel"],
  processStatus: row.process_status as ProcessStatus,
  parentCode: (row.parent_code as string | null) ?? null,
  parentName: (row.parent_name as string | null) ?? null,
  definition: (row.definition as string | null) ?? null,
  purpose: (row.purpose as string | null) ?? null,
  inputDeliverable: (row.input_deliverable as string | null) ?? null,
  inputDataDesc: (row.input_data_desc as string | null) ?? null,
  inputCondition: (row.input_condition as string | null) ?? null,
  outputDeliverable: (row.output_deliverable as string | null) ?? null,
  outputDataDesc: (row.output_data_desc as string | null) ?? null,
  outputCondition: (row.output_condition as string | null) ?? null,
  frequency: (row.frequency as TaskAttributeListItem["frequency"]) ?? null,
  triggerEvent: (row.trigger_event as string | null) ?? null,
  duration: (row.duration as string | null) ?? null,
  issues: (row.issues as string | null) ?? null,
  exceptions: (row.exceptions as string | null) ?? null,
  remarks: (row.remarks as string | null) ?? null,
  version: (row.version as string | null) ?? null,
  bpmnModelId: (row.bpmn_model_id as number | null) ?? null,
  bpmnModelName: (row.bpmn_model_name as string | null) ?? null,
  bpmnElementName: (row.bpmn_element_name as string | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** Task 속성 목록을 조회한다. */
export const listTaskAttributes = async (
  locale: Locale,
  filters: TaskAttributeListFilters = {},
): Promise<TaskAttributeListItem[]> => {
  const conditions = ["1=1"];
  const params: QueryParams = { locale };
  const bpmnModelFilterSql = filters.bpmnModelId
    ? "AND bm.model_id = @bpmnModelId"
    : "";
  const bpmnModelCurrentSql = filters.bpmnModelId
    ? "AND (bm.is_current = 1 OR bm.model_id = @bpmnModelId)"
    : "AND bm.is_current = 1";

  if (filters.level) {
    conditions.push("pn.level = @level");
    params.level = filters.level;
  }

  let scopeCte = "";
  let scopeJoin = "";

  if (filters.e2eProcessId) {
    scopeCte = `WITH e2e_roots AS (
         SELECT DISTINCT be.linked_node_id AS node_id
         FROM bpmn_model bm
         INNER JOIN bpmn_element be ON be.model_id = bm.model_id
         WHERE bm.e2e_process_id = @e2eProcessId
           AND bm.is_current = 1
           AND be.linked_node_id IS NOT NULL
       ),
       descendants AS (
         SELECT node_id FROM e2e_roots
         UNION ALL
         SELECT child.node_id
         FROM process_node child
         INNER JOIN descendants parent ON child.parent_node_id = parent.node_id
       )`;
    scopeJoin = "INNER JOIN descendants d ON pn.node_id = d.node_id";
    params.e2eProcessId = filters.e2eProcessId;
  } else if (filters.nodeId) {
    scopeCte = `WITH descendants AS (
         SELECT node_id
         FROM process_node
         WHERE node_id = @nodeId
         UNION ALL
         SELECT child.node_id
         FROM process_node child
         INNER JOIN descendants parent ON child.parent_node_id = parent.node_id
       )`;
    scopeJoin = "INNER JOIN descendants d ON pn.node_id = d.node_id";
    params.nodeId = filters.nodeId;
  }

  // nodeId·e2eProcessId가 있으면 해당 Task 속성은 BPMN 연결 여부와 무관하게 표시한다.
  if (filters.bpmnModelId && !filters.nodeId && !filters.e2eProcessId) {
    conditions.push(
      `EXISTS (
         SELECT 1
         FROM bpmn_element be_filter
         INNER JOIN bpmn_model bm_filter ON be_filter.model_id = bm_filter.model_id
         WHERE be_filter.linked_node_id = pn.node_id
           AND bm_filter.model_id = @bpmnModelId
       )`,
    );
    params.bpmnModelId = filters.bpmnModelId;
  } else if (filters.bpmnModelId) {
    params.bpmnModelId = filters.bpmnModelId;
  }

  if (filters.search?.trim()) {
    conditions.push(
      `(
        pn.code LIKE @search
        OR COALESCE(pni_locale.name, pni_ko.name, pn.name) LIKE @search
        OR COALESCE(tai_locale.definition, tai_ko.definition, ta.definition) LIKE @search
        OR COALESCE(tai_locale.purpose, tai_ko.purpose, ta.purpose) LIKE @search
        OR COALESCE(tai_locale.input_deliverable, tai_ko.input_deliverable, ta.input_deliverable) LIKE @search
        OR COALESCE(tai_locale.input_data_desc, tai_ko.input_data_desc, ta.input_data_desc) LIKE @search
        OR COALESCE(tai_locale.input_condition, tai_ko.input_condition, ta.input_condition) LIKE @search
        OR COALESCE(tai_locale.output_deliverable, tai_ko.output_deliverable, ta.output_deliverable) LIKE @search
        OR COALESCE(tai_locale.output_data_desc, tai_ko.output_data_desc, ta.output_data_desc) LIKE @search
        OR COALESCE(tai_locale.output_condition, tai_ko.output_condition, ta.output_condition) LIKE @search
        OR ta.trigger_event LIKE @search
        OR ta.duration LIKE @search
        OR COALESCE(tai_locale.issues, tai_ko.issues, ta.issues) LIKE @search
        OR COALESCE(tai_locale.exceptions, tai_ko.exceptions, ta.exceptions) LIKE @search
        OR COALESCE(tai_locale.remarks, tai_ko.remarks, ta.remarks) LIKE @search
        OR parent.code LIKE @search
        OR bpmn.model_name LIKE @search
        OR bpmn.element_name LIKE @search
      )`,
    );
    params.search = `%${filters.search.trim()}%`;
  }

  const rows = await query<Record<string, unknown>>(
    `${scopeCte}
     SELECT
       ta.attr_id,
       ta.node_id,
       COALESCE(tai_locale.definition, tai_ko.definition, ta.definition) AS definition,
       COALESCE(tai_locale.purpose, tai_ko.purpose, ta.purpose) AS purpose,
       COALESCE(tai_locale.input_deliverable, tai_ko.input_deliverable, ta.input_deliverable) AS input_deliverable,
       COALESCE(tai_locale.input_data_desc, tai_ko.input_data_desc, ta.input_data_desc) AS input_data_desc,
       COALESCE(tai_locale.input_condition, tai_ko.input_condition, ta.input_condition) AS input_condition,
       COALESCE(tai_locale.output_deliverable, tai_ko.output_deliverable, ta.output_deliverable) AS output_deliverable,
       COALESCE(tai_locale.output_data_desc, tai_ko.output_data_desc, ta.output_data_desc) AS output_data_desc,
       COALESCE(tai_locale.output_condition, tai_ko.output_condition, ta.output_condition) AS output_condition,
       ta.frequency,
       ta.trigger_event,
       ta.duration,
       COALESCE(tai_locale.issues, tai_ko.issues, ta.issues) AS issues,
       COALESCE(tai_locale.exceptions, tai_ko.exceptions, ta.exceptions) AS exceptions,
       COALESCE(tai_locale.remarks, tai_ko.remarks, ta.remarks) AS remarks,
       ta.version,
       ta.updated_at,
       pn.code AS process_code,
       pn.level AS process_level,
       pn.status AS process_status,
       COALESCE(pni_locale.name, pni_ko.name, pn.name) AS process_name,
       parent.code AS parent_code,
       COALESCE(parent_i18n.name, parent_i18n_ko.name, parent.name) AS parent_name,
       bpmn.model_id AS bpmn_model_id,
       bpmn.model_name AS bpmn_model_name,
       bpmn.element_name AS bpmn_element_name
     FROM task_attribute ta
     INNER JOIN process_node pn ON ta.node_id = pn.node_id
     ${scopeJoin}
     LEFT JOIN task_attribute_i18n tai_locale
       ON ta.attr_id = tai_locale.attr_id AND tai_locale.locale = @locale
     LEFT JOIN task_attribute_i18n tai_ko
       ON ta.attr_id = tai_ko.attr_id AND tai_ko.locale = 'ko'
     LEFT JOIN process_node_i18n pni_locale
       ON pn.node_id = pni_locale.node_id AND pni_locale.locale = @locale
     LEFT JOIN process_node_i18n pni_ko
       ON pn.node_id = pni_ko.node_id AND pni_ko.locale = 'ko'
     LEFT JOIN process_node parent ON pn.parent_node_id = parent.node_id
     LEFT JOIN process_node_i18n parent_i18n
       ON parent.node_id = parent_i18n.node_id AND parent_i18n.locale = @locale
     LEFT JOIN process_node_i18n parent_i18n_ko
       ON parent.node_id = parent_i18n_ko.node_id AND parent_i18n_ko.locale = 'ko'
     OUTER APPLY (
       SELECT TOP 1
         bm.model_id,
         bm.model_name,
         be.element_name
       FROM bpmn_element be
       INNER JOIN bpmn_model bm ON be.model_id = bm.model_id ${bpmnModelCurrentSql}
       WHERE be.linked_node_id = pn.node_id
        ${bpmnModelFilterSql}
       ORDER BY bm.is_current DESC, bm.updated_at DESC, bm.model_id DESC
     ) bpmn
     WHERE ${conditions.join(" AND ")}
     ORDER BY COALESCE(ta.updated_at, ta.created_at) DESC, pn.code`,
    params,
  );

  return rows.map(mapTaskAttributeListItem);
};

/** Task 속성을 노드 ID로 조회한다. */
export const findTaskAttributeByNodeId = async (
  nodeId: number,
): Promise<TaskAttribute | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM task_attribute WHERE node_id = @nodeId`,
    { nodeId },
  );

  return row ? mapTaskAttribute(row) : null;
};

/** Task 속성 i18n 맵을 조회한다. */
export const findTaskAttributeI18n = async (
  attrId: number,
): Promise<TaskAttributeI18nMap> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT *
     FROM task_attribute_i18n
     WHERE attr_id = @attrId`,
    { attrId },
  );

  return mapTaskAttributeI18n(rows);
};

/** Task 속성을 생성하거나 수정한다. */
export const upsertTaskAttribute = async (
  input: UpsertTaskAttributeDto & {
    createdBy?: number | null;
    updatedBy?: number | null;
  },
): Promise<TaskAttribute> => {
  const row = await queryOne<Record<string, unknown>>(
    `MERGE task_attribute AS target
     USING (SELECT @nodeId AS node_id) AS source
     ON target.node_id = source.node_id
     WHEN MATCHED THEN
       UPDATE SET
         definition = @definition,
         purpose = @purpose,
         input_deliverable = @inputDeliverable,
         input_data_desc = @inputDataDesc,
         input_condition = @inputCondition,
         output_deliverable = @outputDeliverable,
         output_data_desc = @outputDataDesc,
         output_condition = @outputCondition,
         frequency = @frequency,
         trigger_event = @triggerEvent,
         duration = @duration,
         issues = @issues,
         exceptions = @exceptions,
         remarks = @remarks,
         version = @version,
         updated_by = @updatedBy,
         updated_at = GETDATE()
     WHEN NOT MATCHED THEN
       INSERT (
         node_id, definition, purpose, input_deliverable, input_data_desc,
         input_condition, output_deliverable, output_data_desc, output_condition,
         frequency, trigger_event, duration, issues, exceptions, remarks,
         version, created_by
       )
       VALUES (
         @nodeId, @definition, @purpose, @inputDeliverable, @inputDataDesc,
         @inputCondition, @outputDeliverable, @outputDataDesc, @outputCondition,
         @frequency, @triggerEvent, @duration, @issues, @exceptions, @remarks,
         @version, @createdBy
       )
     OUTPUT INSERTED.*;`,
    {
      nodeId: input.nodeId,
      definition: input.definition ?? null,
      purpose: input.purpose ?? null,
      inputDeliverable: input.inputDeliverable ?? null,
      inputDataDesc: input.inputDataDesc ?? null,
      inputCondition: input.inputCondition ?? null,
      outputDeliverable: input.outputDeliverable ?? null,
      outputDataDesc: input.outputDataDesc ?? null,
      outputCondition: input.outputCondition ?? null,
      frequency: input.frequency ?? null,
      triggerEvent: input.triggerEvent ?? null,
      duration: input.duration ?? null,
      issues: input.issues ?? null,
      exceptions: input.exceptions ?? null,
      remarks: input.remarks ?? null,
      version: input.version ?? "1.0.0",
      createdBy: input.createdBy ?? null,
      updatedBy: input.updatedBy ?? null,
    },
  );

  if (!row) {
    throw new Error("Failed to upsert task attribute");
  }

  return mapTaskAttribute(row);
};

/** Task 속성 다국어 값을 저장한다. */
export const upsertTaskAttributeI18n = async (
  attrId: number,
  i18n: TaskAttributeI18nMap,
): Promise<void> => {
  for (const [locale, value] of Object.entries(i18n)) {
    if (!value) continue;

    const params: QueryParams = {
      attrId,
      locale,
      definition: value.definition ?? null,
      purpose: value.purpose ?? null,
      inputDeliverable: value.inputDeliverable ?? null,
      inputDataDesc: value.inputDataDesc ?? null,
      inputCondition: value.inputCondition ?? null,
      outputDeliverable: value.outputDeliverable ?? null,
      outputDataDesc: value.outputDataDesc ?? null,
      outputCondition: value.outputCondition ?? null,
      issues: value.issues ?? null,
      exceptions: value.exceptions ?? null,
      remarks: value.remarks ?? null,
    };

    await queryOne(
      `MERGE task_attribute_i18n AS target
       USING (SELECT @attrId AS attr_id, @locale AS locale) AS source
       ON target.attr_id = source.attr_id AND target.locale = source.locale
       WHEN MATCHED THEN
         UPDATE SET
           definition = @definition,
           purpose = @purpose,
           input_deliverable = @inputDeliverable,
           input_data_desc = @inputDataDesc,
           input_condition = @inputCondition,
           output_deliverable = @outputDeliverable,
           output_data_desc = @outputDataDesc,
           output_condition = @outputCondition,
           issues = @issues,
           exceptions = @exceptions,
           remarks = @remarks
       WHEN NOT MATCHED THEN
         INSERT (
           attr_id, locale, definition, purpose, input_deliverable,
           input_data_desc, input_condition, output_deliverable,
           output_data_desc, output_condition, issues, exceptions, remarks
         )
         VALUES (
           @attrId, @locale, @definition, @purpose, @inputDeliverable,
           @inputDataDesc, @inputCondition, @outputDeliverable,
           @outputDataDesc, @outputCondition, @issues, @exceptions, @remarks
         );`,
      params,
    );
  }
};

/** 선행 프로세스 목록을 조회한다. */
export const listTaskPredecessors = async (
  nodeId: number,
  locale: Locale,
): Promise<TaskPredecessorDto[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       tp.*,
       pn.code AS predecessor_code,
       COALESCE(pi_locale.name, pi_ko.name, pn.name) AS predecessor_name,
       pn.level AS predecessor_level
     FROM task_predecessor tp
     INNER JOIN process_node pn ON tp.predecessor_node_id = pn.node_id
     LEFT JOIN process_node_i18n pi_locale
       ON pn.node_id = pi_locale.node_id AND pi_locale.locale = @locale
     LEFT JOIN process_node_i18n pi_ko
       ON pn.node_id = pi_ko.node_id AND pi_ko.locale = 'ko'
     WHERE tp.node_id = @nodeId
     ORDER BY tp.predecessor_id`,
    { nodeId, locale },
  );

  return rows.map(mapTaskPredecessor);
};

/** BPMN sequence flow에서 도출한 선행 관계를 기존 목록에 병합한다. */
export const mergeTaskPredecessorsFromBpmn = async (
  pairs: Array<{ nodeId: number; predecessorNodeId: number }>,
): Promise<void> => {
  if (pairs.length === 0) {
    return;
  }

  await transaction(async (tx) => {
    for (const pair of pairs) {
      await tx(
        `IF NOT EXISTS (
           SELECT 1 FROM task_predecessor
           WHERE node_id = @nodeId AND predecessor_node_id = @predecessorNodeId
         )
         INSERT INTO task_predecessor (
           node_id, predecessor_node_id, condition_desc, is_mandatory
         )
         VALUES (
           @nodeId, @predecessorNodeId, @conditionDesc, @isMandatory
         )`,
        {
          nodeId: pair.nodeId,
          predecessorNodeId: pair.predecessorNodeId,
          conditionDesc: "BPMN sequence flow",
          isMandatory: true,
        },
      );
    }
  });
};

/** 선행 프로세스 목록을 현재 선택 값으로 교체한다. */
export const replaceTaskPredecessors = async (
  nodeId: number,
  predecessors: UpsertTaskPredecessorDto[],
): Promise<void> => {
  await transaction(async (tx) => {
    await tx(`DELETE FROM task_predecessor WHERE node_id = @nodeId`, { nodeId });

    for (const predecessor of predecessors) {
      await tx(
        `INSERT INTO task_predecessor (
           node_id, predecessor_node_id, condition_desc, is_mandatory
         )
         VALUES (
           @nodeId, @predecessorNodeId, @conditionDesc, @isMandatory
         )`,
        {
          nodeId,
          predecessorNodeId: predecessor.predecessorNodeId,
          conditionDesc: predecessor.conditionDesc ?? null,
          isMandatory: predecessor.isMandatory ?? true,
        },
      );
    }
  });
};

/** 이미 존재하는 선행 경로가 대상 노드까지 이어지는지 검사한다. */
export const hasPredecessorPath = async (
  fromNodeId: number,
  targetNodeId: number,
): Promise<boolean> => {
  const row = await queryOne<{ predecessor_node_id: number }>(
    `WITH dependency_tree (predecessor_node_id, depth) AS (
       SELECT predecessor_node_id, 1 AS depth
       FROM task_predecessor
       WHERE node_id = @fromNodeId
       UNION ALL
       SELECT tp.predecessor_node_id, dt.depth + 1
       FROM task_predecessor tp
       INNER JOIN dependency_tree dt
         ON tp.node_id = dt.predecessor_node_id
       WHERE dt.depth < 100
     )
     SELECT TOP 1 predecessor_node_id
     FROM dependency_tree
     WHERE predecessor_node_id = @targetNodeId
     OPTION (MAXRECURSION 100)`,
    { fromNodeId, targetNodeId },
  );

  return Boolean(row);
};

/** locale별 값에서 기본 컬럼 fallback을 생성한다. */
export const resolveTaskAttributeText = (
  attribute: TaskAttribute,
  i18n: TaskAttributeI18nMap,
  locale: Locale,
): TaskAttributeI18nValue => {
  const localized = i18n[locale] ?? i18n.ko ?? {};

  return {
    definition: localized.definition ?? attribute.definition,
    purpose: localized.purpose ?? attribute.purpose,
    inputDeliverable: localized.inputDeliverable ?? attribute.inputDeliverable,
    inputDataDesc: localized.inputDataDesc ?? attribute.inputDataDesc,
    inputCondition: localized.inputCondition ?? attribute.inputCondition,
    outputDeliverable: localized.outputDeliverable ?? attribute.outputDeliverable,
    outputDataDesc: localized.outputDataDesc ?? attribute.outputDataDesc,
    outputCondition: localized.outputCondition ?? attribute.outputCondition,
    issues: localized.issues ?? attribute.issues,
    exceptions: localized.exceptions ?? attribute.exceptions,
    remarks: localized.remarks ?? attribute.remarks,
  };
};
