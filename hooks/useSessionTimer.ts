"use client";

import { useEffect, useState } from "react";

import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { getDevSessionStatus, isAuthEnabled } from "@/lib/auth/config";
import { useExtendSession, useSessionStatus } from "@/lib/query/hooks/useSession";
import { SESSION_WARNING_MS } from "@/lib/session/constants";

/** 세션 남은 시간·진행률·연장 액션 */
export const useSessionTimer = () => {
  const authEnabled = isAuthEnabled();
  const router = useGuardedRouter();
  const { data, isLoading, isError, refetch } = useSessionStatus(authEnabled);
  const extendMutation = useExtendSession();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!authEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [authEnabled]);

  const remainingMs =
    authEnabled && data?.expiresAt !== undefined
      ? Math.max(0, data.expiresAt - now)
      : null;

  useEffect(() => {
    if (authEnabled && remainingMs === 0) {
      void refetch();
    }
  }, [authEnabled, remainingMs, refetch]);

  const timeoutMs = data?.timeoutMs ?? 0;
  const progress =
    authEnabled && timeoutMs > 0 && remainingMs !== null
      ? Math.min(1, Math.max(0, remainingMs / timeoutMs))
      : 0;
  const isWarning =
    authEnabled &&
    remainingMs !== null &&
    remainingMs > 0 &&
    remainingMs <= SESSION_WARNING_MS;
  const isExpired = authEnabled && (isError || remainingMs === 0);

  useEffect(() => {
    if (authEnabled && !isLoading && isExpired) {
      router.push("/login");
    }
  }, [authEnabled, isExpired, isLoading, router]);

  const extend = () => {
    if (authEnabled) {
      extendMutation.mutate();
    }
  };

  if (!authEnabled) {
    return {
      session: getDevSessionStatus(),
      remainingMs: null,
      progress: 0,
      isLoading: false,
      isWarning: false,
      isExpired: false,
      isExtending: false,
      extend,
      refetch: async () => {},
    };
  }

  return {
    session: data,
    remainingMs,
    progress,
    isLoading,
    isWarning,
    isExpired,
    isExtending: extendMutation.isPending,
    extend,
    refetch,
  };
};
