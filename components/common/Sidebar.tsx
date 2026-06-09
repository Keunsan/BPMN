"use client";

import {
  ChevronDown,
  ChevronRight,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { GuardedLink } from "@/components/common/GuardedLink";
import { sidebarNavIcons } from "@/components/common/sidebar-nav-icons";
import { sidebarNav, type SidebarNavItem } from "@/components/common/sidebar-nav";
import { Button } from "@/components/ui/button";
import { useHorizontalPanelResize } from "@/hooks/useHorizontalPanelResize";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui.store";

const APP_SIDEBAR_WIDTH_KEY = "pams-app-sidebar-width";
const APP_SIDEBAR_DEFAULT_WIDTH = 256;
const APP_SIDEBAR_MIN_WIDTH = 200;
const APP_SIDEBAR_MAX_WIDTH = 420;
const APP_SIDEBAR_COLLAPSED_WIDTH = 56;

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
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
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

            return (
              <li key={child.href}>
                <GuardedLink
                  href={child.href}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
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

/** 접힌 상태 아이콘 메뉴 */
const CollapsedNav = () => {
  const t = useTranslations();
  const pathname = usePathname();

  return (
    <ul className="flex flex-col items-center gap-1 py-2">
      {sidebarNav.map((group, groupIndex) => (
        <li key={group.labelKey} className="w-full">
          <ul className="flex flex-col items-center gap-1">
            {group.children?.map((child) => {
              if (!child.href || !child.iconKey) {
                return null;
              }

              const Icon = sidebarNavIcons[child.iconKey];
              const active = pathname.includes(child.href);

              return (
                <li key={child.href} className="w-full px-1">
                  <GuardedLink
                    href={child.href}
                    title={t(child.labelKey)}
                    aria-label={t(child.labelKey)}
                    className={cn(
                      "flex size-9 w-full items-center justify-center rounded-md transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                  </GuardedLink>
                </li>
              );
            })}
          </ul>
          {groupIndex < sidebarNav.length - 1 && (
            <div
              className="mx-auto my-1.5 h-px w-6 bg-sidebar-border"
              aria-hidden
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export function Sidebar() {
  const t = useTranslations("common");
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  const hydrateSidebarCollapsed = useUIStore((s) => s.hydrateSidebarCollapsed);

  useEffect(() => {
    hydrateSidebarCollapsed();
  }, [hydrateSidebarCollapsed]);

  const { width, isResizing, handleResizePointerDown } = useHorizontalPanelResize(
    {
      storageKey: APP_SIDEBAR_WIDTH_KEY,
      defaultWidth: APP_SIDEBAR_DEFAULT_WIDTH,
      minWidth: APP_SIDEBAR_MIN_WIDTH,
      maxWidth: APP_SIDEBAR_MAX_WIDTH,
      enabled: sidebarOpen && !sidebarCollapsed,
    },
  );

  if (!sidebarOpen) {
    return null;
  }

  const asideWidth = sidebarCollapsed ? APP_SIDEBAR_COLLAPSED_WIDTH : width;

  return (
    <>
      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex",
          !isResizing && "transition-[width] duration-200",
        )}
        style={{ width: asideWidth }}
      >
        <div
          className={cn(
            "shrink-0 border-b",
            sidebarCollapsed ? "px-1 py-2" : "px-3 py-2.5",
          )}
        >
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6"
                onClick={() => setSidebarCollapsed(false)}
                title={t("sidebarExpand")}
                aria-label={t("sidebarExpand")}
              >
                <PanelLeftOpen className="size-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Menu className="size-4 shrink-0 text-primary" />
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
                {t("menuNavTitle")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 shrink-0"
                onClick={() => setSidebarCollapsed(true)}
                title={t("sidebarCollapse")}
                aria-label={t("sidebarCollapse")}
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
            </div>
          )}
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-1">
          {sidebarCollapsed ? (
            <CollapsedNav />
          ) : (
            <div className="p-2">
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
          aria-label={t("sidebarResize")}
          aria-valuenow={width}
          aria-valuemin={APP_SIDEBAR_MIN_WIDTH}
          aria-valuemax={APP_SIDEBAR_MAX_WIDTH}
          className={cn(
            "relative z-20 hidden w-2 shrink-0 cursor-col-resize touch-none select-none items-center justify-center border-r bg-sidebar/80 transition-colors hover:bg-primary/15 active:bg-primary/25 md:flex",
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

/** 모바일용 사이드바 (Sheet) */
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
        className="fixed inset-0 z-40 bg-black/40 md:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />
      <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-sidebar p-3 md:hidden">
        <div className="mb-3 text-sm font-semibold">{t("app.title")}</div>
        <nav className="flex-1 overflow-y-auto">
          {sidebarNav.map((group) => (
            <div key={group.labelKey} className="mb-3">
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {group.children?.map((child) => {
                  if (!child.href) {
                    return null;
                  }
                  const active = pathname.includes(child.href);

                  return (
                    <li key={child.href}>
                      <GuardedLink
                        href={child.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "block rounded-md px-2 py-1.5 text-sm",
                          active
                            ? "bg-sidebar-accent font-medium"
                            : "text-muted-foreground hover:bg-sidebar-accent",
                        )}
                      >
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
