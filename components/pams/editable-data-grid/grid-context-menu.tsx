"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export type ContextMenuAction = {
  id: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
};

type GridContextMenuProps = {
  open: boolean;
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
};

/** 그리드 우클릭 컨텍스트 메뉴 */
export const GridContextMenu = ({
  open,
  x,
  y,
  actions,
  onClose,
}: GridContextMenuProps) => {
  const t = useTranslations("editableGrid");

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden />
      <div
        role="menu"
        aria-label={t("contextMenuLabel")}
        className={cn(
          "fixed z-50 min-w-36 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
        )}
        style={{ left: x, top: y }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            onClick={() => {
              action.onSelect();
              onClose();
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
};
