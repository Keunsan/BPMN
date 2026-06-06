"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ProcessTree } from "@/components/process/ProcessTree";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProcessNodeTree } from "@/types/process";

export type ProcessLinkInfo = {
  nodeId: number;
  code: string;
  name: string;
};

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
  const [selected, setSelected] = useState<ProcessNodeTree | null>(null);

  const handleConfirm = () => {
    if (!selected) {
      onConfirm(currentLink ?? null);
    } else {
      onConfirm({
        nodeId: selected.nodeId,
        code: selected.code,
        name: selected.name,
      });
    }
    onOpenChange(false);
  };

  const handleSelect = (node: ProcessNodeTree) => {
    if (node.level === "L4") {
      setSelected(node);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("linkProcess")}</DialogTitle>
          <DialogDescription>
            {elementName
              ? t("linkProcessDesc", { name: elementName })
              : t("linkProcessDescGeneric")}
          </DialogDescription>
        </DialogHeader>

        {currentLink && (
          <p className="text-sm text-muted-foreground">
            {t("currentLink")}: {currentLink.code} — {currentLink.name}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto rounded-md border p-2">
          <ProcessTree
            variant="picker"
            selectedId={selected?.nodeId ?? currentLink?.nodeId}
            onSelect={handleSelect}
          />
        </div>

        <p className="text-xs text-muted-foreground">{t("linkL4Only")}</p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onConfirm(null);
              onOpenChange(false);
            }}
          >
            {t("unlink")}
          </Button>
          <Button onClick={handleConfirm}>
            {t("confirmLink")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
