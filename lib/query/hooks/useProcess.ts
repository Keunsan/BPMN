"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { processKeys } from "@/lib/query/keys";
import type {
  CreateProcessDto,
  MoveProcessDto,
  ProcessHistoryDto,
  ProcessNodeDto,
  ProcessNodeTree,
  UpdateProcessDto,
} from "@/types/process";

/** 프로세스 트리 조회 훅 */
export const useProcessTree = (search?: string) => {
  return useQuery({
    queryKey: processKeys.tree({ search }),
    queryFn: () =>
      apiGet<ProcessNodeTree[]>("/api/process", {
        params: { format: "tree", search },
      }),
  });
};

/** 프로세스 상세 조회 훅 */
export const useProcessDetail = (nodeId: number) => {
  return useQuery({
    queryKey: processKeys.detail(nodeId),
    queryFn: () => apiGet<ProcessNodeDto>(`/api/process/${nodeId}`),
    enabled: nodeId > 0,
  });
};

/** 프로세스 이력 조회 훅 */
export const useProcessHistory = (nodeId: number) => {
  return useQuery({
    queryKey: [...processKeys.detail(nodeId), "history"],
    queryFn: () =>
      apiGet<ProcessHistoryDto[]>(`/api/process/${nodeId}/history`),
    enabled: nodeId > 0,
  });
};

/** 프로세스 생성 mutation */
export const useCreateProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProcessDto) =>
      apiPost<ProcessNodeDto>("/api/process", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** 프로세스 수정 mutation */
export const useUpdateProcess = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProcessDto) =>
      apiPut<ProcessNodeDto>(`/api/process/${nodeId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
      qc.invalidateQueries({ queryKey: processKeys.detail(nodeId) });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** 프로세스 삭제 mutation */
export const useDeleteProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nodeId: number) =>
      apiDelete<{ deleted: boolean }>(`/api/process/${nodeId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** 프로세스 이동 mutation */
export const useMoveProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      nodeId,
      ...data
    }: MoveProcessDto & { nodeId: number }) =>
      apiPut<ProcessNodeDto>(`/api/process/${nodeId}/move`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** 승인 요청 mutation */
export const useRequestApproval = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment?: string) =>
      apiPost<{ requestId: number }>(`/api/process/${nodeId}/approve`, {
        comment,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.detail(nodeId) });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};
