import "server-only";

import type { Locale } from "@/lib/i18n/config";
import type {
  CommonCodeGroup,
  CommonCodeGroupI18nMap,
  CommonCodeGroupListFilters,
  CommonCodeItem,
  CommonCodeItemI18nMap,
  CommonCodeItemKey,
  CommonCodeItemListFilters,
  CommonCodeLookupItem,
  UpsertCommonCodeGroupDto,
  UpsertCommonCodeItemDto,
} from "@/types/common-code";

import { query, queryOne, transaction, type QueryParams } from "../pool";

/** DB 행을 CommonCodeGroup으로 변환한다. */
const mapCommonCodeGroup = (row: Record<string, unknown>): CommonCodeGroup => ({
  groupCode: row.group_code as string,
  groupName: row.group_name as string,
  description: (row.description as string | null) ?? null,
  sortOrder: row.sort_order as number,
  isActive: Boolean(row.is_active),
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** DB 행을 CommonCodeItem으로 변환한다. */
const mapCommonCodeItem = (row: Record<string, unknown>): CommonCodeItem => ({
  groupCode: row.group_code as string,
  code: row.code as string,
  codeName: row.code_name as string,
  description: (row.description as string | null) ?? null,
  sortOrder: row.sort_order as number,
  isActive: Boolean(row.is_active),
  createdBy: (row.created_by as number | null) ?? null,
  createdAt: new Date(row.created_at as string),
  updatedBy: (row.updated_by as number | null) ?? null,
  updatedAt: row.updated_at ? new Date(row.updated_at as string) : null,
});

/** 그룹 i18n 행을 locale 맵으로 변환한다. */
const mapCommonCodeGroupI18n = (
  rows: Record<string, unknown>[],
): CommonCodeGroupI18nMap => {
  const map: CommonCodeGroupI18nMap = {};

  for (const row of rows) {
    const locale = row.locale as keyof CommonCodeGroupI18nMap;
    map[locale] = {
      groupName: (row.group_name as string | null) ?? null,
      description: (row.description as string | null) ?? null,
    };
  }

  return map;
};

/** 코드 i18n 행을 locale 맵으로 변환한다. */
const mapCommonCodeItemI18n = (
  rows: Record<string, unknown>[],
): CommonCodeItemI18nMap => {
  const map: CommonCodeItemI18nMap = {};

  for (const row of rows) {
    const locale = row.locale as keyof CommonCodeItemI18nMap;
    map[locale] = {
      codeName: (row.code_name as string | null) ?? null,
      description: (row.description as string | null) ?? null,
    };
  }

  return map;
};

/** 공통코드 그룹 목록을 조회한다. */
export const listCommonCodeGroups = async (
  locale: Locale,
  filters: CommonCodeGroupListFilters = {},
): Promise<
  Array<
    CommonCodeGroup & {
      displayName: string;
      itemCount: number;
    }
  >
> => {
  const conditions = ["1=1"];
  const params: QueryParams = { locale };

  if (filters.search) {
    conditions.push(
      "(ccg.group_code LIKE @search OR ccg.group_name LIKE @search OR COALESCE(ccgi.group_name, ccg.group_name) LIKE @search)",
    );
    params.search = `%${filters.search}%`;
  }

  if (filters.isActive !== undefined) {
    conditions.push("ccg.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       ccg.*,
       COALESCE(ccgi.group_name, ccg.group_name) AS display_name,
       (
         SELECT COUNT(*)
         FROM common_code cc
         WHERE cc.group_code = ccg.group_code
       ) AS item_count
     FROM common_code_group ccg
     LEFT JOIN common_code_group_i18n ccgi
       ON ccg.group_code = ccgi.group_code AND ccgi.locale = @locale
     WHERE ${conditions.join(" AND ")}
     ORDER BY ccg.sort_order, ccg.group_code`,
    params,
  );

  return rows.map((row) => ({
    ...mapCommonCodeGroup(row),
    displayName: row.display_name as string,
    itemCount: row.item_count as number,
  }));
};

/** 공통코드 그룹 코드로 조회한다. */
export const findCommonCodeGroupByCode = async (
  groupCode: string,
): Promise<CommonCodeGroup | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM common_code_group WHERE group_code = @groupCode`,
    { groupCode },
  );

  return row ? mapCommonCodeGroup(row) : null;
};

/** 그룹 i18n을 조회한다. */
export const findCommonCodeGroupI18n = async (
  groupCode: string,
): Promise<CommonCodeGroupI18nMap> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT locale, group_name, description
     FROM common_code_group_i18n
     WHERE group_code = @groupCode`,
    { groupCode },
  );

  return mapCommonCodeGroupI18n(rows);
};

/** 그룹 코드 중복 여부를 확인한다. */
export const existsCommonCodeGroupCode = async (
  groupCode: string,
  excludeGroupCode?: string,
): Promise<boolean> => {
  const params: QueryParams = { groupCode };
  let sql = `SELECT 1 AS found FROM common_code_group WHERE group_code = @groupCode`;

  if (excludeGroupCode) {
    sql += " AND group_code <> @excludeGroupCode";
    params.excludeGroupCode = excludeGroupCode;
  }

  const row = await queryOne<Record<string, unknown>>(sql, params);
  return Boolean(row);
};

/** 공통코드 그룹을 생성한다. */
export const createCommonCodeGroup = async (
  input: UpsertCommonCodeGroupDto,
  userId: number | null,
): Promise<CommonCodeGroup> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO common_code_group (
       group_code, group_name, description, sort_order, is_active, created_by
     )
     OUTPUT INSERTED.*
     VALUES (
       @groupCode, @groupName, @description, @sortOrder, @isActive, @createdBy
     )`,
    {
      groupCode: input.groupCode,
      groupName: input.groupName ?? input.groupCode,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive === false ? 0 : 1,
      createdBy: userId,
    },
  );

  if (!row) {
    throw new Error("Failed to create common code group");
  }

  return mapCommonCodeGroup(row);
};

/** 공통코드 그룹을 수정한다. */
export const updateCommonCodeGroup = async (
  groupCode: string,
  input: Partial<UpsertCommonCodeGroupDto>,
  userId: number | null,
): Promise<CommonCodeGroup | null> => {
  const sets: string[] = ["updated_at = GETDATE()", "updated_by = @updatedBy"];
  const params: QueryParams = { groupCode, updatedBy: userId };

  if (input.groupCode !== undefined) {
    sets.push("group_code = @newGroupCode");
    params.newGroupCode = input.groupCode;
  }
  if (input.groupName !== undefined) {
    sets.push("group_name = @groupName");
    params.groupName = input.groupName;
  }
  if (input.description !== undefined) {
    sets.push("description = @description");
    params.description = input.description;
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = @sortOrder");
    params.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    sets.push("is_active = @isActive");
    params.isActive = input.isActive ? 1 : 0;
  }

  const row = await queryOne<Record<string, unknown>>(
    `UPDATE common_code_group
     SET ${sets.join(", ")}
     OUTPUT INSERTED.*
     WHERE group_code = @groupCode`,
    params,
  );

  return row ? mapCommonCodeGroup(row) : null;
};

/** 그룹 i18n을 upsert한다. */
export const upsertCommonCodeGroupI18n = async (
  groupCode: string,
  i18n: CommonCodeGroupI18nMap,
): Promise<void> => {
  for (const [locale, value] of Object.entries(i18n)) {
    if (!value?.groupName?.trim()) {
      continue;
    }

    await queryOne(
      `MERGE common_code_group_i18n AS target
       USING (SELECT @groupCode AS group_code, @locale AS locale) AS source
       ON target.group_code = source.group_code AND target.locale = source.locale
       WHEN MATCHED THEN
         UPDATE SET group_name = @groupName, description = @description
       WHEN NOT MATCHED THEN
         INSERT (group_code, locale, group_name, description)
         VALUES (@groupCode, @locale, @groupName, @description);`,
      {
        groupCode,
        locale,
        groupName: value.groupName,
        description: value.description ?? null,
      },
    );
  }
};

/** 그룹 비활성화 시 하위 코드도 함께 비활성화한다. */
export const deactivateCommonCodeGroupWithItems = async (
  groupCode: string,
  userId: number | null,
): Promise<void> => {
  await transaction(async (txRequest) => {
    await txRequest(
      `UPDATE common_code_group
       SET is_active = 0, updated_at = GETDATE(), updated_by = @updatedBy
       WHERE group_code = @groupCode`,
      { groupCode, updatedBy: userId },
    );

    await txRequest(
      `UPDATE common_code
       SET is_active = 0, updated_at = GETDATE(), updated_by = @updatedBy
       WHERE group_code = @groupCode`,
      { groupCode, updatedBy: userId },
    );
  });
};

/** 그룹별 공통코드 목록을 조회한다. */
export const listCommonCodeItems = async (
  groupCode: string,
  locale: Locale,
  filters: CommonCodeItemListFilters = {},
): Promise<
  Array<
    CommonCodeItem & {
      displayName: string;
    }
  >
> => {
  const conditions = ["cc.group_code = @groupCode"];
  const params: QueryParams = { groupCode, locale };

  if (filters.search) {
    conditions.push(
      "(cc.code LIKE @search OR cc.code_name LIKE @search OR COALESCE(cci.code_name, cc.code_name) LIKE @search)",
    );
    params.search = `%${filters.search}%`;
  }

  if (filters.isActive !== undefined) {
    conditions.push("cc.is_active = @isActive");
    params.isActive = filters.isActive ? 1 : 0;
  }

  const rows = await query<Record<string, unknown>>(
    `SELECT
       cc.*,
       COALESCE(cci.code_name, cc.code_name) AS display_name
     FROM common_code cc
     LEFT JOIN common_code_i18n cci
       ON cc.group_code = cci.group_code
      AND cc.code = cci.code
      AND cci.locale = @locale
     WHERE ${conditions.join(" AND ")}
     ORDER BY cc.sort_order, cc.code`,
    params,
  );

  return rows.map((row) => ({
    ...mapCommonCodeItem(row),
    displayName: row.display_name as string,
  }));
};

/** 공통코드 상세를 조회한다. */
export const findCommonCodeItem = async (
  key: CommonCodeItemKey,
): Promise<CommonCodeItem | null> => {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM common_code
     WHERE group_code = @groupCode AND code = @code`,
    { groupCode: key.groupCode, code: key.code },
  );

  return row ? mapCommonCodeItem(row) : null;
};

/** 코드 i18n을 조회한다. */
export const findCommonCodeItemI18n = async (
  key: CommonCodeItemKey,
): Promise<CommonCodeItemI18nMap> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT locale, code_name, description
     FROM common_code_i18n
     WHERE group_code = @groupCode AND code = @code`,
    { groupCode: key.groupCode, code: key.code },
  );

  return mapCommonCodeItemI18n(rows);
};

