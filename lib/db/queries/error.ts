import "server-only";

import type { Locale } from "@/lib/i18n/config";

import { queryOne } from "../pool";

/** DB에서 에러 코드별 다국어 메시지 조회 */
export async function findErrorMessage(
  code: string,
  locale: Locale,
): Promise<string | null> {
  const row = await queryOne<{ message: string }>(
    `SELECT i.message
     FROM error_code c
     INNER JOIN error_code_i18n i ON c.code_id = i.code_id
     WHERE c.error_code = @code AND i.locale = @locale AND c.is_active = 1`,
    { code, locale },
  );

  return row?.message ?? null;
}
