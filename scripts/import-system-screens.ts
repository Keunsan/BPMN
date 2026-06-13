/**
 * 프로그램/메뉴 엑셀 → system_screen 일괄 import
 * 유니크: 법인 + 사업부 + IT시스템(application_system) + 메뉴ID
 */
import { join } from "node:path";

import { config as loadEnv } from "dotenv";
import XLSX from "xlsx";

import { closePool, execute, queryOne } from "../lib/db/pool";

loadEnv({ path: ".env.local" });

type ExcelRow = Record<string, string | number>;

const DEFAULT_FILE = join(process.cwd(), "docs", "프로그램메뉴마이그레이션.xlsx");
const BATCH_SIZE = 100;

const normalizeCode = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase();

const normalizeText = (value: unknown): string => String(value ?? "").trim();

const parseActive = (value: unknown): boolean => {
  const normalized = normalizeText(value).toUpperCase();
  return normalized !== "N" && normalized !== "0" && normalized !== "FALSE";
};

const upsertModuleCode = async (
  moduleCode: string,
  sortOrder: number,
): Promise<void> => {
  await execute(
    `IF NOT EXISTS (
       SELECT 1 FROM common_code
       WHERE group_code = 'MODULE_CD' AND code = @moduleCode
     )
     BEGIN
       INSERT INTO common_code (group_code, code, code_name, sort_order, is_active)
       VALUES ('MODULE_CD', @moduleCode, @moduleCode, @sortOrder, 1);
     END`,
    { moduleCode, sortOrder },
  );
};

const findSystemId = async (
  systemCode: string,
  companyCode: string,
  businessUnitCode: string,
): Promise<number | null> => {
  const row = await queryOne<{ system_id: number }>(
    `SELECT system_id
     FROM application_system
     WHERE system_code = @systemCode
       AND company_code = @companyCode
       AND business_unit_code = @businessUnitCode`,
    { systemCode, companyCode, businessUnitCode },
  );

  return row?.system_id ?? null;
};

const upsertScreen = async (input: {
  systemId: number;
  moduleCode: string;
  menuId: string;
  screenName: string;
  menuPath: string | null;
  isActive: boolean;
}): Promise<"inserted" | "updated"> => {
  const existing = await queryOne<{ screen_id: number }>(
    `SELECT screen_id
     FROM system_screen
     WHERE system_id = @systemId AND menu_id = @menuId`,
    { systemId: input.systemId, menuId: input.menuId },
  );

  if (existing?.screen_id) {
    await execute(
      `UPDATE system_screen
       SET module_code = @moduleCode,
           screen_code = @menuId,
           screen_name = @screenName,
           transaction_code = @menuId,
           menu_path = @menuPath,
           is_active = @isActive
       WHERE screen_id = @screenId`,
      {
        screenId: existing.screen_id,
        moduleCode: input.moduleCode,
        menuId: input.menuId,
        screenName: input.screenName,
        menuPath: input.menuPath,
        isActive: input.isActive ? 1 : 0,
      },
    );
    return "updated";
  }

  await execute(
    `INSERT INTO system_screen (
       system_id, module_code, menu_id, screen_code, screen_name,
       transaction_code, menu_path, is_active
     )
     VALUES (
       @systemId, @moduleCode, @menuId, @menuId, @screenName,
       @menuId, @menuPath, @isActive
     )`,
    {
      systemId: input.systemId,
      moduleCode: input.moduleCode,
      menuId: input.menuId,
      screenName: input.screenName,
      menuPath: input.menuPath,
      isActive: input.isActive ? 1 : 0,
    },
  );

  return "inserted";
};

const main = async (): Promise<void> => {
  const filePath = process.argv[2] ?? DEFAULT_FILE;
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("엑셀 시트를 찾을 수 없습니다.");
  }

  const rows = XLSX.utils.sheet_to_json<ExcelRow>(workbook.Sheets[sheetName], {
    defval: "",
  });

  console.log(`파일: ${filePath}`);
  console.log(`시트: ${sheetName}, 행 수: ${rows.length}`);

  const moduleCodes = [
    ...new Set(rows.map((row) => normalizeCode(row["업무모듈"])).filter(Boolean)),
  ].sort();

  for (const [index, moduleCode] of moduleCodes.entries()) {
    await upsertModuleCode(moduleCode, (index + 1) * 10);
  }
  console.log(`MODULE_CD upsert: ${moduleCodes.length}건`);

  const missingSystems = new Set<string>();
  const systemIdCache = new Map<string, number | null>();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  const resolveSystemId = async (
    systemCode: string,
    companyCode: string,
    businessUnitCode: string,
  ): Promise<number | null> => {
    const cacheKey = `${companyCode}/${businessUnitCode}/${systemCode}`;
    if (systemIdCache.has(cacheKey)) {
      return systemIdCache.get(cacheKey) ?? null;
    }

    const systemId = await findSystemId(systemCode, companyCode, businessUnitCode);
    systemIdCache.set(cacheKey, systemId);
    return systemId;
  };

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);

    for (const row of batch) {
      const companyCode = normalizeCode(row["법인구분"]);
      const businessUnitCode = normalizeCode(row["사업부"]);
      const systemCode = normalizeCode(row["IT시스템"]);
      const moduleCode = normalizeCode(row["업무모듈"]);
      const menuId = normalizeCode(row["메뉴ID"]);
      const screenName = normalizeText(row["메뉴명"]);

      if (
        !companyCode ||
        !businessUnitCode ||
        !systemCode ||
        !moduleCode ||
        !menuId ||
        !screenName
      ) {
        skipped += 1;
        continue;
      }

      const systemId = await resolveSystemId(
        systemCode,
        companyCode,
        businessUnitCode,
      );

      if (!systemId) {
        missingSystems.add(`${companyCode}/${businessUnitCode}/${systemCode}`);
        skipped += 1;
        continue;
      }

      const result = await upsertScreen({
        systemId,
        moduleCode,
        menuId,
        screenName,
        menuPath: normalizeText(row["메뉴경로"]) || null,
        isActive: parseActive(row["사용여부"]),
      });

      if (result === "updated") {
        updated += 1;
      } else {
        inserted += 1;
      }
    }

    console.log(`진행: ${Math.min(offset + BATCH_SIZE, rows.length)} / ${rows.length}`);
  }

  console.log("--- 결과 ---");
  console.log(`신규: ${inserted}`);
  console.log(`갱신: ${updated}`);
  console.log(`건너뜀: ${skipped}`);

  if (missingSystems.size > 0) {
    console.log("등록되지 않은 시스템(법인/사업부/IT시스템):");
    for (const key of [...missingSystems].sort()) {
      console.log(`  - ${key}`);
    }
  }
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
