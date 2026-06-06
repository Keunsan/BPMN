/**
 * 전체 프로세스 상태를 APPROVED로 일괄 변경
 */
import { config as loadEnv } from "dotenv";

import { closePool, query } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

const main = async (): Promise<void> => {
  const before = await query<{ status: string; cnt: number }>(
    `SELECT status, COUNT(*) AS cnt FROM process_node GROUP BY status ORDER BY status`,
  );
  console.log("변경 전:", before);

  const updated = await query<{ node_id: number; code: string; name: string; status: string }>(
    `UPDATE process_node
     SET status = 'APPROVED', updated_at = GETDATE()
     OUTPUT INSERTED.node_id, INSERTED.code, INSERTED.name, INSERTED.status
     WHERE status <> 'APPROVED'`,
  );

  console.log(`\n변경 완료 — ${updated.length}건 APPROVED로 업데이트:`);
  for (const n of updated) {
    console.log(`  [${n.code}] ${n.name}`);
  }

  const after = await query<{ status: string; cnt: number }>(
    `SELECT status, COUNT(*) AS cnt FROM process_node GROUP BY status ORDER BY status`,
  );
  console.log("\n변경 후:", after);
};

main()
  .catch((err) => {
    console.error("\n상태 변경 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
