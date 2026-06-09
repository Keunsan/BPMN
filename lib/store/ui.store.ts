import { create } from "zustand";

import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";

const APP_SIDEBAR_COLLAPSED_KEY = "pams-app-sidebar-collapsed";

const readSidebarCollapsed = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(APP_SIDEBAR_COLLAPSED_KEY) === "true";
};

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  currentLocale: Locale;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentLocale: (locale: Locale) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: readSidebarCollapsed(),
  currentLocale: defaultLocale,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(APP_SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }
    set({ sidebarCollapsed: collapsed });
  },
  setCurrentLocale: (locale) => set({ currentLocale: locale }),
}));
