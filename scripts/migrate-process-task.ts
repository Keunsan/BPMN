/**
 * 엑셀 기반 프로세스·Task·BPMN 일괄 마이그레이션
 * docs/PROCESS,TASK마이그레이션.xlsx → Sheet1(L1~L3) + Sheet2(L4/Task/BPMN)
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

import {
  ENTERPRISE_BUSINESS_UNIT_CODE,
  ENTERPRISE_COMPANY_CODE,
} from "../lib/constants/process-scope";
import { closePool, queryOne, transaction } from "../lib/db/pool";
import { buildLinearBpmnXml } from "../lib/utils/bpmn-linear-layout";

loadEnv({ path: ".env.local" });

const EXCEL_PATH = join(
  process.cwd(),
  "docs",
  "PROCESS,TASK마이그레이션.xlsx",
);

type Sheet1Row = {
  seq: string;
  l1: string;
  l2: string;
  l3: string;
};

type Sheet2Row = {
  id: string;
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  definition: string | null;
  inputInfo: string | null;
  outputInfo: string | null;
  sortOrder: number;
  l3Seq: string;
};

type TxRequest = (
  queryText: string,
  params?: Record<string, string | number | boolean | Date | null | undefined>,
) => Promise<unknown>;

const parseSeqParts = (seq: string): number[] =>
  seq
    .trim()
    .split(".")
    .map((part) => Number.parseInt(part, 10));

const compareSeq = (left: string, right: string): number => {
  const a = parseSeqParts(left);
  const b = parseSeqParts(right);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

const toText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

/** 엑셀 파일을 파싱한다 */
const loadExcelRows = (): { sheet1: Sheet1Row[]; sheet2: Sheet2Row[] } => {
  const buffer = readFileSync(EXCEL_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const sheet1Raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets.Sheet1,
    { defval: null },
  );
  const sheet2Raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets.Sheet2,
    { defval: null },
  );

  const sheet1: Sheet1Row[] = sheet1Raw
    .map((row) => ({
      seq: toText(row["SEQ."] ?? row.SEQ) ?? "",
      l1: toText(row.lv1 ?? row.L1) ?? "",
      l2: toText(row.lv2 ?? row.L2) ?? "",
      l3: toText(row.lv3 ?? row.L3) ?? "",
    }))
    .filter((row) => row.seq && row.l1 && row.l2 && row.l3)
    .sort((a, b) => compareSeq(a.seq, b.seq));

  const sheet2: Sheet2Row[] = sheet2Raw
    .map((row) => {
      const id = toText(row.ID) ?? "";
      const parts = id.split(".");
      const l3Seq = parts.length >= 3 ? parts.slice(0, 3).join(".") : "";
      const sortOrder =
        parts.length >= 4 ? Number.parseInt(parts[3]?.trim() ?? "0", 10) : 0;

      return {
        id,
        l1: toText(row.L1) ?? "",
        l2: toText(row.L2) ?? "",
        l3: toText(row.L3) ?? "",
        l4: toText(row.L4) ?? "",
        definition: toText(row["정의"]),
        inputInfo: toText(row["Input 정보\n(산출물, 주요 Data 등)"]),
        outputInfo: toText(row["Output 정보\n(산출물, 주요 Data 등)"]),
        sortOrder,
        l3Seq,
      };
    })
    .filter((row) => row.id && row.l4 && row.l3Seq)
    .sort((a, b) => compareSeq(a.id, b.id));

  return { sheet1, sheet2 };
};