/** 코드 중복 여부를 확인한다. */
export const existsCommonCodeItemCode = async (
  groupCode: string,
  code: string,
  excludeCode?: string,
): Promise<boolean> => {
  const params: QueryParams = { groupCode, code };
  let sql = `SELECT 1 AS found FROM common_code WHERE group_code = @groupCode AND code = @code`;

  if (excludeCode) {
    sql += " AND code <> @excludeCode";
    params.excludeCode = excludeCode;
  }

  const row = await queryOne<Record<string, unknown>>(sql, params);
  return Boolean(row);
};

/** 공통코드를 생성한다. */
export const createCommonCodeItem = async (
  input: UpsertCommonCodeItemDto,
  userId: number | null,
): Promise<CommonCodeItem> => {
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO common_code (
       group_code, code, code_name, description, sort_order, is_active, created_by
     )
     OUTPUT INSERTED.*
     VALUES (
       @groupCode, @code, @codeName, @description, @sortOrder, @isActive, @createdBy
     )`,
    {
      groupCode: input.groupCode,
      code: input.code,
      codeName: input.codeName ?? input.code,
      description: input.description ?? null,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive === false ? 0 : 1,
      createdBy: userId,
    },
  );

  if (!row) {
    throw new Error("Failed to create common code item");
  }

  return mapCommonCodeItem(row);
};

/** 공통코드를 수정한다. */
export const updateCommonCodeItem = async (
  key: CommonCodeItemKey,
  input: Partial<UpsertCommonCodeItemDto>,
  userId: number | null,
): Promise<CommonCodeItem | null> => {
  const sets: string[] = ["updated_at = GETDATE()", "updated_by = @updatedBy"];
  const params: QueryParams = {
    groupCode: key.groupCode,
    code: key.code,
    updatedBy: userId,
  };

  if (input.code !== undefined) {
    sets.push("code = @newCode");
    params.newCode = input.code;
  }
  if (input.codeName !== undefined) {
    sets.push("code_name = @codeName");
    params.codeName = input.codeName;
  }
  if (input.description !== undefined) {
    sets.push("description = @description");
    params.description = input.description;
  }
  if (input.sortOrder !== undefined) {
    sets.push("sort_order = @sortOrder");
    params.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    sets.push("is_active = @isActive");
    params.isActive = input.isActive ? 1 : 0;
  }

  const row = await queryOne<Record<string, unknown>>(
    `UPDATE common_code
     SET ${sets.join(", ")}
     OUTPUT INSERTED.*
     WHERE group_code = @groupCode AND code = @code`,
    params,
  );

  return row ? mapCommonCodeItem(row) : null;
};

/** 코드 i18n을 upsert한다. */
export const upsertCommonCodeItemI18n = async (
  key: CommonCodeItemKey,
  i18n: CommonCodeItemI18nMap,
): Promise<void> => {
  for (const [locale, value] of Object.entries(i18n)) {
    if (!value?.codeName?.trim()) {
      continue;
    }

    await queryOne(
      `MERGE common_code_i18n AS target
       USING (
         SELECT @groupCode AS group_code, @code AS code, @locale AS locale
       ) AS source
       ON target.group_code = source.group_code
        AND target.code = source.code
        AND target.locale = source.locale
       WHEN MATCHED THEN
         UPDATE SET code_name = @codeName, description = @description
       WHEN NOT MATCHED THEN
         INSERT (group_code, code, locale, code_name, description)
         VALUES (@groupCode, @code, @locale, @codeName, @description);`,
      {
        groupCode: key.groupCode,
        code: key.code,
        locale,
        codeName: value.codeName,
        description: value.description ?? null,
      },
    );
  }
};

/** 공통코드를 비활성화한다. */
export const deactivateCommonCodeItem = async (
  key: CommonCodeItemKey,
  userId: number | null,
): Promise<void> => {
  await queryOne(
    `UPDATE common_code
     SET is_active = 0, updated_at = GETDATE(), updated_by = @updatedBy
     WHERE group_code = @groupCode AND code = @code`,
    { groupCode: key.groupCode, code: key.code, updatedBy: userId },
  );
};

/** 그룹 코드로 활성 공통코드 lookup 목록을 조회한다. */
export const lookupCommonCodesByGroupCode = async (
  groupCode: string,
  locale: Locale,
): Promise<CommonCodeLookupItem[]> => {
  const rows = await query<Record<string, unknown>>(
    `SELECT
       cc.code,
       cc.code_name,
       COALESCE(cci.code_name, cc.code_name) AS display_name,
       cc.sort_order
     FROM common_code cc
     INNER JOIN common_code_group ccg ON cc.group_code = ccg.group_code
     LEFT JOIN common_code_i18n cci
       ON cc.group_code = cci.group_code
      AND cc.code = cci.code
      AND cci.locale = @locale
     WHERE ccg.group_code = @groupCode
       AND ccg.is_active = 1
       AND cc.is_active = 1
     ORDER BY cc.sort_order, cc.code`,
    { groupCode, locale },
  );

  return rows.map((row) => ({
    code: row.code as string,
    codeName: row.code_name as string,
    displayName: row.display_name as string,
    sortOrder: row.sort_order as number,
  }));
};
