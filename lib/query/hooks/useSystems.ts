"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { systemKeys, metadataKeys } from "@/lib/query/keys";
import type {
  ApplicationSystemDto,
  CreateTaskSystemMappingDto,
  SystemHierarchyDto,
  SystemListFilters,
  SystemModule,
  SystemModuleDto,
  SystemScreen,
  SystemScreenDto,
  TaskSystemMappingDto,
  UpsertApplicationSystemDto,
  UpsertSystemModuleDto,
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

/** 시스템 하위 모듈 조회 */
export const useSystemModules = (systemId: number) =>
  useQuery({
    queryKey: systemKeys.modules(systemId),
    queryFn: () =>
      apiGet<SystemModuleDto[]>(`/api/admin/systems/${systemId}/modules`),
    enabled: systemId > 0,
  });

/** 모듈 하위 화면 조회 */
export const useModuleScreens = (moduleId: number) =>
  useQuery({
    queryKey: systemKeys.screens(moduleId),
    queryFn: () =>
      apiGet<SystemScreenDto[]>(
        `/api/admin/systems/modules/${moduleId}/screens`,
      ),
    enabled: moduleId > 0,
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

/** 모듈 생성 */
export const useCreateModule = (systemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSystemModuleDto) =>
      apiPost<SystemModule>(`/api/admin/systems/${systemId}/modules`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 모듈 수정 */
export const useUpdateModule = (moduleId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSystemModuleDto) =>
      apiPut<SystemModule>(`/api/admin/systems/modules/${moduleId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 모듈 비활성화 */
export const useDeactivateModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: number) =>
      apiDelete<{ moduleId: number }>(
        `/api/admin/systems/modules/${moduleId}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: systemKeys.all }),
    onError: onMutationError,
  });
};

/** 화면 생성 */
export const useCreateScreen = (moduleId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSystemScreenDto) =>
      apiPost<SystemScreen>(
        `/api/admin/systems/modules/${moduleId}/screens`,
        data,
      ),
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
    },
    onError: onMutationError,
  });
};
