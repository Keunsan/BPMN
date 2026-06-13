"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { systemKeys, metadataKeys } from "@/lib/query/keys";
import type {
  ApplicationSystemDto,
  BatchCreateTaskSystemMappingDto,
  CreateTaskSystemMappingDto,
  ScreenCatalogFilters,
  ScreenCatalogItem,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModuleOption,
  SystemScreen,
  SystemScreenDto,
  TaskSystemMappingDto,
  UpsertApplicationSystemDto,
  UpsertSystemScreenDto,
} from "@/types/system";

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

/** 시스템 목록 조회 */
export const useSystems = (filters: SystemListFilters = {}) =>
  useQuery({
    queryKey: systemKeys.list(filters),
    queryFn: () =>
      apiGet<ApplicationSystemDto[]>(
        `/api/admin/systems${buildQueryString({
          search: filters.search,
          systemType: filters.systemType,
          companyCode: filters.companyCode,
          businessUnitCode: filters.businessUnitCode,
          isActive: filters.isActive,
        })}`,
      ),
  });

/** 시스템 상세 조회 */
export const useSystem = (systemId: number) =>
  useQuery({
    queryKey: systemKeys.detail(systemId),
    queryFn: () => apiGet<ApplicationSystemDto>(`/api/admin/systems/${systemId}`),
    enabled: systemId > 0,
  });

/** 시스템 계층 조회 */
export const useSystemHierarchy = () =>
  useQuery({
    queryKey: systemKeys.hierarchy(),
    queryFn: () => apiGet<SystemHierarchyDto[]>("/api/admin/systems/hierarchy"),
  });

/** 시스템별 공통 모듈(MODULE_CD) 조회 */
export const useSystemModules = (systemId: number) =>
  useQuery({
    queryKey: systemKeys.modules(systemId),
    queryFn: () =>
      apiGet<SystemModuleOption[]>(`/api/admin/systems/${systemId}/modules`),
    enabled: systemId > 0,
  });

/** 시스템·모듈별 화면 조회 */
export const useSystemScreens = (systemId: number, moduleCode = "") =>
  useQuery({
    queryKey: systemKeys.screens(systemId, moduleCode),
    queryFn: () =>
      apiGet<SystemScreenDto[]>(
        `/api/admin/systems/${systemId}/screens${buildQueryString({
          moduleCode,
          isActive: true,
        })}`,
      ),
    enabled: systemId > 0 && moduleCode.length > 0,
  });

const onMutationError = (error: unknown) => {
  if (error instanceof ApiError) {
    showErrorToast(error);
  }
};

/** 시스템 생성 */
export const useCreateSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertApplicationSystemDto) =>
      apiPost<ApplicationSystemDto>("/api/admin/systems", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 시스템 수정 */
export const useUpdateSystem = (systemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertApplicationSystemDto) =>
      apiPut<ApplicationSystemDto>(`/api/admin/systems/${systemId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 시스템 비활성화 */
export const useDeactivateSystem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (systemId: number) =>
      apiDelete<{ systemId: number }>(`/api/admin/systems/${systemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 화면 생성 */
export const useCreateScreen = (systemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSystemScreenDto) =>
      apiPost<SystemScreen>(`/api/admin/systems/${systemId}/screens`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 화면 수정 */
export const useUpdateScreen = (screenId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSystemScreenDto) =>
      apiPut<SystemScreen>(`/api/admin/systems/screens/${screenId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 화면 비활성화 */
export const useDeactivateScreen = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (screenId: number) =>
      apiDelete<{ screenId: number }>(`/api/admin/systems/screens/${screenId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** Task 시스템 매핑 목록 */
export const useTaskSystemMappings = (nodeId: number) =>
  useQuery({
    queryKey: metadataKeys.systems(nodeId),
    queryFn: () =>
      apiGet<TaskSystemMappingDto[]>(`/api/metadata/tasks/${nodeId}/systems`),
    enabled: nodeId > 0,
  });

/** Task 시스템 매핑 생성 */
export const useCreateTaskSystemMapping = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTaskSystemMappingDto) =>
      apiPost<TaskSystemMappingDto>(`/api/metadata/tasks/${nodeId}/systems`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.systems(nodeId) });
    },
    onError: onMutationError,
  });
};

