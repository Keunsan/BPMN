"use client";

import { Header } from "@/components/common/Header";
import { MobileSidebar, Sidebar } from "@/components/common/Sidebar";
import { SidebarBrand } from "@/components/common/SidebarBrand";
import { NavigationGuardDialog } from "@/components/common/NavigationGuardDialog";
import { SessionGuard } from "@/components/common/SessionGuard";
import { StatusBar } from "@/components/common/StatusBar";

type MainShellProps = {
  children: React.ReactNode;
};

/** Header + Sidebar + Main + StatusBar 영역 */
export function MainShell({ children }: MainShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="flex h-14 shrink-0 items-stretch border-b bg-card">
        <SidebarBrand />
        <Header />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <MobileSidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-1.5">
          <SessionGuard>{children}</SessionGuard>
        </main>
      </div>
      <StatusBar />
      <NavigationGuardDialog />
    </div>
  );
}
