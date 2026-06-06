import { create } from "zustand";

import type { Locale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";

interface UIState {
  sidebarOpen: boolean;
  currentLocale: Locale;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setCurrentLocale: (locale: Locale) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  currentLocale: defaultLocale,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentLocale: (locale) => set({ currentLocale: locale }),
}));
