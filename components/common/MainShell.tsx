"use client";

import { Header } from "@/components/common/Header";
import { MobileSidebar, Sidebar } from "@/components/common/Sidebar";
import { NavigationGuardDialog } from "@/components/common/NavigationGuardDialog";

type MainShellProps = {
  children: React.ReactNode;
};

/** Header + Sidebar + Main 영역 */
export function MainShell({ children }: MainShellProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <MobileSidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      <NavigationGuardDialog />
    </div>
  );
}
