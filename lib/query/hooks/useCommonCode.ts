"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { commonCodeKeys } from "@/lib/query/keys";
import type {
  CommonCodeGroupDto,
  CommonCodeGroupListFilters,
  CommonCodeItemDto,
  CommonCodeItemKey,
  CommonCodeItemListFilters,
  CommonCodeLookupItem,
  UpsertCommonCodeGroupDto,
  UpsertCommonCodeItemDto,
} from "@/types/common-code";

const buildQueryString = (filters: Record<string, string | boolean | undefined>) => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

const encodePath = (value: string) => encodeURIComponent(value);

/** MAJOR 코드 그룹 목록 조회 */
export const useCommonCodeGroups = (filters: CommonCodeGroupListFilters = {}) =>
  useQuery({
    queryKey: commonCodeKeys.groupList(filters),
    queryFn: () =>
      apiGet<CommonCodeGroupDto[]>(
        `/api/admin/codes/groups${buildQueryString(filters)}`,
      ),
  });

/** MAJOR 코드 그룹 상세 조회 */
export const useCommonCodeGroup = (groupCode: string) =>
  useQuery({
    queryKey: commonCodeKeys.group(groupCode),
    queryFn: () =>
      apiGet<CommonCodeGroupDto>(
        `/api/admin/codes/groups/${encodePath(groupCode)}`,
      ),
    enabled: Boolean(groupCode),
  });

/** MINOR 코드 목록 조회 */
export const useCommonCodeItems = (
  groupCode: string,
  filters: CommonCodeItemListFilters = {},
) =>
  useQuery({
    queryKey: commonCodeKeys.itemList(groupCode, filters),
    queryFn: () =>
      apiGet<CommonCodeItemDto[]>(
        `/api/admin/codes/groups/${encodePath(groupCode)}/items${buildQueryString(filters)}`,
      ),
    enabled: Boolean(groupCode),
  });

/** MINOR 코드 상세 조회 */
export const useCommonCodeItem = (key: CommonCodeItemKey) =>
  useQuery({
    queryKey: commonCodeKeys.item(key.groupCode, key.code),
    queryFn: () =>
      apiGet<CommonCodeItemDto>(
        `/api/admin/codes/groups/${encodePath(key.groupCode)}/items/${encodePath(key.code)}`,
      ),
    enabled: Boolean(key.groupCode) && Boolean(key.code),
  });

/** 공통코드 lookup 조회 */
export const useCommonCodeLookup = (groupCode: string) =>
  useQuery({
    queryKey: commonCodeKeys.lookup(groupCode),
    queryFn: () =>
      apiGet<CommonCodeLookupItem[]>(
        `/api/admin/codes/lookup${buildQueryString({ groupCode })}`,
      ),
    enabled: Boolean(groupCode),
  });

/** MAJOR 코드 그룹 생성 */
export const useCreateCommonCodeGroup = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertCommonCodeGroupDto) =>
      apiPost<CommonCodeGroupDto>("/api/admin/codes/groups", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** MAJOR 코드 그룹 수정 */
export const useUpdateCommonCodeGroup = (groupCode: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UpsertCommonCodeGroupDto>) =>
      apiPut<CommonCodeGroupDto>(
        `/api/admin/codes/groups/${encodePath(groupCode)}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** MAJOR 코드 그룹 비활성화 */
export const useDeactivateCommonCodeGroup = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (groupCode: string) =>
      apiDelete<{ groupCode: string }>(
        `/api/admin/codes/groups/${encodePath(groupCode)}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** MINOR 코드 생성 */
export const useCreateCommonCodeItem = (groupCode: string) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertCommonCodeItemDto) =>
      apiPost<CommonCodeItemDto>(
        `/api/admin/codes/groups/${encodePath(groupCode)}/items`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** MINOR 코드 수정 */
export const useUpdateCommonCodeItem = (key: CommonCodeItemKey) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UpsertCommonCodeItemDto>) =>
      apiPut<CommonCodeItemDto>(
        `/api/admin/codes/groups/${encodePath(key.groupCode)}/items/${encodePath(key.code)}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** MINOR 코드 비활성화 */
export const useDeactivateCommonCodeItem = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (key: CommonCodeItemKey) =>
      apiDelete<{ groupCode: string; code: string }>(
        `/api/admin/codes/groups/${encodePath(key.groupCode)}/items/${encodePath(key.code)}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};
