"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { externalKeys, metadataKeys } from "@/lib/query/keys";
import type {
  TaskDataTableLinkDto,
  UpsertTaskDataTableLinkDto,
} from "@/types/data-table";
import type { ExternalColumn, ExternalTable, ExternalTableQuery } from "@/types/external";

type ExternalTableQueryWithMock = ExternalTableQuery & { mock?: boolean };

const onMutationError = (error: unknown) => {
  if (error instanceof ApiError) {
    showErrorToast(error);
  }
};

/** 외부 테이블 목록 조회 */
export const useExternalTables = (
  query: ExternalTableQueryWithMock,
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: externalKeys.tables(query),
    queryFn: () =>
      apiGet<ExternalTable[]>(`/api/external/systems/${query.systemId}/tables`, {
        params: {
          schemaName: query.schemaName,
          search: query.search,
          mock: query.mock,
        },
      }),
    enabled: (options.enabled ?? true) && query.systemId > 0,
  });

/** 외부 컬럼 목록 조회 */
export const useExternalColumns = (
  query: ExternalTableQueryWithMock & { tableName?: string },
  options: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: externalKeys.columns(
      query.systemId,
      query.tableName ?? "",
      query.schemaName,
    ),
    queryFn: () =>
      apiGet<ExternalColumn[]>(
        `/api/external/systems/${query.systemId}/tables/${encodeURIComponent(
          query.tableName ?? "",
        )}/columns`,
        {
          params: {
            schemaName: query.schemaName,
            mock: query.mock,
          },
        },
      ),
    enabled:
      (options.enabled ?? true) && query.systemId > 0 && Boolean(query.tableName),
  });

/** Task 데이터 테이블 연결 목록 */
export const useTaskDataTableLinks = (nodeId: number) =>
  useQuery({
    queryKey: metadataKeys.dataTables(nodeId),
    queryFn: () =>
      apiGet<TaskDataTableLinkDto[]>(
        `/api/metadata/tasks/${nodeId}/data-tables`,
      ),
    enabled: nodeId > 0,
  });

/** Task 데이터 테이블 연결 생성 */
export const useCreateTaskDataTableLink = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertTaskDataTableLinkDto) =>
      apiPost<TaskDataTableLinkDto>(
        `/api/metadata/tasks/${nodeId}/data-tables`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.dataTables(nodeId) });
    },
    onError: onMutationError,
  });
};

/** Task 데이터 테이블 연결 수정 */
export const useUpdateTaskDataTableLink = (nodeId: number, linkId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertTaskDataTableLinkDto) =>
      apiPut<TaskDataTableLinkDto>(
        `/api/metadata/tasks/${nodeId}/data-tables/${linkId}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.dataTables(nodeId) });
    },
    onError: onMutationError,
  });
};

/** Task 데이터 테이블 연결 삭제 */
export const useDeleteTaskDataTableLink = (nodeId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: number) =>
      apiDelete<{ linkId: number }>(
        `/api/metadata/tasks/${nodeId}/data-tables/${linkId}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: metadataKeys.dataTables(nodeId) });
    },
    onError: onMutationError,
  });
};
