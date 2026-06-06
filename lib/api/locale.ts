import type { NextRequest } from "next/server";

import {
  defaultLocale,
  isValidLocale,
  type Locale,
} from "@/lib/i18n/config";

/** Accept-Language 헤더에서 locale 추출 */
export const getLocaleFromRequest = (request: NextRequest): Locale => {
  const header = request.headers.get("Accept-Language");
  if (!header) {
    return defaultLocale;
  }

  const primary = header.split(",")[0]?.trim().split("-")[0];
  const full = header.split(",")[0]?.trim();

  if (full && isValidLocale(full)) {
    return full;
  }
  if (primary === "en") {
    return "en";
  }
  if (primary === "zh") {
    return "zh-TW";
  }
  return defaultLocale;
};

/** URL searchParams에서 페이지네이션 파라미터 추출 */
export const getPaginationParams = (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit") ?? "20")),
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};
