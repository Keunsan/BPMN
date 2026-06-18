"use client";

import { useUIStore } from "@/lib/store/ui.store";
import { FILTER_PANEL_COLLAPSED_WIDTH_PX } from "@/components/common/layout/panel-styles";

import {
  useHorizontalPanelResize,
  type UseHorizontalPanelResizeOptions,
} from "./useHorizontalPanelResize";

type UseFilterPanelSideLayoutOptions = Omit<
  UseHorizontalPanelResizeOptions,
  "enabled"
> & {
  enabled?: boolean;
};

/** FilterPanel 좌측 + 콘텐츠 우측 — 접기·가로 리사이즈 연동 */
export const useFilterPanelSideLayout = ({
  enabled = true,
  ...resizeOptions
}: UseFilterPanelSideLayoutOptions) => {
  const filterPanelCollapsed = useUIStore((state) => state.filterPanelCollapsed);
  const resizeEnabled = enabled && !filterPanelCollapsed;

  const {
    width: panelWidth,
    isResizing,
    handleResizePointerDown,
  } = useHorizontalPanelResize({
    ...resizeOptions,
    enabled: resizeEnabled,
  });

  return {
    filterPanelCollapsed,
    panelWidth,
    effectivePanelWidth: filterPanelCollapsed
      ? FILTER_PANEL_COLLAPSED_WIDTH_PX
      : panelWidth,
    isResizing,
    handleResizePointerDown,
    showHorizontalSplitter: !filterPanelCollapsed,
  };
};