/** 시스템 채번 규칙으로 코드를 생성한다 */
const generateProcessCode = async (
  tx: TxRequest,
  parentNodeId: number | null,
): Promise<string> => {
  if (!parentNodeId) {
    const result = await tx(
      `SELECT COUNT(*) AS cnt
       FROM process_node
       WHERE parent_node_id IS NULL AND variant_of IS NULL`,
    );
    const row = (result as { recordset?: Array<{ cnt: number }> }).recordset?.[0];
    const seq = String((row?.cnt ?? 0) + 1).padStart(2, "0");
    return `STP-${seq}`;
  }

  const parentResult = await tx(
    `SELECT code FROM process_node WHERE node_id = @parentNodeId`,
    { parentNodeId },
  );
  const parent = (
    parentResult as { recordset?: Array<{ code: string }> }
  ).recordset?.[0];
  if (!parent) {
    throw new Error(`부모 프로세스를 찾을 수 없습니다: ${parentNodeId}`);
  }

  const countResult = await tx(
    `SELECT COUNT(*) AS cnt FROM process_node WHERE parent_node_id = @parentNodeId`,
    { parentNodeId },
  );
  const countRow = (countResult as { recordset?: Array<{ cnt: number }> })
    .recordset?.[0];
  const seq = String((countRow?.cnt ?? 0) + 1).padStart(2, "0");
  return `${parent.code}-${seq}`;
};

/** 프로세스 노드를 생성한다 */
const insertProcess = async (
  tx: TxRequest,
  input: {
    parentNodeId: number | null;
    level: "L1" | "L2" | "L3" | "L4";
    name: string;
    sortOrder: number;
  },
): Promise<{ nodeId: number; code: string }> => {
  const code = await generateProcessCode(tx, input.parentNodeId);

  const result = await tx(
    `INSERT INTO process_node (
      parent_node_id, level, code, name, status, version, is_standard,
      company_code, business_unit_code, sort_order
    )
    OUTPUT INSERTED.node_id, INSERTED.code
    VALUES (
      @parentNodeId, @level, @code, @name, 'DRAFT', '1.0.0', 1,
      @companyCode, @businessUnitCode, @sortOrder
    )`,
    {
      parentNodeId: input.parentNodeId,
      level: input.level,
      code,
      name: input.name,
      companyCode: ENTERPRISE_COMPANY_CODE,
      businessUnitCode: ENTERPRISE_BUSINESS_UNIT_CODE,
      sortOrder: input.sortOrder,
    },
  );

  const row = (result as { recordset?: Array<{ node_id: number; code: string }> })
    .recordset?.[0];
  if (!row) {
    throw new Error(`프로세스 생성 실패: ${input.name}`);
  }

  await tx(
    `INSERT INTO process_node_i18n (node_id, locale, name)
     VALUES (@nodeId, 'ko', @name)`,
    { nodeId: row.node_id, name: input.name },
  );

  await tx(
    `INSERT INTO process_node_history (node_id, version, change_type, change_reason)
     VALUES (@nodeId, '1.0.0', 'CREATE', N'Excel migration')`,
    { nodeId: row.node_id },
  );

  return { nodeId: row.node_id, code: row.code };
};

/** Task 속성을 저장한다 */
const insertTaskAttribute = async (
  tx: TxRequest,
  input: {
    nodeId: number;
    definition: string;
    inputInfo: string | null;
    outputInfo: string | null;
  },
): Promise<void> => {
  const result = await tx(
    `INSERT INTO task_attribute (
      node_id, definition, input_data_desc, output_deliverable, version
    )
    OUTPUT INSERTED.attr_id
    VALUES (
      @nodeId, @definition, @inputInfo, @outputInfo, '1.0.0'
    )`,
    {
      nodeId: input.nodeId,
      definition: input.definition,
      inputInfo: input.inputInfo,
      outputInfo: input.outputInfo,
    },
  );

  const attrId = (
    result as { recordset?: Array<{ attr_id: number }> }
  ).recordset?.[0]?.attr_id;
  if (!attrId) {
    throw new Error(`Task 속성 생성 실패: nodeId=${input.nodeId}`);
  }

  await tx(
    `INSERT INTO task_attribute_i18n (
      attr_id, locale, definition, input_data_desc, output_deliverable
    )
    VALUES (
      @attrId, 'ko', @definition, @inputInfo, @outputInfo
    )`,
    {
      attrId,
      definition: input.definition,
      inputInfo: input.inputInfo,
      outputInfo: input.outputInfo,
    },
  );
};

