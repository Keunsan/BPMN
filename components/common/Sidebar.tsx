"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { sidebarNav, type SidebarNavItem } from "@/components/common/sidebar-nav";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/i18n/navigation";
import { useUIStore } from "@/lib/store/ui.store";

function NavGroup({ item }: { item: SidebarNavItem }) {
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
            if (!child.href) return null;
            const active = pathname.includes(child.href);

            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={cn(
                    "block rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {t(child.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200 md:flex",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden border-r-0",
      )}
    >
      <nav className="flex-1 overflow-y-auto p-3">
        {sidebarNav.map((item) => (
          <NavGroup key={item.labelKey} item={item} />
        ))}
      </nav>
    </aside>
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
                  if (!child.href) return null;
                  const active = pathname.includes(child.href);

                  return (
                    <li key={child.href}>
                      <Link
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
                      </Link>
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
