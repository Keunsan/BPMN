"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";

type FilterPanelSlotContextValue = {
  showCollapseToggle: boolean;
  collapseToggle: ReactNode;
  /** fieldId 기준으로 첫 FilterField만 접기 버튼 슬롯 부여 */
  isCollapseToggleHost: (fieldId: string) => boolean;
};

export const FilterPanelSlotContext = createContext<FilterPanelSlotContextValue | null>(
  null,
);

export const useFilterPanelSlot = () => useContext(FilterPanelSlotContext);

export const useFilterPanelSlotContextValue = (
  showCollapseToggle: boolean,
  collapseToggle: ReactNode,
  /** FilterField 트리 마운트 여부 — 접힘 후 펼칠 때 useId가 바뀌므로 호스트 id 재할당 */
  fieldsMounted = true,
): FilterPanelSlotContextValue => {
  const hostFieldIdRef = useRef<string | null>(null);
  const prevFieldsMountedRef = useRef(fieldsMounted);

  if (!prevFieldsMountedRef.current && fieldsMounted) {
    hostFieldIdRef.current = null;
  }
  prevFieldsMountedRef.current = fieldsMounted;

  return {
    showCollapseToggle,
    collapseToggle,
    isCollapseToggleHost: (fieldId: string) => {
      if (hostFieldIdRef.current === null) {
        hostFieldIdRef.current = fieldId;
      }
      return hostFieldIdRef.current === fieldId;
    },
  };
};
