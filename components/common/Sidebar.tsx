"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { GuardedLink } from "@/components/common/GuardedLink";
import { sidebarNavIcons } from "@/components/common/sidebar-nav-icons";
import { sidebarNav, type SidebarNavItem } from "@/components/common/sidebar-nav";
import {
  APP_SIDEBAR_MAX_WIDTH,
  APP_SIDEBAR_MIN_WIDTH,
  useAppSidebarWidth,
} from "@/hooks/useAppSidebarWidth";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui.store";

/** 아이콘+라벨 세로 메뉴 (참조 UI 기본 모드) */
const IconNav = () => {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <ul className="flex flex-col items-stretch gap-1 px-2 py-2">
      {sidebarNav.map((group, groupIndex) => (
        <li key={group.labelKey}>
          <ul className="flex flex-col items-stretch gap-1">
            {group.children?.map((child) => {
              if (!child.href || !child.iconKey) {
                return null;
              }

              const Icon = sidebarNavIcons[child.iconKey];
              const active = pathname.includes(child.href);

              return (
                <li key={child.href}>
                  <GuardedLink
                    href={child.href}
                    title={t(child.labelKey)}
                    aria-label={t(child.labelKey)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="line-clamp-2 w-full text-[10px] leading-tight font-medium">
                      {t(child.labelKey)}
                    </span>
                  </GuardedLink>
                </li>
              );
            })}
          </ul>
          {groupIndex < sidebarNav.length - 1 && (
            <div className="mx-3 my-2 h-px bg-sidebar-border" aria-hidden />
          )}
        </li>
      ))}
    </ul>
  );
};

/** 펼친 상태 그룹 메뉴 */
const NavGroup = ({ item }: { item: SidebarNavItem }) => {
  const t = useTranslations();
  const pathname = usePathname();
  const hasActiveChild = item.children?.some(
    (child) => child.href && pathname.includes(child.href),
  );
  const [open, setOpen] = useState(hasActiveChild ?? true);

  if (!item.children?.length) {
    return null;
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-sidebar-foreground hover:bg-muted/50"
      >
        {open ? (
          <ChevronDown className="size-3.5 shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0" />
        )}
        {t(item.labelKey)}
      </button>

      {open && (
        <ul className="mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
          {item.children.map((child) => {
            if (!child.href) {
              return null;
            }
            const active = pathname.includes(child.href);
            const Icon = child.iconKey ? sidebarNavIcons[child.iconKey] : null;

            return (
              <li key={child.href}>
                <GuardedLink
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {Icon && <Icon className="size-3.5 shrink-0" />}
                  {t(child.labelKey)}
                </GuardedLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export function Sidebar() {
  const tCommon = useTranslations("common");
  const {
    width,
    asideWidth,
    isResizing,
    handleResizePointerDown,
    sidebarOpen,
    sidebarCollapsed,
  } = useAppSidebarWidth();

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex",
          !isResizing && "transition-[width] duration-200",
        )}
        style={{ width: asideWidth }}
      >
        <nav className="min-h-0 flex-1 overflow-y-auto">
          {sidebarCollapsed ? (
            <IconNav />
          ) : (
            <div className="px-2 py-2">
              {sidebarNav.map((item) => (
                <NavGroup key={item.labelKey} item={item} />
              ))}
            </div>
          )}
        </nav>
      </aside>
      {!sidebarCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={tCommon("sidebarResize")}
          aria-valuenow={width}
          aria-valuemin={APP_SIDEBAR_MIN_WIDTH}
          aria-valuemax={APP_SIDEBAR_MAX_WIDTH}
          className={cn(
            "relative z-20 hidden w-1.5 shrink-0 cursor-col-resize touch-none select-none items-center justify-center border-r bg-sidebar/80 transition-colors hover:bg-primary/15 active:bg-primary/25 md:flex",
            isResizing && "bg-primary/25",
          )}
          onPointerDown={handleResizePointerDown}
        >
          <div className="pointer-events-none h-10 w-0.5 rounded-full bg-border" />
        </div>
      )}
    </>
  );
}

/** 모바일용 사이드바 */
export function MobileSidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar md:hidden">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            P
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {t("app.title")}
            </p>
            <p className="truncate text-[11px] leading-snug text-muted-foreground">
              {t("app.description")}
            </p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {sidebarNav.map((group) => (
            <div key={group.labelKey} className="mb-2">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.children?.map((child) => {
                  if (!child.href) {
                    return null;
                  }
                  const active = pathname.includes(child.href);
                  const Icon = child.iconKey ? sidebarNavIcons[child.iconKey] : null;

                  return (
                    <li key={child.href}>
                      <GuardedLink
                        href={child.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-xs",
                          active
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-muted-foreground hover:bg-muted/50",
                        )}
                      >
                        {Icon && <Icon className="size-3.5" />}
                        {t(child.labelKey)}
                      </GuardedLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
