"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { bpmnKeys, e2eProcessKeys } from "@/lib/query/keys";
import type {
  CreateE2eProcessDto,
  E2eProcessDto,
  E2eProcessFilters,
  UpdateE2eProcessDto,
} from "@/types/e2e-process";

export const useE2eProcessTree = () =>
  useQuery({
    queryKey: e2eProcessKeys.tree(),
    queryFn: () => apiGet<E2eProcessDto[]>("/api/e2e-process/tree"),
  });

export const useE2eProcessList = (filters: E2eProcessFilters = {}) =>
  useQuery({
    queryKey: e2eProcessKeys.list({
      search: filters.search,
      status: filters.status,
    }),
    queryFn: () =>
      apiGet<E2eProcessDto[]>("/api/e2e-process", {
        params: {
          search: filters.search,
          status: filters.status,
        },
      }),
  });

export const useE2eProcessDetail = (e2eProcessId: number) =>
  useQuery({
    queryKey: e2eProcessKeys.detail(e2eProcessId),
    queryFn: () => apiGet<E2eProcessDto>(`/api/e2e-process/${e2eProcessId}`),
    enabled: e2eProcessId > 0,
  });

export const useCreateE2eProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateE2eProcessDto) =>
      apiPost<E2eProcessDto>("/api/e2e-process", dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: e2eProcessKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

export const useUpdateE2eProcess = (e2eProcessId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateE2eProcessDto) =>
      apiPut<E2eProcessDto>(`/api/e2e-process/${e2eProcessId}`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: e2eProcessKeys.all });
      qc.invalidateQueries({ queryKey: e2eProcessKeys.detail(e2eProcessId) });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

export const useDeleteE2eProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (e2eProcessId: number) =>
      apiDelete<{ deleted: boolean }>(`/api/e2e-process/${e2eProcessId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: e2eProcessKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

export const useEnsureE2eBpmn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (e2eProcessId: number) =>
      apiPost<{ modelId: number }>(`/api/e2e-process/${e2eProcessId}/bpmn`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bpmnKeys.all });
      qc.invalidateQueries({ queryKey: e2eProcessKeys.all });
    },
    onError: (error) => {
      if (error instanceof ApiError) showErrorToast(error);
    },
  });
};

export const useL4Slice = (nodeId: number, enabled = false) =>
  useQuery({
    queryKey: bpmnKeys.l4Slice(nodeId),
    queryFn: () =>
      apiGet<{
        xml: string;
        l3NodeId: number;
        l3Code: string;
        l3Name: string;
        sourceModelId: number;
      } | null>(`/api/bpmn/l3/${nodeId}/l4-slice`),
    enabled: enabled && nodeId > 0,
  });

export const useE2eProcessesByL3NodeId = (nodeId: number, enabled = true) =>
  useQuery({
    queryKey: [...e2eProcessKeys.all, "by-l3", nodeId] as const,
    queryFn: () =>
      apiGet<E2eProcessDto[]>(`/api/e2e-process/by-l3/${nodeId}`),
    enabled: enabled && nodeId > 0,
  });