/** Task 시스템 매핑 일괄 생성 */
export const useCreateTaskSystemMappingsBatch = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BatchCreateTaskSystemMappingDto) =>
      apiPost<{ createdCount: number }>(
        `/api/metadata/tasks/${nodeId}/systems/batch`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.systems(nodeId) });
      qc.invalidateQueries({ queryKey: systemKeys.all });
    },
    onError: onMutationError,
  });
};

/** Task 시스템 매핑 삭제 */
export const useDeleteTaskSystemMapping = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) =>
      apiDelete<{ mappingId: number }>(
        `/api/metadata/tasks/${nodeId}/systems/${mappingId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.systems(nodeId) });
      qc.invalidateQueries({ queryKey: systemKeys.all });
    },
    onError: onMutationError,
  });
};

/** 연결 후보 화면 카탈로그 */
export const useScreenCatalog = (
  filters: ScreenCatalogFilters,
  locale: string,
  enabled = true,
) =>
  useQuery({
    queryKey: systemKeys.screenCatalog({
      ...filters,
      locale,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.systemId) params.set("systemId", String(filters.systemId));
      if (filters.moduleCode) params.set("moduleCode", filters.moduleCode);
      if (filters.search) params.set("search", filters.search);
      if (filters.excludeNodeId) {
        params.set("excludeNodeId", String(filters.excludeNodeId));
      }
      params.set("page", String(filters.page ?? 1));
      params.set("pageSize", String(filters.pageSize ?? 50));

      const response = await fetch(`/api/metadata/screens?${params.toString()}`, {
        headers: { "Accept-Language": locale },
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: ScreenCatalogItem[];
        meta?: { total?: number; page?: number; pageSize?: number };
        error?: { code: string; message: string };
      };

      if (!response.ok || !body.success) {
        throw new ApiError(
          body.error?.code ?? "E502",
          body.error?.message ?? "Failed to load screens",
          response.status,
        );
      }

      return {
        items: body.data ?? [],
        total: body.meta?.total ?? 0,
        page: body.meta?.page ?? filters.page ?? 1,
        pageSize: body.meta?.pageSize ?? filters.pageSize ?? 50,
      };
    },
    enabled,
  });

/** 연결 후보 화면 카탈로그 — 무한 스크롤 */
export const useScreenCatalogInfinite = (
  filters: Omit<ScreenCatalogFilters, "page">,
  locale: string,
  enabled = true,
) =>
  useInfiniteQuery({
    queryKey: systemKeys.screenCatalogInfinite({
      systemId: filters.systemId,
      moduleCode: filters.moduleCode,
      search: filters.search,
      excludeNodeId: filters.excludeNodeId,
      pageSize: filters.pageSize,
      locale,
    }),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.systemId) params.set("systemId", String(filters.systemId));
      if (filters.moduleCode) params.set("moduleCode", filters.moduleCode);
      if (filters.search) params.set("search", filters.search);
      if (filters.excludeNodeId) {
        params.set("excludeNodeId", String(filters.excludeNodeId));
      }
      params.set("page", String(pageParam));
      params.set("pageSize", String(filters.pageSize ?? 50));

      const response = await fetch(`/api/metadata/screens?${params.toString()}`, {
        headers: { "Accept-Language": locale },
      });
      const body = (await response.json()) as {
        success: boolean;
        data?: ScreenCatalogItem[];
        meta?: { total?: number; page?: number; pageSize?: number };
        error?: { code: string; message: string };
      };

      if (!response.ok || !body.success) {
        throw new ApiError(
          body.error?.code ?? "E502",
          body.error?.message ?? "Failed to load screens",
          response.status,
        );
      }

      return {
        items: body.data ?? [],
        total: body.meta?.total ?? 0,
        page: body.meta?.page ?? (pageParam as number),
        pageSize: body.meta?.pageSize ?? filters.pageSize ?? 50,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total
        ? lastPage.page + 1
        : undefined,
    enabled,
  });
