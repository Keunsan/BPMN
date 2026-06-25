"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { processKeys } from "@/lib/query/keys";
import type {
  CreateProcessDto,
  CreateVariantDto,
  MoveProcessDto,
  ProcessDeleteImpact,
  ProcessFilters,
  ProcessHistoryDto,
  ProcessNodeDto,
  ProcessNodeTree,
  StandardVariantCompareDto,
  UpdateProcessDto,
} from "@/types/process";

/** 프로세스 트리 조회 훅 */
export const useProcessTree = (
  filters: ProcessFilters = {},
  options?: { initialData?: ProcessNodeTree[] },
) => {
  return useQuery({
    queryKey: processKeys.tree(filters),
    queryFn: () =>
      apiGet<ProcessNodeTree[]>("/api/process", {
        params: {
          format: "tree",
          search: filters.search,
          companyCode: filters.companyCode,
          businessUnitCode: filters.businessUnitCode,
        },
      }),
    initialData: options?.initialData,
    initialDataUpdatedAt: options?.initialData ? Date.now() : undefined,
  });
};

/** 프로세스 상세 조회 훅 */
export const useProcessDetail = (
  nodeId: number,
  options?: { enabled?: boolean; placeholderData?: ProcessNodeDto },
) => {
  return useQuery({
    queryKey: processKeys.detail(nodeId),
    queryFn: () => apiGet<ProcessNodeDto>(`/api/process/${nodeId}`),
    enabled: (options?.enabled ?? true) && nodeId > 0,
    placeholderData: options?.placeholderData,
    staleTime: 30_000,
  });
};

/** 프로세스 이력 조회 훅 */
export const useProcessHistory = (
  nodeId: number,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: [...processKeys.detail(nodeId), "history"],
    queryFn: () =>
      apiGet<ProcessHistoryDto[]>(`/api/process/${nodeId}/history`),
    enabled: (options?.enabled ?? true) && nodeId > 0,
    staleTime: 30_000,
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
      if (error instanceof ApiError) {
        if (error.field) {
          return;
        }
        showErrorToast(error);
      }
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

/** 프로세스 삭제 영향 범위 조회 mutation */
export const useProcessDeleteImpact = () => {
  return useMutation({
    mutationFn: (nodeId: number) =>
      apiGet<ProcessDeleteImpact>(`/api/process/${nodeId}/delete-impact`),
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

/** 표준 프로세스 변형 목록 */
export const useProcessVariants = (standardNodeId: number, enabled = true) => {
  return useQuery({
    queryKey: processKeys.variants(standardNodeId),
    queryFn: () =>
      apiGet<ProcessNodeDto[]>(`/api/process/${standardNodeId}/variants`),
    enabled: standardNodeId > 0 && enabled,
    staleTime: 30_000,
  });
};

/** 표준·변형 비교 */
export const useStandardVariantCompare = (
  standardNodeId: number,
  filters: Pick<ProcessFilters, "companyCode" | "businessUnitCode">,
  enabled = true,
) => {
  return useQuery({
    queryKey: processKeys.compareVariant(standardNodeId, filters),
    queryFn: () =>
      apiGet<StandardVariantCompareDto>(
        `/api/process/${standardNodeId}/compare-variant`,
        {
          params: {
            companyCode: filters.companyCode,
            businessUnitCode: filters.businessUnitCode,
          },
        },
      ),
    enabled:
      enabled &&
      standardNodeId > 0 &&
      Boolean(filters.companyCode && filters.businessUnitCode),
  });
};

/** 변형 생성 mutation */
export const useCreateProcessVariant = (standardNodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVariantDto) =>
      apiPost<ProcessNodeDto>(`/api/process/${standardNodeId}/variant`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processKeys.all });
      qc.invalidateQueries({ queryKey: processKeys.variants(standardNodeId) });
      qc.invalidateQueries({ queryKey: processKeys.detail(standardNodeId) });
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
