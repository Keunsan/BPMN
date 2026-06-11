"use client";

import { type ReactNode, useState } from "react";

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

export type L4ProcessSelection = {
  nodeId: number;
  code: string;
  name: string;
};

type L4ProcessSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  selectedProcess?: L4ProcessSelection | null;
  currentProcess?: L4ProcessSelection | null;
  currentProcessLabel?: string;
  helperText?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: (process: L4ProcessSelection | null) => void;
  onCancel?: () => void;
  extraAction?: ReactNode;
};

/** L4 프로세스를 트리에서 선택하는 공통 다이얼로그 */
export const L4ProcessSelectDialog = ({
  open,
  onOpenChange,
  title,
  description,
  selectedProcess,
  currentProcess,
  currentProcessLabel,
  helperText,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  extraAction,
}: L4ProcessSelectDialogProps) => {
  const [selected, setSelected] = useState<L4ProcessSelection | null>(
    selectedProcess ?? currentProcess ?? null,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelected(selectedProcess ?? currentProcess ?? null);
    }
    onOpenChange(nextOpen);
  };

  const handleSelect = (node: ProcessNodeTree) => {
    if (node.level !== "L4") {
      return;
    }

    setSelected({
      nodeId: node.nodeId,
      code: node.code,
      name: node.name,
    });
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm(selected ?? currentProcess ?? null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {currentProcess && currentProcessLabel && (
          <p className="text-sm text-muted-foreground">
            {currentProcessLabel}: {currentProcess.code} - {currentProcess.name}
          </p>
        )}

        <div className="max-h-80 overflow-y-auto rounded-md border p-2">
          <ProcessTree
            variant="picker"
            selectedId={selected?.nodeId ?? currentProcess?.nodeId}
            onSelect={handleSelect}
          />
        </div>

        {helperText && (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {extraAction}
          {cancelLabel && (
            <Button type="button" variant="outline" onClick={handleCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button type="button" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
