"use client";

import { Header } from "@/components/common/Header";
import { MobileSidebar, Sidebar } from "@/components/common/Sidebar";

type MainShellProps = {
  children: React.ReactNode;
};

/** Header + Sidebar + Main 영역 */
export function MainShell({ children }: MainShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MobileSidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
