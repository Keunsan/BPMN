"use client";

import { useEffect } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useSessionStatus } from "@/lib/query/hooks/useSession";

type SessionGuardProps = {
  children: React.ReactNode;
};

/** 세션 없음·만료 시 로그인으로 이동 */
export const SessionGuard = ({ children }: SessionGuardProps) => {
  const router = useGuardedRouter();
  const { isLoading, isError } = useSessionStatus();

  useEffect(() => {
    if (!isLoading && isError) {
      router.push("/login");
    }
  }, [isError, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner className="min-h-full flex-1" />;
  }

  if (isError) {
    return null;
  }

  return children;
};
