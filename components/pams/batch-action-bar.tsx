"use client";

import { Loader2, RotateCcw, Save } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BatchActionBarProps = {
  dirtyCount: number;
  saving?: boolean;
  onSave: () => void;
  onRevert: () => void;
  className?: string;
};

/** 편집 그리드 하단 sticky 일괄 저장·되돌리기 바 */
export const BatchActionBar = ({
  dirtyCount,
  saving = false,
  onSave,
  onRevert,
  className,
}: BatchActionBarProps) => {
  const t = useTranslations("editableGrid");

  if (dirtyCount <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 flex shrink-0 items-center justify-between gap-3 border-t bg-background/95 px-4 py-2.5 backdrop-blur-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">
        {t("dirtyCount", { count: dirtyCount })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={onRevert}
        >
          <RotateCcw className="size-3.5" />
          {t("revertAll")}
        </Button>
        <Button type="button" size="sm" disabled={saving} onClick={onSave}>
          {saving ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          {saving ? t("saving") : t("saveAll")}
        </Button>
      </div>
    </div>
  );
};
