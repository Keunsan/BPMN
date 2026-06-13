"use client";

import { useTranslations } from "next-intl";

import {
  ProcessNodeSelectDialog,
  type ProcessNodeSelection,
} from "@/components/process/ProcessNodeSelectDialog";
import { Button } from "@/components/ui/button";
import type { BpmnElementType, ProcessLinkInfo } from "@/types/bpmn";

export type { ProcessLinkInfo };

type ProcessLinkModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementName?: string | null;
  elementType?: BpmnElementType | null;
  ownerNodeId: number;
  currentLink?: ProcessLinkInfo | null;
  onConfirm: (link: ProcessLinkInfo | null) => void;
};

const toProcessLinkInfo = (process: ProcessNodeSelection): ProcessLinkInfo => ({
  nodeId: process.nodeId,
  code: process.code,
  name: process.name,
  level: process.level === "L3" ? "L3" : "L4",
  linkKind: process.level === "L3" ? "L3_CALL" : "L4_TASK",
});

/** BPMN Task/Call Activity → L4/L3 프로세스 연결 모달 */
export const ProcessLinkModal = ({
  open,
  onOpenChange,
  elementName,
  elementType,
  ownerNodeId,
  currentLink,
  onConfirm,
}: ProcessLinkModalProps) => {
  const t = useTranslations("bpmn");
  const isCallActivity = elementType === "CALL_ACTIVITY";

  return (
    <ProcessNodeSelectDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCallActivity ? t("linkCallActivity") : t("linkProcess")}
      description={
        elementName
          ? isCallActivity
            ? t("linkCallActivityDesc", { name: elementName })
            : t("linkProcessDesc", { name: elementName })
          : isCallActivity
            ? t("linkCallActivityDescGeneric")
            : t("linkProcessDescGeneric")
      }
      allowedLevels={isCallActivity ? ["L3"] : ["L4"]}
      excludeNodeIds={isCallActivity ? [ownerNodeId] : []}
      currentProcess={
        currentLink
          ? {
              nodeId: currentLink.nodeId,
              code: currentLink.code,
              name: currentLink.name,
              level: currentLink.level,
            }
          : null
      }
      currentProcessLabel={t("currentLink")}
      helperText={isCallActivity ? t("linkL3CallHint") : t("linkL4Only")}
      confirmLabel={t("confirmLink")}
      onConfirm={(process) => {
        onConfirm(process ? toProcessLinkInfo(process) : null);
      }}
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
