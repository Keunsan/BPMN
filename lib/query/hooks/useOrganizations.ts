"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiGet, apiPost } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { organizationKeys } from "@/lib/query/keys";
import type { HrDepartmentListResponse } from "@/types/hr-erp";
import type {
  OrganizationDto,
  OrganizationListFilters,
  OrganizationSyncResult,
} from "@/types/organization";

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

/** 조직 목록 조회 */
export const useOrganizations = (
  filters: OrganizationListFilters = {},
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: organizationKeys.list({
      search: filters.search,
      buCd: filters.buCd,
      isActive: filters.isActive,
      leafOnly: filters.leafOnly,
    }),
    queryFn: () =>
      apiGet<OrganizationDto[]>(
        `/api/admin/organizations${buildQueryString({
          search: filters.search,
          buCd: filters.buCd,
          isActive: filters.isActive,
          leafOnly: filters.leafOnly,
        })}`,
      ),
    enabled: options.enabled ?? true,
  });

/** HR ERP 부서 live 조회 */
export const useHrDepartments = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: organizationKeys.hrDepartments(),
    queryFn: () => apiGet<HrDepartmentListResponse>("/api/hr/departments"),
    enabled: options.enabled ?? false,
  });

/** HR ERP 조직 동기화 */
export const useSyncOrganizations = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiPost<OrganizationSyncResult>("/api/admin/organizations/sync"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: organizationKeys.all });
    },
    onError: onMutationError,
  });
};
