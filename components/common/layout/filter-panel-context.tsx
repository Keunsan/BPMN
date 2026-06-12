"use client";

import { createContext, useContext } from "react";

type FilterPanelContextValue = {
  fieldIndex: number;
  showCollapseToggle: boolean;
};

export const FilterPanelContext = createContext<FilterPanelContextValue | null>(
  null,
);

export const useFilterPanelFieldSlot = () => {
  const context = useContext(FilterPanelContext);
  if (!context) {
    return { fieldIndex: -1, showCollapseToggle: false };
  }

  return context;
};
