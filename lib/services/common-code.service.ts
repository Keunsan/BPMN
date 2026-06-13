import "server-only";

import { ApiError } from "@/lib/api/error-handler";
import type { Locale } from "@/lib/i18n/config";
import * as commonCodeQueries from "@/lib/db/queries/common-code";
import type {
  CommonCodeGroupDto,
  CommonCodeGroupI18nMap,
  CommonCodeGroupListFilters,
  CommonCodeItemDto,
  CommonCodeItemI18nMap,
  CommonCodeItemKey,
  CommonCodeItemListFilters,
  CommonCodeLookupItem,
  UpsertCommonCodeGroupDto,
  UpsertCommonCodeItemDto,
} from "@/types/common-code";

const CODE_PATTERN = /^[A-Z0-9_]+$/;

/** 코드 문자열을 정규화한다. */
const normalizeCode = (value: string): string => value.trim().toUpperCase();

/** locale별 표시명을 resolve한다. */
const resolveDisplayName = (
  locale: Locale,
  baseName: string,
  i18n?: CommonCodeGroupI18nMap | CommonCodeItemI18nMap,
  i18nKey: "groupName" | "codeName" = "groupName",
): string => {
  const localized =
    i18nKey === "groupName"
      ? (i18n as CommonCodeGroupI18nMap | undefined)?.[locale]?.groupName
      : (i18n as CommonCodeItemI18nMap | undefined)?.[locale]?.codeName;

  return localized?.trim() || baseName;
};

/** 그룹 DTO에 i18n 기본값을 구성한다. */
const withKoGroupFallback = (
  dto: UpsertCommonCodeGroupDto,
): UpsertCommonCodeGroupDto => {
  const ko = dto.i18n?.ko;

  return {
    ...dto,
    groupCode: normalizeCode(dto.groupCode),
    groupName: ko?.groupName?.trim() || dto.groupName?.trim() || dto.groupCode,
    description: ko?.description ?? dto.description ?? null,
  };
};

/** 코드 DTO에 i18n 기본값을 구성한다. */
const withKoItemFallback = (
  dto: UpsertCommonCodeItemDto,
): UpsertCommonCodeItemDto => {
  const ko = dto.i18n?.ko;

  return {
    ...dto,
    code: normalizeCode(dto.code),
    codeName: ko?.codeName?.trim() || dto.codeName?.trim() || dto.code,
    description: ko?.description ?? dto.description ?? null,
  };
};

/** 그룹 i18n 맵을 구성한다. */
const buildGroupI18nMap = (
  dto: UpsertCommonCodeGroupDto,
): CommonCodeGroupI18nMap => ({
  ko: {
    groupName: dto.groupName ?? null,
    description: dto.description ?? null,
  },
  ...dto.i18n,
});

/** 코드 i18n 맵을 구성한다. */
const buildItemI18nMap = (
  dto: UpsertCommonCodeItemDto,
): CommonCodeItemI18nMap => ({
  ko: {
    codeName: dto.codeName ?? null,
    description: dto.description ?? null,
  },
  ...dto.i18n,
});

/** 그룹 코드 유효성을 검사한다. */
const assertGroupCode = (groupCode: string): void => {
  if (!groupCode.trim()) {
    throw new ApiError("E001", "Group code is required", 400, undefined, "groupCode");
  }

  const normalized = normalizeCode(groupCode);
  if (!CODE_PATTERN.test(normalized)) {
    throw new ApiError(
      "E001",
      "Group code must contain only uppercase letters, numbers, and underscores",
      400,
      undefined,
      "groupCode",
    );
  }
};

/** 상세 코드 유효성을 검사한다. */
const assertItemCode = (code: string): void => {
  if (!code.trim()) {
    throw new ApiError("E001", "Code is required", 400, undefined, "code");
  }

  const normalized = normalizeCode(code);
  if (!CODE_PATTERN.test(normalized)) {
    throw new ApiError(
      "E001",
      "Code must contain only uppercase letters, numbers, and underscores",
      400,
      undefined,
      "code",
    );
  }
};

/** 그룹 DTO를 API 응답 형태로 변환한다. */
const toGroupDto = (
  group: Awaited<ReturnType<typeof commonCodeQueries.findCommonCodeGroupByCode>>,
  locale: Locale,
  i18n: CommonCodeGroupI18nMap,
  itemCount = 0,
): CommonCodeGroupDto => {
  if (!group) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  return {
    ...group,
    displayName: resolveDisplayName(locale, group.groupName, i18n, "groupName"),
    itemCount,
    i18n,
  };
};

/** 코드 DTO를 API 응답 형태로 변환한다. */
const toItemDto = (
  item: Awaited<ReturnType<typeof commonCodeQueries.findCommonCodeItem>>,
  locale: Locale,
  i18n: CommonCodeItemI18nMap,
): CommonCodeItemDto => {
  if (!item) {
    throw new ApiError("E301", "Common code not found", 404);
  }

  return {
    ...item,
    displayName: resolveDisplayName(locale, item.codeName, i18n, "codeName"),
    i18n,
  };
};

