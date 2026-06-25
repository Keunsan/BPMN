/**
 * 온톨로지 POC — WIQ/QT 수요 도메인 L3 의미체계 데이터 시드
 * idempotent UPDATE/INSERT
 */
import { config as loadEnv } from "dotenv";

import { closePool, queryOne } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

const POC_L3_CODES = [
  "STP-01-01-01-V-WIQ-QT",
  "STP-01-01-02",
  "STP-01-01-03",
] as const;

type NodeRow = { node_id: number; code: string; name: string };

const findNodeByCode = async (code: string): Promise<NodeRow | null> => {
  const row = await queryOne<{ node_id: number; code: string; name: string }>(
    `SELECT node_id, code, name FROM process_node WHERE code = @code`,
    { code },
  );
  return row ?? null;
};

const findSystemId = async (systemCode: string): Promise<number | null> => {
  const row = await queryOne<{ system_id: number }>(
    `SELECT TOP 1 system_id FROM application_system WHERE system_code = @systemCode ORDER BY system_id`,
    { systemCode },
  );
  return row?.system_id ?? null;
};

/** 선행 관계 condition_desc 보강 */
const PRECEDESSOR_CONDITIONS: Array<{
  taskCode: string;
  predCode: string;
  conditionDesc: string;
}> = [
  {
    taskCode: "STP-01-01-01-02-V-WIQ-QT",
    predCode: "STP-01-01-01-01-V-WIQ-QT",
    conditionDesc: "고객사 PO 등록 완료 후 수주잔량·가용재고 검토",
  },
  {
    taskCode: "STP-01-01-01-03-V-WIQ-QT",
    predCode: "STP-01-01-01-02-V-WIQ-QT",
    conditionDesc: "재고·수주 검토 후 AP2 출하계획 등록",
  },
  {
    taskCode: "STP-01-01-01-07-V-WIQ-QT",
    predCode: "STP-01-01-01-03-V-WIQ-QT",
    conditionDesc: "AP2 등록 후 CUT-OFF 시점 도래",
  },
  {
    taskCode: "STP-01-01-01-08-V-WIQ-QT",
    predCode: "STP-01-01-01-07-V-WIQ-QT",
    conditionDesc: "CUT-OFF 이후 주간 공급계획 수요 생성",
  },
  {
    taskCode: "STP-01-01-01-04-V-WIQ-QT",
    predCode: "STP-01-01-01-08-V-WIQ-QT",
    conditionDesc: "주간 수요 생성 후 담당자 우선순위 조정",
  },
  {
    taskCode: "STP-01-01-01-05-V-WIQ-QT",
    predCode: "STP-01-01-01-04-V-WIQ-QT",
    conditionDesc: "담당자 조정 후 책임자 승인·조정",
  },
  {
    taskCode: "STP-01-01-01-06-V-WIQ-QT",
    predCode: "STP-01-01-01-05-V-WIQ-QT",
    conditionDesc: "우선순위 확정 후 AP2 출하계획 확정",
  },
  {
    taskCode: "STP-01-01-02-02",
    predCode: "STP-01-01-02-01",
    conditionDesc: "고객사 긴급 PO 발행 후 S&OP 협의",
  },
  {
    taskCode: "STP-01-01-02-02",
    predCode: "STP-04-01-02",
    conditionDesc: "주간 MAIN 계획 확정 후 S&OP 협의",
  },
  {
    taskCode: "STP-01-01-02-03",
    predCode: "STP-01-01-02-02",
    conditionDesc: "S&OP 합의 후 일일 긴급 수요 등록",
  },
  {
    taskCode: "STP-01-01-02-04",
    predCode: "STP-01-01-02-03",
    conditionDesc: "등록 후 승인 절차",
  },
  {
    taskCode: "STP-01-01-02-05",
    predCode: "STP-01-01-02-04",
    conditionDesc: "승인 후 ERP 제조오더 생성",
  },
  {
    taskCode: "STP-01-01-02-06",
    predCode: "STP-01-01-02-05",
    conditionDesc: "제조오더 생성 후 정보 업데이트",
  },
  {
    taskCode: "STP-01-01-02-07",
    predCode: "STP-01-01-02-06",
    conditionDesc: "제조오더 반영 후 SRM 긴급 발주",
  },
  {
    taskCode: "STP-01-01-03-01",
    predCode: "STP-04-01-02",
    conditionDesc: "주간 MAIN 계획 기준 신규투입·취소 검토 트리거",
  },
  {
    taskCode: "STP-01-01-03-02",
    predCode: "STP-01-01-03-01",
    conditionDesc: "취소요청 승인 후 ERP 제조오더 삭제",
  },
  {
    taskCode: "STP-01-01-03-03",
    predCode: "STP-01-01-03-01",
    conditionDesc: "취소요청과 병렬 — 발주 취소 정보 연계",
  },
];