/** 선행 프로세스를 저장한다 */
const insertTaskPredecessor = async (
  tx: TxRequest,
  nodeId: number,
  predecessorNodeId: number,
): Promise<void> => {
  await tx(
    `INSERT INTO task_predecessor (
      node_id, predecessor_node_id, condition_desc, is_mandatory
    )
    VALUES (
      @nodeId, @predecessorNodeId, N'SEQ 직전 Task', 1
    )`,
    { nodeId, predecessorNodeId },
  );
};

/** L3 BPMN 모델과 요소 연결을 생성한다 */
const insertBpmnModel = async (
  tx: TxRequest,
  input: {
    l3NodeId: number;
    modelName: string;
    xml: string;
    elements: Array<{
      elementBpmnId: string;
      elementName: string;
      linkedNodeId: number;
    }>;
  },
): Promise<number> => {
  await tx(
    `UPDATE bpmn_model SET is_current = 0 WHERE node_id = @nodeId AND is_current = 1`,
    { nodeId: input.l3NodeId },
  );

  const result = await tx(
    `INSERT INTO bpmn_model (
      node_id, model_name, version, bpmn_xml, status, is_current
    )
    OUTPUT INSERTED.model_id
    VALUES (
      @nodeId, @modelName, '1.0.0', @bpmnXml, 'DRAFT', 1
    )`,
    {
      nodeId: input.l3NodeId,
      modelName: input.modelName,
      bpmnXml: input.xml,
    },
  );

  const modelId = (
    result as { recordset?: Array<{ model_id: number }> }
  ).recordset?.[0]?.model_id;
  if (!modelId) {
    throw new Error(`BPMN 모델 생성 실패: ${input.modelName}`);
  }

  for (const element of input.elements) {
    await tx(
      `INSERT INTO bpmn_element (
        model_id, element_type, element_bpmn_id, element_name, linked_node_id, properties
      )
      VALUES (
        @modelId, 'USER_TASK', @elementBpmnId, @elementName, @linkedNodeId, @properties
      )`,
      {
        modelId,
        elementBpmnId: element.elementBpmnId,
        elementName: element.elementName,
        linkedNodeId: element.linkedNodeId,
        properties: JSON.stringify({ linkKind: "L4_TASK" }),
      },
    );
  }

  return modelId;
};

