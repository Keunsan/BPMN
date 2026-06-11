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
export const useCommonCodeGroup = (groupId: number) =>
  useQuery({
    queryKey: commonCodeKeys.group(groupId),
    queryFn: () =>
      apiGet<CommonCodeGroupDto>(`/api/admin/codes/groups/${groupId}`),
    enabled: groupId > 0,
  });

/** MINOR 코드 목록 조회 */
export const useCommonCodeItems = (
  groupId: number,
  filters: CommonCodeItemListFilters = {},
) =>
  useQuery({
    queryKey: commonCodeKeys.itemList(groupId, filters),
    queryFn: () =>
      apiGet<CommonCodeItemDto[]>(
        `/api/admin/codes/groups/${groupId}/items${buildQueryString(filters)}`,
      ),
    enabled: groupId > 0,
  });

/** MINOR 코드 상세 조회 */
export const useCommonCodeItem = (codeId: number) =>
  useQuery({
    queryKey: commonCodeKeys.item(codeId),
    queryFn: () =>
      apiGet<CommonCodeItemDto>(`/api/admin/codes/items/${codeId}`),
    enabled: codeId > 0,
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
export const useUpdateCommonCodeGroup = (groupId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UpsertCommonCodeGroupDto>) =>
      apiPut<CommonCodeGroupDto>(`/api/admin/codes/groups/${groupId}`, data),
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
    mutationFn: (groupId: number) =>
      apiDelete<{ groupId: number }>(`/api/admin/codes/groups/${groupId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** MINOR 코드 생성 */
export const useCreateCommonCodeItem = (groupId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertCommonCodeItemDto) =>
      apiPost<CommonCodeItemDto>(
        `/api/admin/codes/groups/${groupId}/items`,
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
export const useUpdateCommonCodeItem = (codeId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<UpsertCommonCodeItemDto>) =>
      apiPut<CommonCodeItemDto>(`/api/admin/codes/items/${codeId}`, data),
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
    mutationFn: (codeId: number) =>
      apiDelete<{ codeId: number }>(`/api/admin/codes/items/${codeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commonCodeKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};
