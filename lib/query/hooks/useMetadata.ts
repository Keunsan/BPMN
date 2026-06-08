"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import { metadataKeys } from "@/lib/query/keys";
import type {
  TaskAttributeDto,
  UpsertTaskAttributeDto,
} from "@/types/metadata";

/** Task 속성 상세 조회 훅 */
export const useTaskAttribute = (nodeId: number) => {
  return useQuery({
    queryKey: metadataKeys.taskAttribute(nodeId),
    queryFn: () =>
      apiGet<TaskAttributeDto | null>(`/api/metadata/task-attribute/${nodeId}`),
    enabled: nodeId > 0,
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