/** L4 sort_order (선행 순서) */
const SORT_ORDERS: Array<{ code: string; sortOrder: number }> = [
  { code: "STP-01-01-01-01-V-WIQ-QT", sortOrder: 1 },
  { code: "STP-01-01-01-02-V-WIQ-QT", sortOrder: 2 },
  { code: "STP-01-01-01-03-V-WIQ-QT", sortOrder: 3 },
  { code: "STP-01-01-01-07-V-WIQ-QT", sortOrder: 4 },
  { code: "STP-01-01-01-08-V-WIQ-QT", sortOrder: 5 },
  { code: "STP-01-01-01-04-V-WIQ-QT", sortOrder: 6 },
  { code: "STP-01-01-01-05-V-WIQ-QT", sortOrder: 7 },
  { code: "STP-01-01-01-06-V-WIQ-QT", sortOrder: 8 },
  { code: "STP-01-01-02-01", sortOrder: 1 },
  { code: "STP-01-01-02-02", sortOrder: 2 },
  { code: "STP-01-01-02-03", sortOrder: 3 },
  { code: "STP-01-01-02-04", sortOrder: 4 },
  { code: "STP-01-01-02-05", sortOrder: 5 },
  { code: "STP-01-01-02-06", sortOrder: 6 },
  { code: "STP-01-01-02-07", sortOrder: 7 },
  { code: "STP-01-01-03-01", sortOrder: 1 },
  { code: "STP-01-01-03-02", sortOrder: 2 },
  { code: "STP-01-01-03-03", sortOrder: 3 },
];

type TableLinkSeed = {
  taskCode: string;
  systemCode: string;
  tableName: string;
  tableNameKor: string;
  linkType: "INPUT" | "OUTPUT" | "REFERENCE";
  crudType: string;
  description: string;
};