/** 공통코드 그룹 목록을 조회한다. */
export const listCommonCodeGroups = async (
  locale: Locale,
  filters: CommonCodeGroupListFilters = {},
): Promise<CommonCodeGroupDto[]> => {
  const rows = await commonCodeQueries.listCommonCodeGroups(locale, filters);

  return rows.map((row) => ({
    ...row,
    i18n: undefined,
  }));
};

/** 공통코드 그룹 상세를 조회한다. */
export const getCommonCodeGroup = async (
  groupCode: string,
  locale: Locale,
): Promise<CommonCodeGroupDto> => {
  const normalized = normalizeCode(groupCode);
  const group = await commonCodeQueries.findCommonCodeGroupByCode(normalized);
  if (!group) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  const i18n = await commonCodeQueries.findCommonCodeGroupI18n(normalized);
  const items = await commonCodeQueries.listCommonCodeItems(normalized, locale);

  return toGroupDto(group, locale, i18n, items.length);
};

/** 공통코드 그룹을 생성한다. */
export const createCommonCodeGroup = async (
  dto: UpsertCommonCodeGroupDto,
  locale: Locale,
  userId: number,
): Promise<CommonCodeGroupDto> => {
  const normalized = withKoGroupFallback(dto);
  assertGroupCode(normalized.groupCode);

  if (!normalized.groupName?.trim()) {
    throw new ApiError("E001", "Group name is required", 400, undefined, "groupName");
  }

  if (await commonCodeQueries.existsCommonCodeGroupCode(normalized.groupCode)) {
    throw new ApiError("E304", "Duplicate code", 409, undefined, "groupCode");
  }

  const group = await commonCodeQueries.createCommonCodeGroup(normalized, userId);
  const i18n = buildGroupI18nMap(normalized);
  await commonCodeQueries.upsertCommonCodeGroupI18n(group.groupCode, i18n);

  return getCommonCodeGroup(group.groupCode, locale);
};

/** 공통코드 그룹을 수정한다. */
export const updateCommonCodeGroup = async (
  groupCode: string,
  dto: Partial<UpsertCommonCodeGroupDto>,
  locale: Locale,
  userId: number,
): Promise<CommonCodeGroupDto> => {
  const normalizedGroupCode = normalizeCode(groupCode);
  const existing = await commonCodeQueries.findCommonCodeGroupByCode(normalizedGroupCode);
  if (!existing) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  const normalized = dto.groupCode
    ? { ...dto, groupCode: normalizeCode(dto.groupCode) }
    : dto;

  if (normalized.groupCode) {
    assertGroupCode(normalized.groupCode);
    if (
      await commonCodeQueries.existsCommonCodeGroupCode(
        normalized.groupCode,
        normalizedGroupCode,
      )
    ) {
      throw new ApiError("E304", "Duplicate code", 409, undefined, "groupCode");
    }
  }

  if (dto.i18n?.ko && !dto.i18n.ko.groupName?.trim() && !dto.groupName?.trim()) {
    throw new ApiError("E001", "Group name is required", 400, undefined, "groupName");
  }

  const merged = withKoGroupFallback({
    groupCode: normalized.groupCode ?? existing.groupCode,
    groupName: normalized.groupName ?? dto.i18n?.ko?.groupName ?? existing.groupName,
    description:
      normalized.description ??
      dto.i18n?.ko?.description ??
      existing.description,
    sortOrder: normalized.sortOrder ?? existing.sortOrder,
    isActive: normalized.isActive ?? existing.isActive,
    i18n: dto.i18n,
  });

  const updated = await commonCodeQueries.updateCommonCodeGroup(
    normalizedGroupCode,
    merged,
    userId,
  );

  if (!updated) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  if (dto.i18n) {
    const i18n = buildGroupI18nMap(merged);
    await commonCodeQueries.upsertCommonCodeGroupI18n(updated.groupCode, i18n);
  }

  if (merged.isActive === false) {
    await commonCodeQueries.deactivateCommonCodeGroupWithItems(
      updated.groupCode,
      userId,
    );
  }

  return getCommonCodeGroup(updated.groupCode, locale);
};

/** 공통코드 그룹을 비활성화한다. */
export const deactivateCommonCodeGroup = async (
  groupCode: string,
  userId: number,
): Promise<void> => {
  const normalized = normalizeCode(groupCode);
  const existing = await commonCodeQueries.findCommonCodeGroupByCode(normalized);
  if (!existing) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  await commonCodeQueries.deactivateCommonCodeGroupWithItems(normalized, userId);
};

/** 그룹별 공통코드 목록을 조회한다. */
export const listCommonCodeItems = async (
  groupCode: string,
  locale: Locale,
  filters: CommonCodeItemListFilters = {},
): Promise<CommonCodeItemDto[]> => {
  const normalized = normalizeCode(groupCode);
  const group = await commonCodeQueries.findCommonCodeGroupByCode(normalized);
  if (!group) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  const rows = await commonCodeQueries.listCommonCodeItems(normalized, locale, filters);

  return rows.map((row) => ({
    ...row,
    i18n: undefined,
  }));
};

