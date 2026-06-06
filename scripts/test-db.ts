/**
 * MSSQL 연결 테스트 스크립트
 */
import { config as loadEnv } from "dotenv";

import { closePool, testConnection } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

async function main(): Promise<void> {
  console.log("MSSQL 연결 테스트 중...\n");

  const result = await testConnection();

  console.log("연결 성공!");
  console.log(`서버 버전: ${result.version.split("\n")[0]}`);
}

main()
  .catch((err) => {
    console.error("\n연결 실패:", err.message ?? err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
