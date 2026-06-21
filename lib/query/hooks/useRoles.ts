"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { roleKeys } from "@/lib/query/keys";
import type { RoleDto, RoleListFilters, UpsertRoleDto } from "@/types/role";

const buildQueryString = (
  filters: Record<string, string | boolean | undefined>,
): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : "";
};

const onMutationError = (error: unknown) => {
  if (error instanceof ApiError) {
    showErrorToast(error);
  }
};

/** 역할 목록 조회 */
export const useRoles = (filters: RoleListFilters = {}) =>
  useQuery({
    queryKey: roleKeys.list({
      search: filters.search,
      roleCategory: filters.roleCategory,
      isActive: filters.isActive,
    }),
    queryFn: () =>
      apiGet<RoleDto[]>(
        `/api/admin/roles${buildQueryString({
          search: filters.search,
          roleCategory: filters.roleCategory,
          isActive: filters.isActive,
        })}`,
      ),
  });

/** 역할 생성 */
export const useCreateRole = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpsertRoleDto) => apiPost<RoleDto>("/api/admin/roles", dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roleKeys.all });
    },
    onError: onMutationError,
  });
};

/** 역할 수정 */
export const useUpdateRole = (roleId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpsertRoleDto) =>
      apiPut<RoleDto>(`/api/admin/roles/${roleId}`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roleKeys.all });
    },
    onError: onMutationError,
  });
};

/** 역할 비활성화 */
export const useDeactivateRole = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roleId: number) =>
      apiDelete<{ success: boolean }>(`/api/admin/roles/${roleId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: roleKeys.all });
    },
    onError: onMutationError,
  });
};
