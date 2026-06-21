"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { bpmnKeys, e2eProcessKeys } from "@/lib/query/keys";
import type {
  BpmnCompareRequest,
  BpmnCompareResult,
  BpmnFilters,
  BpmnModelDto,
  BpmnTaskProcessLinkDto,
  CreateBpmnDto,
  LinkOrCreateBpmnTaskDto,
  UpdateBpmnDto,
} from "@/types/bpmn";

/** BPMN 모델 목록 */
export const useBpmnList = (
  filters: BpmnFilters = {},
  options: { enabled?: boolean } = {},
) => {
  return useQuery({
    queryKey: bpmnKeys.list(filters),
    queryFn: () =>
      apiGet<BpmnModelDto[]>("/api/bpmn", {
        params: {
          nodeId: filters.nodeId,
          linkedNodeId: filters.linkedNodeId,
          status: filters.status,
          isCurrent: filters.isCurrent,
          companyCode: filters.companyCode,
          businessUnitCode: filters.businessUnitCode,
          search: filters.search,
          sort: filters.sort,
          modelKind: filters.modelKind,
          e2eProcessId: filters.e2eProcessId,
        },
      }),
    enabled: options.enabled ?? true,
  });
};

/** BPMN 모델 상세 */
export const useBpmnDetail = (modelId: number) => {
  return useQuery({
    queryKey: bpmnKeys.detail(modelId),
    queryFn: () => apiGet<BpmnModelDto>(`/api/bpmn/${modelId}`),
    enabled: modelId > 0,
    refetchOnMount: "always",
  });
};

/** BPMN 버전 이력 */
export const useBpmnHistory = (modelId: number, nodeId?: number) => {
  return useQuery({
    queryKey: [...bpmnKeys.detail(modelId), "history"],
    queryFn: () =>
      apiGet<BpmnModelDto[]>(`/api/bpmn/${modelId}`, {
        params: { format: "history" },
      }),
    enabled: modelId > 0 && nodeId !== undefined,
  });
};

/** BPMN 모델 생성 */
export const useCreateBpmn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBpmnDto) =>
      apiPost<BpmnModelDto>("/api/bpmn", dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bpmnKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** BPMN 모델 저장 */
export const useSaveBpmn = (modelId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateBpmnDto) =>
      apiPut<BpmnModelDto>(`/api/bpmn/${modelId}`, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bpmnKeys.all });
      queryClient.invalidateQueries({ queryKey: e2eProcessKeys.all });
      queryClient.setQueryData(bpmnKeys.detail(data.modelId), data);
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** BPMN 모델 삭제 */
export const useDeleteBpmn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (modelId: number) =>
      apiDelete<{ deleted: boolean }>(`/api/bpmn/${modelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bpmnKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** BPMN 모델 복제 */
export const useDuplicateBpmn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      modelId,
      modelName,
    }: {
      modelId: number;
      modelName: string;
    }) =>
      apiPost<BpmnModelDto>(`/api/bpmn/${modelId}/duplicate`, { modelName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bpmnKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** BPMN Task를 L4 프로세스로 자동 생성/연결 */
export const useLinkOrCreateBpmnTask = (modelId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: LinkOrCreateBpmnTaskDto) =>
      apiPost<BpmnTaskProcessLinkDto>(`/api/bpmn/${modelId}/task-link`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bpmnKeys.detail(modelId) });
      queryClient.invalidateQueries({ queryKey: bpmnKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

/** BPMN 버전 비교 */
export const useCompareBpmn = () => {
  return useMutation({
    mutationFn: (request: BpmnCompareRequest) =>
      apiPost<BpmnCompareResult>("/api/bpmn/compare", request),
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};
