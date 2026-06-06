/**
 * 수요관리(L3) 하위 L4 프로세스 시드 스크립트
 */
import { config as loadEnv } from "dotenv";

import { closePool, query, queryOne } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

const L4_PROCESSES = [
  "고객사 PO 등록",
  "현 수주잔량 및 고객사 가용재고 검토",
  "AP2 출하계획등록",
  "AP2 출하계획 우선순위 조정",
  "생산/자재발주 취소여부",
  "작업지시서 삭제",
  "자재발주 취소",
  "긴급 수요",
  "SCM/생산/영업/구매팀 간 협의 진행",
  "일일긴급수요등록",
  "긴급 작업지시 생성",
  "긴급 발주진행",
] as const;

const generateCode = async (parentNodeId: number): Promise<string> => {
  const parent = await queryOne<{ code: string }>(
    `SELECT code FROM process_node WHERE node_id = @parentNodeId`,
    { parentNodeId },
  );
  if (!parent) {
    throw new Error(`부모 노드를 찾을 수 없습니다: ${parentNodeId}`);
  }

  const row = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM process_node WHERE parent_node_id = @parentNodeId`,
    { parentNodeId },
  );
  const seq = String((row?.cnt ?? 0) + 1).padStart(2, "0");
  return `${parent.code}-${seq}`;
};

const insertProcess = async (
  parentNodeId: number,
  name: string,
  sortOrder: number,
): Promise<{ nodeId: number; code: string }> => {
  const code = await generateCode(parentNodeId);

  const row = await queryOne<{ node_id: number; code: string }>(
    `INSERT INTO process_node (
      parent_node_id, level, code, name, status, version, is_standard, sort_order
    )
    OUTPUT INSERTED.node_id, INSERTED.code
    VALUES (
      @parentNodeId, 'L4', @code, @name, 'DRAFT', '1.0.0', 1, @sortOrder
    )`,
    { parentNodeId, code, name, sortOrder },
  );

  if (!row) {
    throw new Error(`프로세스 생성 실패: ${name}`);
  }

  await queryOne(
    `INSERT INTO process_node_i18n (node_id, locale, name)
     VALUES (@nodeId, 'ko', @name)`,
    { nodeId: row.node_id, name },
  );

  await queryOne(
    `INSERT INTO process_node_history (node_id, version, change_type, change_reason)
     VALUES (@nodeId, '1.0.0', 'CREATE', N'Initial creation')`,
    { nodeId: row.node_id },
  );

  return { nodeId: row.node_id, code: row.code };
};

const main = async (): Promise<void> => {
  const parents = await query<{
    node_id: number;
    level: string;
    code: string;
    name: string;
  }>(
    `SELECT node_id, level, code, name
     FROM process_node
     WHERE name IN (N'영업', N'수요', N'수요관리')
     ORDER BY level`,
  );

  console.log("기존 계층 노드:");
  for (const p of parents) {
    console.log(`  ${p.level} [${p.code}] ${p.name} (id=${p.node_id})`);
  }

  const l3 = parents.find((p) => p.name === "수요관리" && p.level === "L3");
  if (!l3) {
    throw new Error("L3 수요관리 노드를 찾을 수 없습니다.");
  }

  const existing = await query<{ name: string; code: string }>(
    `SELECT name, code FROM process_node WHERE parent_node_id = @parentId ORDER BY sort_order, node_id`,
    { parentId: l3.node_id },
  );

  if (existing.length > 0) {
    console.log(`\n기존 L4 (${existing.length}건):`);
    for (const e of existing) {
      console.log(`  [${e.code}] ${e.name}`);
    }
  }

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < L4_PROCESSES.length; i++) {
    const name = L4_PROCESSES[i];
    const already = existing.find((e) => e.name === name);
    if (already) {
      console.log(`SKIP: ${name} (이미 존재 — ${already.code})`);
      skipped++;
      continue;
    }

    const node = await insertProcess(l3.node_id, name, i + 1);
    console.log(`CREATE: [${node.code}] ${name}`);
    created++;
  }

  console.log(`\n완료 — 생성 ${created}건, 건너뜀 ${skipped}건`);
};

main()
  .catch((err) => {
    console.error("\n시드 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