const TABLE_LINKS: TableLinkSeed[] = [
  {
    taskCode: "STP-01-01-01-03-V-WIQ-QT",
    systemCode: "SCM",
    tableName: "AP2_SHIP_PLAN",
    tableNameKor: "AP2 출하계획",
    linkType: "OUTPUT",
    crudType: "C",
    description: "AP2 출하계획 등록 출력",
  },
  {
    taskCode: "STP-01-01-01-08-V-WIQ-QT",
    systemCode: "SCM",
    tableName: "WEEKLY_SUPPLY_DEMAND",
    tableNameKor: "주간 공급계획 수요",
    linkType: "OUTPUT",
    crudType: "C",
    description: "주간 공급계획 수요 생성",
  },
  {
    taskCode: "STP-01-01-02-03",
    systemCode: "SCM",
    tableName: "DAILY_URGENT_DEMAND",
    tableNameKor: "일일 긴급 수요",
    linkType: "OUTPUT",
    crudType: "C",
    description: "일일 긴급 수요 등록",
  },
  {
    taskCode: "STP-01-01-02-05",
    systemCode: "ERP",
    tableName: "PP_MO",
    tableNameKor: "제조오더",
    linkType: "OUTPUT",
    crudType: "C",
    description: "ERP 제조오더 생성",
  },
  {
    taskCode: "STP-01-01-02-06",
    systemCode: "ERP",
    tableName: "PP_MO",
    tableNameKor: "제조오더",
    linkType: "OUTPUT",
    crudType: "U",
    description: "제조오더 정보 업데이트",
  },
  {
    taskCode: "STP-01-01-02-07",
    systemCode: "SRM",
    tableName: "PO_URGENT",
    tableNameKor: "긴급 발주",
    linkType: "OUTPUT",
    crudType: "C",
    description: "SRM 긴급 발주",
  },
  {
    taskCode: "STP-01-01-03-01",
    systemCode: "SCM",
    tableName: "WSCM_CANCEL_REQ",
    tableNameKor: "신규투입 취소요청",
    linkType: "OUTPUT",
    crudType: "C",
    description: "WSCM 신규투입 취소 요청",
  },
  {
    taskCode: "STP-01-01-03-02",
    systemCode: "ERP",
    tableName: "PP_MO_CANCEL",
    tableNameKor: "제조오더 삭제",
    linkType: "OUTPUT",
    crudType: "D",
    description: "ERP 제조오더 삭제",
  },
  {
    taskCode: "STP-01-01-03-03",
    systemCode: "SRM",
    tableName: "PO_CANCEL_LINK",
    tableNameKor: "발주 취소 연계",
    linkType: "OUTPUT",
    crudType: "C",
    description: "발주 취소 요청 정보 연계",
  },
  {
    taskCode: "STP-01-01-01-02-V-WIQ-QT",
    systemCode: "SCM",
    tableName: "OPEN_ORDER_BALANCE",
    tableNameKor: "수주잔량",
    linkType: "INPUT",
    crudType: "R",
    description: "수주잔량·가용재고 조회",
  },
];

type SystemLinkSeed = {
  taskCode: string;
  systemCode: string;
  usageDescription: string;
};

const SYSTEM_LINKS: SystemLinkSeed[] = [
  {
    taskCode: "STP-01-01-01-03-V-WIQ-QT",
    systemCode: "SCM",
    usageDescription: "AP2 출하계획등록 메뉴",
  },
  {
    taskCode: "STP-01-01-02-03",
    systemCode: "SCM",
    usageDescription: "일일긴급수요등록 메뉴",
  },
  {
    taskCode: "STP-01-01-02-05",
    systemCode: "ERP",
    usageDescription: "제조오더 생성 화면",
  },
  {
    taskCode: "STP-01-01-02-06",
    systemCode: "ERP",
    usageDescription: "제조오더 정보 업데이트",
  },
  {
    taskCode: "STP-01-01-02-07",
    systemCode: "SRM",
    usageDescription: "긴급 발주 진행",
  },
  {
    taskCode: "STP-01-01-03-01",
    systemCode: "SCM",
    usageDescription: "주간공급계획 수요 조회·취소 입력",
  },
  {
    taskCode: "STP-01-01-03-02",
    systemCode: "ERP",
    usageDescription: "제조오더 삭제",
  },
  {
    taskCode: "STP-01-01-03-03",
    systemCode: "SRM",
    usageDescription: "발주 취소 요청 연계",
  },
];

const updatePredecessorConditions = async (): Promise<number> => {
  let updated = 0;
  for (const item of PRECEDESSOR_CONDITIONS) {
    const task = await findNodeByCode(item.taskCode);
    const pred = await findNodeByCode(item.predCode);
    if (!task || !pred) {
      console.warn(`SKIP predecessor: ${item.taskCode} <- ${item.predCode}`);
      continue;
    }
    await queryOne(
      `UPDATE task_predecessor
       SET condition_desc = @conditionDesc, is_mandatory = 1
       WHERE node_id = @nodeId AND predecessor_node_id = @predNodeId`,
      {
        conditionDesc: item.conditionDesc,
        nodeId: task.node_id,
        predNodeId: pred.node_id,
      },
    );
    updated += 1;
    console.log(`PRED: ${item.taskCode} <- ${item.predCode}`);
  }
  return updated;
};

const updateSortOrders = async (): Promise<number> => {
  let updated = 0;
  for (const item of SORT_ORDERS) {
    const result = await queryOne<{ cnt: number }>(
      `UPDATE process_node SET sort_order = @sortOrder WHERE code = @code;
       SELECT @@ROWCOUNT AS cnt`,
      { sortOrder: item.sortOrder, code: item.code },
    );
    if ((result?.cnt ?? 0) > 0) {
      updated += 1;
    }
  }
  return updated;
};

