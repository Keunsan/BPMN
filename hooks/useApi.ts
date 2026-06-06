"use client";

import { useCallback } from "react";

import { showErrorToast } from "@/components/common/ErrorToast";
import { ApiError } from "@/lib/api/error-handler";
import { apiClient, type ApiClientOptions } from "@/lib/api/client";

type UseApiOptions = {
  showError?: boolean;
  onError?: (error: ApiError) => void;
};

/**
 * API 호출 훅 — 에러 시 Toast 자동 표시
 */
export const useApi = (options: UseApiOptions = {}) => {
  const { showError = true, onError } = options;

  const call = useCallback(
    async <T,>(
      path: string,
      clientOptions?: ApiClientOptions,
    ): Promise<T | null> => {
      try {
        return await apiClient<T>(path, clientOptions);
      } catch (error) {
        const apiError =
          error instanceof ApiError
            ? error
            : new ApiError("E501", "Unknown error", 500);

        if (showError) {
          showErrorToast(apiError);
        }
        onError?.(apiError);
        return null;
      }
    },
    [showError, onError],
  );

  return { call };
};
