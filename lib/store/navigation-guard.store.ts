import { create } from "zustand";

type NavigationGuardState = {
  isBlocking: boolean;
  dialogOpen: boolean;
  pendingHref: string | null;
  saveBeforeLeave: (() => Promise<boolean>) | null;
  setBlocking: (blocking: boolean) => void;
  setSaveBeforeLeave: (handler: (() => Promise<boolean>) | null) => void;
  openLeaveDialog: (href: string) => void;
  closeLeaveDialog: () => void;
  clearGuard: () => void;
};

/** BPMN 등 미저장 변경 시 메뉴 이동을 차단하는 전역 가드 상태 */
export const useNavigationGuardStore = create<NavigationGuardState>((set) => ({
  isBlocking: false,
  dialogOpen: false,
  pendingHref: null,
  saveBeforeLeave: null,
  setBlocking: (blocking) => set({ isBlocking: blocking }),
  setSaveBeforeLeave: (handler) => set({ saveBeforeLeave: handler }),
  openLeaveDialog: (href) =>
    set({ dialogOpen: true, pendingHref: href }),
  closeLeaveDialog: () =>
    set({ dialogOpen: false, pendingHref: null }),
  clearGuard: () =>
    set({
      isBlocking: false,
      dialogOpen: false,
      pendingHref: null,
      saveBeforeLeave: null,
    }),
}));