/** 공통코드 상세를 조회한다. */
export const getCommonCodeItem = async (
  key: CommonCodeItemKey,
  locale: Locale,
): Promise<CommonCodeItemDto> => {
  const normalized: CommonCodeItemKey = {
    groupCode: normalizeCode(key.groupCode),
    code: normalizeCode(key.code),
  };
  const item = await commonCodeQueries.findCommonCodeItem(normalized);
  if (!item) {
    throw new ApiError("E301", "Common code not found", 404);
  }

  const i18n = await commonCodeQueries.findCommonCodeItemI18n(normalized);

  return toItemDto(item, locale, i18n);
};

/** 공통코드를 생성한다. */
export const createCommonCodeItem = async (
  dto: UpsertCommonCodeItemDto,
  locale: Locale,
  userId: number,
): Promise<CommonCodeItemDto> => {
  const normalized = withKoItemFallback({
    ...dto,
    groupCode: normalizeCode(dto.groupCode),
  });
  assertItemCode(normalized.code);

  const group = await commonCodeQueries.findCommonCodeGroupByCode(normalized.groupCode);
  if (!group) {
    throw new ApiError("E301", "Common code group not found", 404, undefined, "groupCode");
  }

  if (!normalized.codeName?.trim()) {
    throw new ApiError("E001", "Code name is required", 400, undefined, "codeName");
  }

  if (
    await commonCodeQueries.existsCommonCodeItemCode(
      normalized.groupCode,
      normalized.code,
    )
  ) {
    throw new ApiError("E304", "Duplicate code", 409, undefined, "code");
  }

  const item = await commonCodeQueries.createCommonCodeItem(normalized, userId);
  const i18n = buildItemI18nMap(normalized);
  await commonCodeQueries.upsertCommonCodeItemI18n(
    { groupCode: item.groupCode, code: item.code },
    i18n,
  );

  return getCommonCodeItem(
    { groupCode: item.groupCode, code: item.code },
    locale,
  );
};

/** 공통코드를 수정한다. */
export const updateCommonCodeItem = async (
  key: CommonCodeItemKey,
  dto: Partial<UpsertCommonCodeItemDto>,
  locale: Locale,
  userId: number,
): Promise<CommonCodeItemDto> => {
  const normalizedKey: CommonCodeItemKey = {
    groupCode: normalizeCode(key.groupCode),
    code: normalizeCode(key.code),
  };
  const existing = await commonCodeQueries.findCommonCodeItem(normalizedKey);
  if (!existing) {
    throw new ApiError("E301", "Common code not found", 404);
  }

  const normalized = dto.code
    ? { ...dto, code: normalizeCode(dto.code) }
    : dto;

  if (normalized.code) {
    assertItemCode(normalized.code);
    if (
      await commonCodeQueries.existsCommonCodeItemCode(
        existing.groupCode,
        normalized.code,
        normalizedKey.code,
      )
    ) {
      throw new ApiError("E304", "Duplicate code", 409, undefined, "code");
    }
  }

  const merged = withKoItemFallback({
    groupCode: existing.groupCode,
    code: normalized.code ?? existing.code,
    codeName: normalized.codeName ?? dto.i18n?.ko?.codeName ?? existing.codeName,
    description:
      normalized.description ??
      dto.i18n?.ko?.description ??
      existing.description,
    sortOrder: normalized.sortOrder ?? existing.sortOrder,
    isActive: normalized.isActive ?? existing.isActive,
    i18n: dto.i18n,
  });

  const updated = await commonCodeQueries.updateCommonCodeItem(
    normalizedKey,
    merged,
    userId,
  );

  if (!updated) {
    throw new ApiError("E301", "Common code not found", 404);
  }

  if (dto.i18n) {
    const i18n = buildItemI18nMap(merged);
    await commonCodeQueries.upsertCommonCodeItemI18n(
      { groupCode: updated.groupCode, code: updated.code },
      i18n,
    );
  }

  return getCommonCodeItem(
    { groupCode: updated.groupCode, code: updated.code },
    locale,
  );
};

/** 공통코드를 비활성화한다. */
export const deactivateCommonCodeItem = async (
  key: CommonCodeItemKey,
  userId: number,
): Promise<void> => {
  const normalized: CommonCodeItemKey = {
    groupCode: normalizeCode(key.groupCode),
    code: normalizeCode(key.code),
  };
  const existing = await commonCodeQueries.findCommonCodeItem(normalized);
  if (!existing) {
    throw new ApiError("E301", "Common code not found", 404);
  }

  await commonCodeQueries.deactivateCommonCodeItem(normalized, userId);
};

/** 그룹 코드로 lookup 목록을 조회한다. */
export const lookupCommonCodes = async (
  groupCode: string,
  locale: Locale,
): Promise<CommonCodeLookupItem[]> => {
  const normalized = normalizeCode(groupCode);
  const group = await commonCodeQueries.findCommonCodeGroupByCode(normalized);

  if (!group) {
    throw new ApiError("E301", "Common code group not found", 404);
  }

  return commonCodeQueries.lookupCommonCodesByGroupCode(normalized, locale);
};
