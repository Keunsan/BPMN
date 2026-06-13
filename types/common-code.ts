import type { Locale } from "@/lib/i18n/config";
import type { AuditFields } from "@/types/database";

/** 공통코드 그룹(MAJOR) i18n 맵 */
export type CommonCodeGroupI18nMap = Partial<
  Record<Locale, { groupName: string | null; description: string | null }>
>;

/** 공통코드(MINOR) i18n 맵 */
export type CommonCodeItemI18nMap = Partial<
  Record<Locale, { codeName: string | null; description: string | null }>
>;

/** 공통코드 그룹 엔티티 */
export interface CommonCodeGroup extends AuditFields {
  groupCode: string;
  groupName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** 공통코드 엔티티 */
export interface CommonCodeItem extends AuditFields {
  groupCode: string;
  code: string;
  codeName: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** 공통코드 그룹 DTO */
export interface CommonCodeGroupDto extends CommonCodeGroup {
  displayName: string;
  itemCount: number;
  i18n?: CommonCodeGroupI18nMap;
}

/** 공통코드 DTO */
export interface CommonCodeItemDto extends CommonCodeItem {
  displayName: string;
  i18n?: CommonCodeItemI18nMap;
}

/** 공통코드 조회용 DTO */
export interface CommonCodeLookupItem {
  code: string;
  codeName: string;
  displayName: string;
  sortOrder: number;
}

/** 그룹 목록 필터 */
export type CommonCodeGroupListFilters = {
  search?: string;
  isActive?: boolean;
};

/** 코드 목록 필터 */
export type CommonCodeItemListFilters = {
  search?: string;
  isActive?: boolean;
};

/** 그룹 생성/수정 DTO */
export type UpsertCommonCodeGroupDto = {
  groupCode: string;
  groupName?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  i18n?: CommonCodeGroupI18nMap;
};

/** 코드 생성/수정 DTO */
export type UpsertCommonCodeItemDto = {
  groupCode: string;
  code: string;
  codeName?: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  i18n?: CommonCodeItemI18nMap;
};

/** 공통코드 식별 키 */
export type CommonCodeItemKey = {
  groupCode: string;
  code: string;
};
