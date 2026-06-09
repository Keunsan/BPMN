"use client";

import { useCallback } from "react";

import { useRouter } from "@/lib/i18n/navigation";
import { useNavigationGuardStore } from "@/lib/store/navigation-guard.store";

/** 미저장 변경 시 이동 확인을 거치는 router 래퍼 */
export const useGuardedRouter = () => {
  const router = useRouter();
  const isBlocking = useNavigationGuardStore((s) => s.isBlocking);
  const openLeaveDialog = useNavigationGuardStore((s) => s.openLeaveDialog);

  const push = useCallback(
    (href: string) => {
      if (isBlocking) {
        openLeaveDialog(href);
        return;
      }
      router.push(href);
    },
    [isBlocking, openLeaveDialog, router],
  );

  const replace = useCallback(
    (href: string) => {
      if (isBlocking) {
        openLeaveDialog(href);
        return;
      }
      router.replace(href);
    },
    [isBlocking, openLeaveDialog, router],
  );

  return { push, replace };
};
