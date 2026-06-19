"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PasteConfirmDialogProps = {
  open: boolean;
  cellCount: number;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 대량 붙여넣기 확인 다이얼로그 */
export const PasteConfirmDialog = ({
  open,
  cellCount,
  onConfirm,
  onCancel,
}: PasteConfirmDialogProps) => {
  const t = useTranslations("editableGrid");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pasteConfirmTitle")}</DialogTitle>
          <DialogDescription>
            {t("pasteConfirmDesc", { count: cellCount })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("pasteCancel")}
          </Button>
          <Button type="button" onClick={onConfirm}>
            {t("pasteProceed")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type PasteOverflowDialogProps = {
  open: boolean;
  onClose: () => void;
};

/** 붙여넣기 범위 초과 알림 */
export const PasteOverflowDialog = ({ open, onClose }: PasteOverflowDialogProps) => {
  const t = useTranslations("editableGrid");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pasteOverflowTitle")}</DialogTitle>
          <DialogDescription>{t("pasteOverflowDesc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            {t("pasteOverflowOk")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
