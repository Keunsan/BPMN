"use client";

import { useLocale } from "next-intl";
import type { ComponentProps } from "react";

import { getPathname, Link, usePathname } from "@/lib/i18n/navigation";
import { useNavigationGuardStore } from "@/lib/store/navigation-guard.store";

type GuardedLinkProps = ComponentProps<typeof Link>;

/** 미저장 변경 시 이동 확인을 거치는 Link */
export const GuardedLink = ({ href, onClick, ...props }: GuardedLinkProps) => {
  const locale = useLocale();
  const pathname = usePathname();
  const isBlocking = useNavigationGuardStore((s) => s.isBlocking);
  const openLeaveDialog = useNavigationGuardStore((s) => s.openLeaveDialog);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const targetPath = getPathname({ href, locale });
    if (targetPath === pathname) {
      return;
    }

    if (isBlocking) {
      event.preventDefault();
      const hrefString =
        typeof href === "string"
          ? href
          : `${href.pathname ?? ""}${href.search ?? ""}${href.hash ?? ""}`;
      openLeaveDialog(hrefString);
    }
  };

  return <Link href={href} onClick={handleClick} {...props} />;
};
