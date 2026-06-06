"use client";

import { toast } from "sonner";

import { ApiError } from "@/lib/api/error-handler";

type ErrorToastOptions = {
  onRetry?: () => void;
};

/** ApiError를 Toast로 표시 — 재시도 버튼 포함 */
export const showErrorToast = (
  error: ApiError,
  options?: ErrorToastOptions,
): void => {
  if (error.isRetryable && options?.onRetry) {
    toast.error(error.message, {
      duration: 10_000,
      action: {
        label: "재시도",
        onClick: options.onRetry,
      },
    });
    return;
  }

  toast.error(error.message, { duration: 5000 });
};
