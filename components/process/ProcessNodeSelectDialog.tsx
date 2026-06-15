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
import type { ProcessLevel, ProcessNodeTree } from "@/types/process";

export type ProcessNodeSelection = {
  nodeId: number;
  code: string;
  name: string;
  level: ProcessLevel;
};

type ProcessNodeSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  allowedLevels: ProcessLevel[];
  excludeNodeIds?: number[];
  selectedProcess?: ProcessNodeSelection | null;
  currentProcess?: ProcessNodeSelection | null;
  currentProcessLabel?: string;
  helperText?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: (process: ProcessNodeSelection | null) => void;
  onCancel?: () => void;
  extraAction?: ReactNode;
  contentClassName?: string;
  treeShellClassName?: string;
};

/** 프로세스 트리에서 지정 레벨(L3/L4 등) 노드를 선택하는 공통 다이얼로그 */
export const ProcessNodeSelectDialog = ({
  open,
  onOpenChange,
  title,
  description,
  allowedLevels,
  excludeNodeIds = [],
  selectedProcess,
  currentProcess,
  currentProcessLabel,
  helperText,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  extraAction,
  contentClassName,
  treeShellClassName,
}: ProcessNodeSelectDialogProps) => {
  const excludeSet = new Set(excludeNodeIds);
  const allowedSet = new Set(allowedLevels);
  const [selected, setSelected] = useState<ProcessNodeSelection | null>(
    selectedProcess ?? currentProcess ?? null,
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelected(selectedProcess ?? currentProcess ?? null);
    }
    onOpenChange(nextOpen);
  };

  const handleSelect = (node: ProcessNodeTree) => {
    if (!allowedSet.has(node.level) || excludeSet.has(node.nodeId)) {
      return;
    }

    setSelected({
      nodeId: node.nodeId,
      code: node.code,
      name: node.name,
      level: node.level,
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
      <DialogContent className={contentClassName ?? "max-w-lg"}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {currentProcess && currentProcessLabel && (
          <p className="text-sm text-muted-foreground">
            {currentProcessLabel}: {currentProcess.code} - {currentProcess.name}
          </p>
        )}

        <div
          className={
            treeShellClassName ??
            "max-h-80 overflow-y-auto rounded-md border p-2"
          }
        >
          <ProcessTree
            variant="picker"
            selectedId={selected?.nodeId ?? currentProcess?.nodeId}
            onSelect={handleSelect}
            selectableLevels={allowedLevels}
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
