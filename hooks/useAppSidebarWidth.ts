"use client";

import { useHorizontalPanelResize } from "@/hooks/useHorizontalPanelResize";
import { useUIStore } from "@/lib/store/ui.store";

export const APP_SIDEBAR_WIDTH_KEY = "pams-app-sidebar-width";
export const APP_SIDEBAR_DEFAULT_WIDTH = 240;
export const APP_SIDEBAR_MIN_WIDTH = 200;
export const APP_SIDEBAR_MAX_WIDTH = 320;
export const APP_SIDEBAR_ICON_WIDTH = 80;

/** 앱 사이드바 너비·리사이즈 상태 (브랜드·네비 공통) */
export const useAppSidebarWidth = () => {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  const { width, isResizing, handleResizePointerDown } = useHorizontalPanelResize({
    storageKey: APP_SIDEBAR_WIDTH_KEY,
    defaultWidth: APP_SIDEBAR_DEFAULT_WIDTH,
    minWidth: APP_SIDEBAR_MIN_WIDTH,
    maxWidth: APP_SIDEBAR_MAX_WIDTH,
    enabled: sidebarOpen && !sidebarCollapsed,
  });

  const asideWidth = sidebarCollapsed ? APP_SIDEBAR_ICON_WIDTH : width;

  return {
    width,
    asideWidth,
    isResizing,
    handleResizePointerDown,
    sidebarOpen,
    sidebarCollapsed,
  };
};
