"use client";

import { PanelTitleBar } from "@/components/common/layout/PanelTitleBar";
import {
  listPageContentBodyClass,
  pamsContentPanelClass,
} from "@/components/common/layout/panel-styles";
import { cn } from "@/lib/utils";

type ContentPanelProps = {
  children: React.ReactNode;
  title?: string;
  count?: number;
  countSuffix?: string;
  toolbar?: React.ReactNode;
  icon?: boolean;
  className?: string;
  bodyClassName?: string;
  fillHeight?: boolean;
};

/** DataGrid 외 커스텀 콘텐츠용 표준 패널 */
export const ContentPanel = ({
  children,
  title,
  count,
  countSuffix,
  toolbar,
  icon,
  className,
  bodyClassName,
  fillHeight = true,
}: ContentPanelProps) => (
  <div
    className={cn(
      pamsContentPanelClass,
      fillHeight && "min-h-0 flex-1",
      className,
    )}
  >
    <PanelTitleBar
      title={title}
      count={count}
      countSuffix={countSuffix}
      toolbar={toolbar}
      icon={icon}
    />
    <div
      className={cn(
        "min-h-0 flex-1 overflow-auto",
        fillHeight && listPageContentBodyClass,
        bodyClassName,
      )}
    >
      {children}
    </div>
  </div>
);
