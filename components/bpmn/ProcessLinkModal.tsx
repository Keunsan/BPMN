"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  L4ProcessSelectDialog,
  type L4ProcessSelection,
} from "@/components/process/L4ProcessSelectDialog";

export type ProcessLinkInfo = L4ProcessSelection;

type ProcessLinkModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementName?: string | null;
  currentLink?: ProcessLinkInfo | null;
  onConfirm: (link: ProcessLinkInfo | null) => void;
};

/** BPMN Task → L4 프로세스 연결 모달 */
export const ProcessLinkModal = ({
  open,
  onOpenChange,
  elementName,
  currentLink,
  onConfirm,
}: ProcessLinkModalProps) => {
  const t = useTranslations("bpmn");

  return (
    <L4ProcessSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("linkProcess")}
      description={
        elementName
          ? t("linkProcessDesc", { name: elementName })
          : t("linkProcessDescGeneric")
      }
      currentProcess={currentLink}
      currentProcessLabel={t("currentLink")}
      helperText={t("linkL4Only")}
      confirmLabel={t("confirmLink")}
      onConfirm={onConfirm}
      extraAction={
        currentLink ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onConfirm(null);
              onOpenChange(false);
            }}
          >
            {t("unlink")}
          </Button>
        ) : null
      }
    />
  );
};
