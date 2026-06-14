/**
 * 마이그레이션된 Task 속성(input/output) 보정 및 선행 조건 정리
 * docs/PROCESS,TASK마이그레이션.xlsx Sheet2 기준으로 기존 데이터를 업데이트한다
 */
import { config as loadEnv } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as XLSX from "xlsx";

import { closePool, query, queryOne, transaction } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

const EXCEL_PATH = join(
  process.cwd(),
  "docs",
  "PROCESS,TASK마이그레이션.xlsx",
);

type Sheet2Row = {
  id: string;
  l1: string;
  l2: string;
  l3: string;
  l4: string;
  inputInfo: string | null;
  outputInfo: string | null;
  sortOrder: number;
};

type TxRequest = (
  queryText: string,
  params?: Record<string, string | number | boolean | Date | null | undefined>,
) => Promise<unknown>;

const toText = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

/** 엑셀 헤더 접두사로 컬럼 값을 조회한다 */
const resolveColumn = (
  row: Record<string, unknown>,
  prefix: string,
): string | null => {
  const key = Object.keys(row).find((name) => name.startsWith(prefix));
  return key ? toText(row[key]) : null;
};

/** Sheet2 행을 파싱한다 */
const loadSheet2Rows = (): Sheet2Row[] => {
  const buffer = readFileSync(EXCEL_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet2Raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets.Sheet2,
    { defval: null },
  );

  return sheet2Raw
    .map((row) => {
      const id = toText(row.ID) ?? "";
      const parts = id.split(".");
      const sortOrder =
        parts.length >= 4 ? Number.parseInt(parts[3]?.trim() ?? "0", 10) : 0;

      return {
        id,
        l1: toText(row.L1) ?? "",
        l2: toText(row.L2) ?? "",
        l3: toText(row.L3) ?? "",
        l4: toText(row.L4) ?? "",
        inputInfo: resolveColumn(row, "Input 정보"),
        outputInfo: resolveColumn(row, "Output 정보"),
        sortOrder,
      };
    })
    .filter((row) => row.id && row.l4 && row.l1 && row.l2 && row.l3);
};

/** L1~L4 이름·sort_order로 L4 노드 ID를 조회한다 */
const findL4NodeId = async (
  tx: TxRequest,
  row: Sheet2Row,
): Promise<number | null> => {
  const result = await tx(
    `SELECT l4.node_id
     FROM process_node l4
     INNER JOIN process_node l3 ON l3.node_id = l4.parent_node_id AND l3.level = 'L3'
     INNER JOIN process_node l2 ON l2.node_id = l3.parent_node_id AND l2.level = 'L2'
     INNER JOIN process_node l1 ON l1.node_id = l2.parent_node_id AND l1.level = 'L1'
     WHERE l4.level = 'L4'
       AND l1.name = @l1
       AND l2.name = @l2
       AND l3.name = @l3
       AND l4.name = @l4
       AND l4.sort_order = @sortOrder`,
    {
      l1: row.l1,
      l2: row.l2,
      l3: row.l3,
      l4: row.l4,
      sortOrder: row.sortOrder,
    },
  );

  const nodeId = (
    result as { recordset?: Array<{ node_id: number }> }
  ).recordset?.[0]?.node_id;
  return nodeId ?? null;
};

/** Task 속성 input/output을 업데이트한다 */
const updateTaskAttribute = async (
  tx: TxRequest,
  nodeId: number,
  inputInfo: string | null,
  outputInfo: string | null,
): Promise<void> => {
  await tx(
    `UPDATE task_attribute
     SET input_deliverable = @inputInfo,
         output_deliverable = @outputInfo,
         updated_at = GETDATE()
     WHERE node_id = @nodeId`,
    { nodeId, inputInfo, outputInfo },
  );

  await tx(
    `UPDATE task_attribute_i18n
     SET input_deliverable = @inputInfo,
         output_deliverable = @outputInfo
     WHERE attr_id = (SELECT attr_id FROM task_attribute WHERE node_id = @nodeId)
       AND locale = 'ko'`,
    { nodeId, inputInfo, outputInfo },
  );
};

const main = async (): Promise<void> => {
  const taskCount = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM task_attribute`,
  );
  if ((taskCount?.cnt ?? 0) === 0) {
    throw new Error("task_attribute 데이터가 없습니다. 먼저 마이그레이션을 실행하세요.");
  }

  const rows = loadSheet2Rows();
  console.log(`Sheet2: ${rows.length}건 로드`);

  const withInput = rows.filter((row) => row.inputInfo).length;
  const withOutput = rows.filter((row) => row.outputInfo).length;
  console.log(`Input 정보: ${withInput}건, Output 정보: ${withOutput}건`);

  const stats = { updated: 0, skipped: 0, notFound: 0 };

  await transaction(async (tx) => {
    for (const row of rows) {
      const nodeId = await findL4NodeId(tx, row);
      if (!nodeId) {
        stats.notFound += 1;
        console.warn(`  [미발견] ${row.id} — ${row.l4}`);
        continue;
      }

      if (!row.inputInfo && !row.outputInfo) {
        stats.skipped += 1;
        continue;
      }

      await updateTaskAttribute(tx, nodeId, row.inputInfo, row.outputInfo);
      stats.updated += 1;
    }

    const predResult = await tx(
      `UPDATE task_predecessor
       SET condition_desc = NULL
       WHERE condition_desc = N'SEQ 직전 Task'`,
    );
    const predCount = (
      predResult as { rowsAffected?: number[] }
    ).rowsAffected?.[0] ?? 0;
    console.log(`\n선행 조건 'SEQ 직전 Task' 삭제: ${predCount}건`);
  });

  console.log("\n=== 업데이트 완료 ===");
  console.log(
    `Task 속성: ${stats.updated}건 업데이트, ${stats.skipped}건 스킵(빈값), ${stats.notFound}건 미발견`,
  );
};

main()
  .catch((err) => {
    console.error("\n업데이트 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
