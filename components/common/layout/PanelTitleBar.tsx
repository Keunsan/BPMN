"use client";

import { panelTitleBarClass } from "@/components/common/layout/panel-styles";

type PanelTitleBarProps = {
  title?: string;
  count?: number;
  countSuffix?: string;
  toolbar?: React.ReactNode;
  icon?: boolean;
};

/** DataGrid·ContentPanel 공통 제목 바 */
export const PanelTitleBar = ({
  title,
  count,
  countSuffix,
  toolbar,
  icon,
}: PanelTitleBarProps) => {
  const showTitleBar = Boolean(title || count !== undefined || toolbar || icon);

  if (!showTitleBar) {
    return null;
  }

  return (
    <div className={panelTitleBarClass}>
      <div className="flex min-w-0 items-center gap-2">
        {icon ? (
          <span className="inline-flex size-2.5 shrink-0 rounded-[3px] bg-primary" />
        ) : null}
        {title ? (
          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {title}
          </span>
        ) : null}
        {count !== undefined ? (
          <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
            ({count.toLocaleString()}
            {countSuffix ? ` ${countSuffix}` : ""})
          </span>
        ) : null}
      </div>
      {toolbar ? (
        <div className="flex shrink-0 items-center gap-1.5">{toolbar}</div>
      ) : null}
    </div>
  );
};
