"use client";

import { useEffect, useState } from "react";

import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useExtendSession, useSessionStatus } from "@/lib/query/hooks/useSession";
import { SESSION_WARNING_MS } from "@/lib/session/constants";

/** 세션 남은 시간·진행률·연장 액션 */
export const useSessionTimer = () => {
  const router = useGuardedRouter();
  const { data, isLoading, isError, refetch } = useSessionStatus();
  const extendMutation = useExtendSession();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  const remainingMs =
    data?.expiresAt !== undefined
      ? Math.max(0, data.expiresAt - now)
      : null;

  useEffect(() => {
    if (remainingMs === 0) {
      void refetch();
    }
  }, [remainingMs, refetch]);

  const timeoutMs = data?.timeoutMs ?? 0;
  const progress =
    timeoutMs > 0 && remainingMs !== null
      ? Math.min(1, Math.max(0, remainingMs / timeoutMs))
      : 0;
  const isWarning =
    remainingMs !== null && remainingMs > 0 && remainingMs <= SESSION_WARNING_MS;
  const isExpired = isError || remainingMs === 0;

  useEffect(() => {
    if (!isLoading && isExpired) {
      router.push("/login");
    }
  }, [isExpired, isLoading, router]);

  const extend = () => {
    extendMutation.mutate();
  };

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