const upsertTableLinks = async (): Promise<number> => {
  let upserted = 0;
  for (const item of TABLE_LINKS) {
    const task = await findNodeByCode(item.taskCode);
    const systemId = await findSystemId(item.systemCode);
    if (!task || !systemId) {
      console.warn(`SKIP table link: ${item.taskCode} / ${item.systemCode}`);
      continue;
    }

    const existing = await queryOne<{ link_id: number }>(
      `SELECT link_id FROM task_data_table_link
       WHERE node_id = @nodeId AND system_id = @systemId AND table_name = @tableName`,
      {
        nodeId: task.node_id,
        systemId,
        tableName: item.tableName,
      },
    );

    if (existing) {
      await queryOne(
        `UPDATE task_data_table_link
         SET link_type = @linkType, crud_type = @crudType,
             table_name_kor = @tableNameKor, description = @description
         WHERE link_id = @linkId`,
        {
          linkId: existing.link_id,
          linkType: item.linkType,
          crudType: item.crudType,
          tableNameKor: item.tableNameKor,
          description: item.description,
        },
      );
    } else {
      await queryOne(
        `INSERT INTO task_data_table_link (
           node_id, system_id, schema_name, table_name, table_name_kor,
           link_type, crud_type, description
         ) VALUES (
           @nodeId, @systemId, 'dbo', @tableName, @tableNameKor,
           @linkType, @crudType, @description
         )`,
        {
          nodeId: task.node_id,
          systemId,
          tableName: item.tableName,
          tableNameKor: item.tableNameKor,
          linkType: item.linkType,
          crudType: item.crudType,
          description: item.description,
        },
      );
    }
    upserted += 1;
    console.log(`TABLE: ${item.taskCode} -> ${item.systemCode}.${item.tableName}`);
  }
  return upserted;
};

const upsertSystemLinks = async (): Promise<number> => {
  let upserted = 0;
  for (const item of SYSTEM_LINKS) {
    const task = await findNodeByCode(item.taskCode);
    const systemId = await findSystemId(item.systemCode);
    if (!task || !systemId) {
      console.warn(`SKIP system link: ${item.taskCode} / ${item.systemCode}`);
      continue;
    }

    const existing = await queryOne<{ link_id: number }>(
      `SELECT link_id FROM task_system_link
       WHERE node_id = @nodeId AND system_id = @systemId`,
      { nodeId: task.node_id, systemId },
    );

    if (existing) {
      await queryOne(
        `UPDATE task_system_link SET usage_description = @usageDescription WHERE link_id = @linkId`,
        { linkId: existing.link_id, usageDescription: item.usageDescription },
      );
    } else {
      await queryOne(
        `INSERT INTO task_system_link (node_id, system_id, usage_description, is_primary)
         VALUES (@nodeId, @systemId, @usageDescription, 1)`,
        {
          nodeId: task.node_id,
          systemId,
          usageDescription: item.usageDescription,
        },
      );
    }
    upserted += 1;
    console.log(`SYSTEM: ${item.taskCode} -> ${item.systemCode}`);
  }
  return upserted;
};

const main = async (): Promise<void> => {
  console.log("온톨로지 POC 시드 시작...\n");

  for (const code of POC_L3_CODES) {
    const node = await findNodeByCode(code);
    console.log(
      node ? `L3 OK: [${node.code}] ${node.name} (id=${node.node_id})` : `L3 MISSING: ${code}`,
    );
  }

  const predCount = await updatePredecessorConditions();
  const sortCount = await updateSortOrders();
  const tableCount = await upsertTableLinks();
  const systemCount = await upsertSystemLinks();

  console.log(`\n완료 — 선행 ${predCount}, sort_order ${sortCount}, 테이블 ${tableCount}, 시스템 ${systemCount}`);
};

main()
  .catch((err: Error) => {
    console.error("\n시드 실패:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
