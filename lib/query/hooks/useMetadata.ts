"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiGet, apiPatch, apiPost, apiPut } from "@/lib/api/client";
import { metadataKeys } from "@/lib/query/keys";
import type {
  SaveResult,
  TaskAttributeBatchRequest,
} from "@/types/editable-data-grid";
import type {
  TaskAttributeDto,
  TaskAttributeListFilters,
  TaskAttributeListItem,
  UpsertTaskAttributeDto,
} from "@/types/metadata";

const TASK_ATTRIBUTE_STALE_MS = 30_000;

/** Task 속성 상세를 미리 조회한다. */
export const prefetchTaskAttribute = (
  queryClient: QueryClient,
  nodeId: number,
) => {
  if (nodeId <= 0) {
    return;
  }

  void queryClient.prefetchQuery({
    queryKey: metadataKeys.taskAttribute(nodeId),
    queryFn: () =>
      apiGet<TaskAttributeDto | null>(`/api/metadata/task-attribute/${nodeId}`),
    staleTime: TASK_ATTRIBUTE_STALE_MS,
  });
};

/** Task 속성 목록 조회 훅 */
export const useTaskAttributeList = (
  filters: TaskAttributeListFilters = {},
  options: { enabled?: boolean } = {},
) => {
  const params = new URLSearchParams();
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.level) {
    params.set("level", filters.level);
  }
  if (filters.nodeId) {
    params.set("nodeId", String(filters.nodeId));
  }
  if (filters.e2eProcessId) {
    params.set("e2eProcessId", String(filters.e2eProcessId));
  }
  if (filters.bpmnModelId) {
    params.set("bpmnModelId", String(filters.bpmnModelId));
  }

  const queryString = params.toString();

  return useQuery({
    queryKey: metadataKeys.taskAttributeList(filters),
    queryFn: () =>
      apiGet<TaskAttributeListItem[]>(
        `/api/metadata/task-attribute${queryString ? `?${queryString}` : ""}`,
      ),
    enabled: options.enabled ?? true,
  });
};

/** Task 속성 상세 조회 훅 */
export const useTaskAttribute = (
  nodeId: number,
  options?: {
    enabled?: boolean;
    placeholderData?: TaskAttributeDto | null;
  },
) => {
  return useQuery({
    queryKey: metadataKeys.taskAttribute(nodeId),
    queryFn: () =>
      apiGet<TaskAttributeDto | null>(`/api/metadata/task-attribute/${nodeId}`),
    enabled: (options?.enabled ?? true) && nodeId > 0,
    placeholderData: options?.placeholderData,
    staleTime: TASK_ATTRIBUTE_STALE_MS,
  });
};

/** Task 속성 생성 mutation */
export const useCreateTaskAttribute = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertTaskAttributeDto) =>
      apiPost<TaskAttributeDto>("/api/metadata/task-attribute", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: metadataKeys.all });
      qc.invalidateQueries({
        queryKey: metadataKeys.taskAttribute(data.nodeId),
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** Task 속성 수정 mutation */
export const useUpdateTaskAttribute = (nodeId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertTaskAttributeDto) =>
      apiPut<TaskAttributeDto>(`/api/metadata/task-attribute/${nodeId}`, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: metadataKeys.all });
      qc.invalidateQueries({
        queryKey: metadataKeys.taskAttribute(data.nodeId),
      });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** Task 속성 일괄 저장 mutation */
export const useBatchSaveTaskAttributes = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: TaskAttributeBatchRequest) =>
      apiPatch<SaveResult>("/api/metadata/task-attribute/batch", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};
