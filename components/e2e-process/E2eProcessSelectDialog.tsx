"use client";

import { GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useE2eProcessList } from "@/lib/query/hooks/useE2eProcess";
import { cn } from "@/lib/utils";
import type { E2eProcessDto } from "@/types/e2e-process";

type E2eProcessSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: number | null;
  onConfirm: (process: E2eProcessDto) => void;
};

/** E2E 프로세스 선택 다이얼로그 */
export const E2eProcessSelectDialog = ({
  open,
  onOpenChange,
  selectedId,
  onConfirm,
}: E2eProcessSelectDialogProps) => {
  const t = useTranslations("e2eProcess");
  const tc = useTranslations("common");
  const { data: items, isLoading, isError } = useE2eProcessList();
  const [picked, setPicked] = useState<number | null>(selectedId ?? null);

  useEffect(() => {
    if (open) {
      setPicked(selectedId ?? null);
    }
  }, [open, selectedId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("selectTitle")}</DialogTitle>
          <DialogDescription>{t("selectDesc")}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <LoadingSpinner className="py-8" />
        ) : isError ? (
          <EmptyState title={t("loadError")} />
        ) : !items?.length ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="max-h-[min(60vh,28rem)] space-y-1 overflow-y-auto rounded-md border p-2">
            {items.map((item) => (
              <li key={item.e2eProcessId}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/60",
                    picked === item.e2eProcessId && "bg-muted",
                  )}
                  onClick={() => setPicked(item.e2eProcessId)}
                >
                  <GitBranch className="mt-0.5 size-4 shrink-0 text-sky-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.code}</span>
                  </span>
                  <StatusBadge status={item.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button
            disabled={!picked}
            onClick={() => {
              const found = items?.find((item) => item.e2eProcessId === picked);
              if (found) {
                onConfirm(found);
                onOpenChange(false);
              }
            }}
          >
            {tc("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
