/**
 * 마이그레이션 전 운영 데이터 초기화 — 프로세스·Task·BPMN 등 테스트 데이터 삭제
 * 유지: common_code, application_system/system_module/system_screen, error_code, document_type
 */
import { config as loadEnv } from "dotenv";

import { closePool, query, transaction } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

type CountRow = { table_name: string; cnt: number };

const COUNT_QUERIES: Array<{ table: string; sql: string }> = [
  { table: "process_node", sql: "SELECT COUNT(*) AS cnt FROM process_node" },
  { table: "task_attribute", sql: "SELECT COUNT(*) AS cnt FROM task_attribute" },
  { table: "bpmn_model", sql: "SELECT COUNT(*) AS cnt FROM bpmn_model" },
  { table: "bpmn_element", sql: "SELECT COUNT(*) AS cnt FROM bpmn_element" },
  {
    table: "task_system_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_system_mapping",
  },
  {
    table: "task_data_table_link",
    sql: "SELECT COUNT(*) AS cnt FROM task_data_table_link",
  },
  {
    table: "task_predecessor",
    sql: "SELECT COUNT(*) AS cnt FROM task_predecessor",
  },
  {
    table: "task_role_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_role_mapping",
  },
  {
    table: "task_interface_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_interface_mapping",
  },
  {
    table: "task_kpi_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_kpi_mapping",
  },
  {
    table: "task_risk_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_risk_mapping",
  },
  {
    table: "task_control_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_control_mapping",
  },
  {
    table: "task_document_mapping",
    sql: "SELECT COUNT(*) AS cnt FROM task_document_mapping",
  },
  { table: "document", sql: "SELECT COUNT(*) AS cnt FROM document" },
  { table: "kpi", sql: "SELECT COUNT(*) AS cnt FROM kpi" },
  { table: "risk", sql: "SELECT COUNT(*) AS cnt FROM risk" },
  { table: "control", sql: "SELECT COUNT(*) AS cnt FROM control" },
  { table: "organization", sql: "SELECT COUNT(*) AS cnt FROM organization" },
  { table: "users", sql: "SELECT COUNT(*) AS cnt FROM users" },
  {
    table: "external_table_cache",
    sql: "SELECT COUNT(*) AS cnt FROM external_table_cache",
  },
  {
    table: "approval_request",
    sql: "SELECT COUNT(*) AS cnt FROM approval_request",
  },
  {
    table: "common_code",
    sql: "SELECT COUNT(*) AS cnt FROM common_code",
  },
  {
    table: "application_system",
    sql: "SELECT COUNT(*) AS cnt FROM application_system",
  },
  {
    table: "system_screen",
    sql: "SELECT COUNT(*) AS cnt FROM system_screen",
  },
];

const countRows = async (label: string): Promise<void> => {
  console.log(`\n[${label}]`);
  for (const item of COUNT_QUERIES) {
    const row = await query<{ cnt: number }>(item.sql);
    const cnt = row[0]?.cnt ?? 0;
    if (cnt > 0) {
      console.log(`  ${item.table}: ${cnt}`);
    }
  }
};

const resetOperationalData = async (): Promise<void> => {
  await transaction(async (tx) => {
    const steps: Array<{ label: string; sql: string }> = [
      { label: "approval_history", sql: "DELETE FROM approval_history" },
      { label: "approval_request", sql: "DELETE FROM approval_request" },
      { label: "bpmn_element", sql: "DELETE FROM bpmn_element" },
      { label: "bpmn_model", sql: "DELETE FROM bpmn_model" },
      {
        label: "task_attribute_i18n",
        sql: "DELETE FROM task_attribute_i18n",
      },
      { label: "task_predecessor", sql: "DELETE FROM task_predecessor" },
      { label: "task_role_mapping", sql: "DELETE FROM task_role_mapping" },
      {
        label: "task_system_mapping",
        sql: "DELETE FROM task_system_mapping",
      },
      {
        label: "task_interface_mapping",
        sql: "DELETE FROM task_interface_mapping",
      },
      {
        label: "task_data_table_link",
        sql: "DELETE FROM task_data_table_link",
      },
      { label: "task_kpi_mapping", sql: "DELETE FROM task_kpi_mapping" },
      { label: "task_risk_mapping", sql: "DELETE FROM task_risk_mapping" },
      {
        label: "task_control_mapping",
        sql: "DELETE FROM task_control_mapping",
      },
      {
        label: "task_document_mapping",
        sql: "DELETE FROM task_document_mapping",
      },
      { label: "task_attribute", sql: "DELETE FROM task_attribute" },
      { label: "process_node_i18n", sql: "DELETE FROM process_node_i18n" },
      {
        label: "process_node_history",
        sql: "DELETE FROM process_node_history",
      },
      {
        label: "process_node (unlink)",
        sql: "UPDATE process_node SET parent_node_id = NULL, variant_of = NULL",
      },
      { label: "process_node", sql: "DELETE FROM process_node" },
      {
        label: "external_table_cache",
        sql: "DELETE FROM external_table_cache",
      },
      { label: "document", sql: "DELETE FROM document" },
      { label: "kpi", sql: "DELETE FROM kpi" },
      { label: "risk", sql: "DELETE FROM risk" },
      { label: "control", sql: "DELETE FROM control" },
      { label: "user_role_mapping", sql: "DELETE FROM user_role_mapping" },
      { label: "users", sql: "DELETE FROM users" },
      { label: "role", sql: "DELETE FROM role" },
      {
        label: "organization (unlink)",
        sql: "UPDATE organization SET parent_org_id = NULL",
      },
      { label: "organization", sql: "DELETE FROM organization" },
    ];

    for (const step of steps) {
      await tx(step.sql);
      console.log(`  삭제 완료: ${step.label}`);
    }

    const reseedTargets = [
      "process_node",
      "process_node_i18n",
      "process_node_history",
      "task_attribute",
      "task_attribute_i18n",
      "task_predecessor",
      "bpmn_model",
      "bpmn_element",
      "task_system_mapping",
      "task_data_table_link",
      "task_role_mapping",
      "task_interface_mapping",
      "task_kpi_mapping",
      "task_risk_mapping",
      "task_control_mapping",
      "task_document_mapping",
      "document",
      "approval_request",
      "approval_history",
      "organization",
      "users",
      "role",
      "kpi",
      "risk",
      "control",
      "external_table_cache",
    ];

    for (const table of reseedTargets) {
      await tx(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
    }
  });
};

const main = async (): Promise<void> => {
  console.log("운영 데이터 초기화 시작");
  console.log("유지 대상: common_code, application_system, system_module, system_screen, error_code, document_type");

  await countRows("삭제 전");

  await resetOperationalData();

  console.log("\n초기화 완료");
  await countRows("삭제 후 (0이어야 함)");
};

main()
  .catch((err) => {
    console.error("\n초기화 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
