import type sql from "mssql";

/** MSSQL 연결 설정 (환경변수 기반) */
export function getDbConfig(): sql.config {
  const host = process.env.MSSQL_HOST;
  const database = process.env.MSSQL_DATABASE;
  const user = process.env.MSSQL_USER;
  const password = process.env.MSSQL_PASSWORD;

  if (!host || !database || !user || !password) {
    throw new Error(
      "MSSQL 환경변수가 설정되지 않았습니다. MSSQL_HOST, MSSQL_DATABASE, MSSQL_USER, MSSQL_PASSWORD를 확인하세요.",
    );
  }

  const port = Number(process.env.MSSQL_PORT ?? "1433");
  const encrypt = process.env.MSSQL_ENCRYPT !== "false";
  const trustServerCertificate =
    process.env.MSSQL_TRUST_SERVER_CERTIFICATE === "true";

  return {
    server: host,
    port,
    database,
    user,
    password,
    pool: {
      max: Number(process.env.MSSQL_POOL_MAX ?? "10"),
      min: Number(process.env.MSSQL_POOL_MIN ?? "0"),
      idleTimeoutMillis: Number(process.env.MSSQL_POOL_IDLE_MS ?? "30000"),
    },
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true,
    },
    connectionTimeout: Number(process.env.MSSQL_CONNECTION_TIMEOUT ?? "15000"),
    requestTimeout: Number(process.env.MSSQL_REQUEST_TIMEOUT ?? "30000"),
  };
}
