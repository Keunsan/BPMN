/**
 * MSSQL 마이그레이션 실행 스크립트
 * scripts/migrations/*.sql 파일을 순서대로 실행합니다.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { config as loadEnv } from "dotenv";

import { closePool, getPool } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

const MIGRATIONS_DIR = join(process.cwd(), "scripts", "migrations");

/** GO 배치 구분자로 SQL 파일 분할 */
function splitBatches(sql: string): string[] {
  return sql
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

async function ensureMigrationTable(): Promise<void> {
  const pool = await getPool();
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'schema_migration')
    BEGIN
      CREATE TABLE schema_migration (
        migration_id    BIGINT IDENTITY(1,1) PRIMARY KEY,
        filename        VARCHAR(200) NOT NULL UNIQUE,
        executed_at     DATETIME DEFAULT GETDATE()
      );
    END
  `);
}

async function isMigrationApplied(filename: string): Promise<boolean> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("filename", filename)
    .query(
      "SELECT 1 AS applied FROM schema_migration WHERE filename = @filename",
    );
  return (result.recordset?.length ?? 0) > 0;
}

async function recordMigration(filename: string): Promise<void> {
  const pool = await getPool();
  await pool
    .request()
    .input("filename", filename)
    .query("INSERT INTO schema_migration (filename) VALUES (@filename)");
}

async function runMigration(filename: string, sqlContent: string): Promise<void> {
  const pool = await getPool();
  const batches = splitBatches(sqlContent);

  for (const batch of batches) {
    await pool.request().query(batch);
  }

  await recordMigration(filename);
  console.log(`  ✓ ${filename}`);
}

async function main(): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("실행할 마이그레이션 파일이 없습니다.");
    return;
  }

  console.log(`MSSQL 마이그레이션 시작 (${files.length}개 파일)\n`);

  await ensureMigrationTable();

  let applied = 0;
  let skipped = 0;

  for (const filename of files) {
    if (await isMigrationApplied(filename)) {
      console.log(`  - ${filename} (이미 적용됨)`);
      skipped++;
      continue;
    }

    const sqlContent = readFileSync(join(MIGRATIONS_DIR, filename), "utf-8");
    await runMigration(filename, sqlContent);
    applied++;
  }

  console.log(`\n완료: ${applied}개 적용, ${skipped}개 건너뜀`);
}

main()
  .catch((err) => {
    console.error("\n마이그레이션 실패:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
