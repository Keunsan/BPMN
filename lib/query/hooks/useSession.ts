"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import { sessionKeys } from "@/lib/query/keys";
import type { SessionStatus } from "@/types/session";

/** 세션 상태 조회 */
export const useSessionStatus = (enabled = true) =>
  useQuery({
    queryKey: sessionKeys.status(),
    queryFn: () => apiGet<SessionStatus>("/api/auth/session"),
    enabled,
    refetchInterval: 60_000,
    retry: false,
  });

/** 세션 연장 */
export const useExtendSession = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<SessionStatus>("/api/auth/session"),
    onSuccess: (data) => {
      qc.setQueryData(sessionKeys.status(), data);
    },
  });
};

/** 로그인 */
export const useLogin = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiPost<SessionStatus>("/api/auth/login"),
    onSuccess: (data) => {
      qc.setQueryData(sessionKeys.status(), data);
    },
  });
};

/** 로그아웃 */
export const useLogout = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => apiDelete<{ loggedOut: boolean }>("/api/auth/session"),
    onSuccess: () => {
      qc.removeQueries({ queryKey: sessionKeys.all });
    },
  });
};