const migrate = async (): Promise<void> => {
  const existing = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM process_node`,
  );
  if ((existing?.cnt ?? 0) > 0) {
    throw new Error(
      "process_node에 기존 데이터가 있습니다. 먼저 npm run db:reset-operational 을 실행하세요.",
    );
  }

  const { sheet1, sheet2 } = loadExcelRows();
  console.log(`Sheet1: ${sheet1.length}건, Sheet2: ${sheet2.length}건 로드`);

  const stats = {
    l1: 0,
    l2: 0,
    l3: 0,
    l4: 0,
    taskAttr: 0,
    predecessors: 0,
    bpmnModels: 0,
  };

  await transaction(async (tx) => {
    const l1Map = new Map<string, number>();
    const l2Map = new Map<string, number>();
    const l3Map = new Map<string, number>();
    const l4Map = new Map<string, number>();

    let l1Sort = 0;
    const l2SortByL1 = new Map<string, number>();

    for (const row of sheet1) {
      let l1NodeId = l1Map.get(row.l1);
      if (!l1NodeId) {
        l1Sort += 1;
        const created = await insertProcess(tx, {
          parentNodeId: null,
          level: "L1",
          name: row.l1,
          sortOrder: l1Sort,
        });
        l1NodeId = created.nodeId;
        l1Map.set(row.l1, l1NodeId);
        stats.l1 += 1;
        console.log(`L1 [${created.code}] ${row.l1}`);
      }

      const l2Key = `${row.l1}::${row.l2}`;
      let l2NodeId = l2Map.get(l2Key);
      if (!l2NodeId) {
        const nextSort = (l2SortByL1.get(row.l1) ?? 0) + 1;
        l2SortByL1.set(row.l1, nextSort);
        const created = await insertProcess(tx, {
          parentNodeId: l1NodeId,
          level: "L2",
          name: row.l2,
          sortOrder: nextSort,
        });
        l2NodeId = created.nodeId;
        l2Map.set(l2Key, l2NodeId);
        stats.l2 += 1;
        console.log(`  L2 [${created.code}] ${row.l2}`);
      }

      const l3Parts = parseSeqParts(row.seq);
      const createdL3 = await insertProcess(tx, {
        parentNodeId: l2NodeId,
        level: "L3",
        name: row.l3,
        sortOrder: l3Parts[2] ?? 1,
      });
      l3Map.set(row.seq, createdL3.nodeId);
      stats.l3 += 1;
      console.log(`    L3 [${createdL3.code}] ${row.l3} (${row.seq})`);
    }

    const l4ByL3Seq = new Map<string, Sheet2Row[]>();
    for (const row of sheet2) {
      const bucket = l4ByL3Seq.get(row.l3Seq) ?? [];
      bucket.push(row);
      l4ByL3Seq.set(row.l3Seq, bucket);
    }

    for (const [l3Seq, rows] of l4ByL3Seq.entries()) {
      const l3NodeId = l3Map.get(l3Seq);
      if (!l3NodeId) {
        throw new Error(`Sheet1에 없는 L3 SEQ: ${l3Seq}`);
      }

      const sortedRows = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
      const l4NodeIds: number[] = [];

      for (const row of sortedRows) {
        const createdL4 = await insertProcess(tx, {
          parentNodeId: l3NodeId,
          level: "L4",
          name: row.l4,
          sortOrder: row.sortOrder,
        });
        l4Map.set(row.id, createdL4.nodeId);
        l4NodeIds.push(createdL4.nodeId);
        stats.l4 += 1;

        const definition = row.definition ?? row.l4;
        await insertTaskAttribute(tx, {
          nodeId: createdL4.nodeId,
          definition,
          inputInfo: row.inputInfo,
          outputInfo: row.outputInfo,
        });
        stats.taskAttr += 1;
      }

      for (let i = 1; i < l4NodeIds.length; i++) {
        await insertTaskPredecessor(tx, l4NodeIds[i], l4NodeIds[i - 1]);
        stats.predecessors += 1;
      }

      const bpmnTasks = sortedRows.map((row, index) => ({
        bpmnElementId: `Task_${row.id.replace(/\./g, "_")}`,
        name: row.l4,
        linkedNodeId: l4Map.get(row.id)!,
      }));

      const l3Name = sheet1.find((item) => item.seq === l3Seq)?.l3 ?? l3Seq;
      const { xml, elements } = buildLinearBpmnXml(bpmnTasks);
      await insertBpmnModel(tx, {
        l3NodeId,
        modelName: `${l3Name} 프로세스`,
        xml,
        elements: elements.map((element) => ({
          elementBpmnId: element.elementBpmnId,
          elementName: element.elementName ?? "",
          linkedNodeId: element.linkedNodeId!,
        })),
      });
      stats.bpmnModels += 1;
      console.log(
        `      L4 ${sortedRows.length}건 + BPMN — ${l3Name} (${l3Seq})`,
      );
    }
  });

  console.log("\n=== 마이그레이션 완료 ===");
  console.log(`L1: ${stats.l1}, L2: ${stats.l2}, L3: ${stats.l3}, L4: ${stats.l4}`);
  console.log(
    `Task: ${stats.taskAttr}, 선행: ${stats.predecessors}, BPMN: ${stats.bpmnModels}`,
  );
};

migrate()
  .catch((err) => {
    console.error("\n마이그레이션 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
