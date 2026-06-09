"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPathname, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useNavigationGuardStore } from "@/lib/store/navigation-guard.store";

/** 미저장 변경 시 메뉴 이동 확인 다이얼로그 */
export const NavigationGuardDialog = () => {
  const t = useTranslations("bpmn");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const dialogOpen = useNavigationGuardStore((s) => s.dialogOpen);
  const pendingHref = useNavigationGuardStore((s) => s.pendingHref);
  const isBlocking = useNavigationGuardStore((s) => s.isBlocking);
  const saveBeforeLeave = useNavigationGuardStore((s) => s.saveBeforeLeave);
  const closeLeaveDialog = useNavigationGuardStore((s) => s.closeLeaveDialog);
  const setBlocking = useNavigationGuardStore((s) => s.setBlocking);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isBlocking) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBlocking]);

  const navigatePending = () => {
    if (!pendingHref) {
      return;
    }

    const targetPath = getPathname({ href: pendingHref, locale });
    closeLeaveDialog();
    setBlocking(false);

    if (targetPath !== pathname) {
      router.push(pendingHref);
    }
  };

  const handleDiscard = () => {
    navigatePending();
  };

  const handleSave = async () => {
    if (!saveBeforeLeave || !pendingHref) {
      handleDiscard();
      return;
    }

    setSaving(true);
    try {
      const saved = await saveBeforeLeave();
      if (saved) {
        navigatePending();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeLeaveDialog();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("leaveConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("leaveConfirmDesc")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={closeLeaveDialog}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={handleDiscard}
          >
            {t("leaveWithoutSave")}
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? t("saving") : t("saveAndLeave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
