"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { metadataKeys } from "@/lib/query/keys";
import type { TaskRoleMappingDto, UpsertTaskRoleMappingDto } from "@/types/raci";

const onMutationError = (error: unknown) => {
  if (error instanceof ApiError) {
    showErrorToast(error);
  }
};

/** Task RACI 매핑 목록 */
export const useTaskRoleMappings = (nodeId: number) =>
  useQuery({
    queryKey: metadataKeys.raci(nodeId),
    queryFn: () =>
      apiGet<TaskRoleMappingDto[]>(`/api/metadata/tasks/${nodeId}/raci`),
    enabled: nodeId > 0,
  });

/** Task RACI 매핑 생성 */
export const useCreateTaskRoleMapping = (nodeId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpsertTaskRoleMappingDto) =>
      apiPost<TaskRoleMappingDto>(`/api/metadata/tasks/${nodeId}/raci`, dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: metadataKeys.raci(nodeId) });
    },
    onError: onMutationError,
  });
};

/** Task RACI 매핑 수정 */
export const useUpdateTaskRoleMapping = (nodeId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      mappingId,
      dto,
    }: {
      mappingId: number;
      dto: UpsertTaskRoleMappingDto;
    }) =>
      apiPut<TaskRoleMappingDto>(
        `/api/metadata/tasks/${nodeId}/raci/${mappingId}`,
        dto,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: metadataKeys.raci(nodeId) });
    },
    onError: onMutationError,
  });
};

/** Task RACI 매핑 삭제 */
export const useDeleteTaskRoleMapping = (nodeId: number) => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (mappingId: number) =>
      apiDelete<{ success: boolean }>(
        `/api/metadata/tasks/${nodeId}/raci/${mappingId}`,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: metadataKeys.raci(nodeId) });
    },
    onError: onMutationError,
  });
};
