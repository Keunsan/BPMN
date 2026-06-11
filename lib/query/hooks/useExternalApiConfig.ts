"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { showErrorToast } from "@/components/common/ErrorToast";
import { apiGet, apiPost, apiPut } from "@/lib/api/client";
import { ApiError } from "@/lib/api/error-handler";
import { externalApiKeys } from "@/lib/query/keys";
import type {
  ExternalApiGlobalConfig,
  ExternalApiParamProfile,
  ExternalApiParamProfileDto,
  ExternalApiTestResult,
  TestExternalTableSchemaDto,
  UpsertExternalApiGlobalConfigDto,
  UpsertExternalApiParamProfileDto,
} from "@/types/external-api";

const onMutationError = (error: unknown) => {
  if (error instanceof ApiError) {
    showErrorToast(error);
  }
};

/** 외부 API 공통 설정 조회 */
export const useExternalApiGlobalConfig = () =>
  useQuery({
    queryKey: externalApiKeys.globalConfig(),
    queryFn: () => apiGet<ExternalApiGlobalConfig>("/api/admin/external-api/config"),
  });

/** 외부 API 공통 설정 저장 */
export const useSaveExternalApiGlobalConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertExternalApiGlobalConfigDto) =>
      apiPut<ExternalApiGlobalConfig>("/api/admin/external-api/config", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalApiKeys.all });
    },
    onError: onMutationError,
  });
};

/** 시스템별 파라미터 프로파일 목록 조회 */
export const useExternalApiParamProfiles = () =>
  useQuery({
    queryKey: externalApiKeys.profiles(),
    queryFn: () =>
      apiGet<ExternalApiParamProfileDto[]>("/api/admin/external-api/profiles"),
  });

/** 시스템별 파라미터 프로파일 조회 */
export const useExternalApiParamProfile = (systemId: number) =>
  useQuery({
    queryKey: externalApiKeys.profile(systemId),
    queryFn: () =>
      apiGet<ExternalApiParamProfile | null>(
        `/api/admin/external-api/profiles/${systemId}`,
      ),
    enabled: systemId > 0,
  });

/** 시스템별 파라미터 프로파일 저장 */
export const useSaveExternalApiParamProfile = (systemId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      data: Omit<UpsertExternalApiParamProfileDto, "systemId">,
    ) =>
      apiPut<ExternalApiParamProfile>(
        `/api/admin/external-api/profiles/${systemId}`,
        data,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: externalApiKeys.all });
    },
    onError: onMutationError,
  });
};

/** 테이블 목록 API 연결 테스트 */
export const useTestExternalTableListApi = (systemId: number) =>
  useMutation({
    mutationFn: () =>
      apiPost<ExternalApiTestResult>(
        `/api/admin/external-api/test/table-list/${systemId}`,
      ),
  });

/** 테이블 스키마 API 연결 테스트 */
export const useTestExternalTableSchemaApi = (systemId: number) =>
  useMutation({
    mutationFn: (data: TestExternalTableSchemaDto) =>
      apiPost<ExternalApiTestResult>(
        `/api/admin/external-api/test/table-schema/${systemId}`,
        data,
      ),
  });
