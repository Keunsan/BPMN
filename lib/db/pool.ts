import sql from "mssql";

import { getDbConfig } from "./config";

/** 쿼리 파라미터 타입 */
export type QueryParams = Record<
  string,
  string | number | boolean | Date | null | undefined | Buffer
>;

declare global {
  var __pamsMssqlPool: sql.ConnectionPool | undefined;
}

let poolPromise: Promise<sql.ConnectionPool> | null = null;

/** 커넥션 풀 반환 (개발 HMR 시 싱글톤 유지) */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (poolPromise) {
    return poolPromise;
  }

  poolPromise = (async () => {
    if (global.__pamsMssqlPool?.connected) {
      return global.__pamsMssqlPool;
    }

    const pool = new sql.ConnectionPool(getDbConfig());
    pool.on("error", (err) => {
      console.error("[MSSQL] Pool error:", err);
      global.__pamsMssqlPool = undefined;
      poolPromise = null;
    });

    await pool.connect();
    global.__pamsMssqlPool = pool;
    return pool;
  })();

  return poolPromise;
}

/** Named parameter를 mssql Request에 바인딩 */
function bindParams(request: sql.Request, params?: QueryParams): sql.Request {
  if (!params) {
    return request;
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    // NVARCHAR 기본 길이(4000) 초과 시 BPMN XML 등이 잘려 좌표 정보가 유실됨
    if (typeof value === "string" && value.length > 2000) {
      request.input(key, sql.NVarChar(sql.MAX), value);
    } else {
      request.input(key, value);
    }
  }

  return request;
}

/** SELECT 등 다중 행 조회 */
export async function query<T extends Record<string, unknown>>(
  queryText: string,
  params?: QueryParams,
): Promise<T[]> {
  const pool = await getPool();
  const request = bindParams(pool.request(), params);
  const result = await request.query<T>(queryText);
  return result.recordset ?? [];
}

/** 단일 행 조회 */
export async function queryOne<T extends Record<string, unknown>>(
  queryText: string,
  params?: QueryParams,
): Promise<T | null> {
  const rows = await query<T>(queryText, params);
  return rows[0] ?? null;
}

/** INSERT/UPDATE/DELETE 실행 */
export async function execute(
  queryText: string,
  params?: QueryParams,
): Promise<sql.IResult<unknown>> {
  const pool = await getPool();
  const request = bindParams(pool.request(), params);
  return request.query(queryText);
}

/** 트랜잭션 실행 */
export async function transaction<T>(
  callback: (
    txRequest: (
      queryText: string,
      params?: QueryParams,
    ) => Promise<sql.IResult<unknown>>,
  ) => Promise<T>,
): Promise<T> {
  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  await tx.begin();

  const txRequest = async (
    queryText: string,
    params?: QueryParams,
  ): Promise<sql.IResult<unknown>> => {
    const request = bindParams(new sql.Request(tx), params);
    return request.query(queryText);
  };

  try {
    const result = await callback(txRequest);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

/** 연결 테스트 */
export async function testConnection(): Promise<{ ok: true; version: string }> {
  const row = await queryOne<{ version: string }>(
    "SELECT @@VERSION AS version",
  );

  if (!row) {
    throw new Error("MSSQL 연결 테스트 실패: 응답 없음");
  }

  return { ok: true, version: row.version };
}

/** 커넥션 풀 종료 (스크립트/테스트용) */
export async function closePool(): Promise<void> {
  if (global.__pamsMssqlPool) {
    await global.__pamsMssqlPool.close();
    global.__pamsMssqlPool = undefined;
  }
  poolPromise = null;
}

export { sql };
