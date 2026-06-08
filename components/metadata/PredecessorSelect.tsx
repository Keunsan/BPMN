"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UpsertTaskPredecessorDto } from "@/types/metadata";
import type { ProcessNodeTree } from "@/types/process";

export type PredecessorSelection = UpsertTaskPredecessorDto & {
  predecessorCode?: string;
  predecessorName?: string;
  predecessorLevel?: ProcessNodeTree["level"];
};

type PredecessorSelectProps = {
  nodeId: number;
  value: PredecessorSelection[];
  onChange: (value: PredecessorSelection[]) => void;
};

/** 선행 프로세스를 트리에서 다중 선택하고 조건을 편집한다. */
export const PredecessorSelect = ({
  nodeId,
  value,
  onChange,
}: PredecessorSelectProps) => {
  const t = useTranslations("metadata");
  const [open, setOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ProcessNodeTree | null>(null);

  const selectedIds = useMemo(
    () => new Set(value.map((item) => item.predecessorNodeId)),
    [value],
  );

  const updateItem = (
    predecessorNodeId: number,
    patch: Partial<PredecessorSelection>,
  ) => {
    onChange(
      value.map((item) =>
        item.predecessorNodeId === predecessorNodeId
          ? { ...item, ...patch }
          : item,
      ),
    );
  };

  const removeItem = (predecessorNodeId: number) => {
    onChange(
      value.filter((item) => item.predecessorNodeId !== predecessorNodeId),
    );
  };

  const addSelectedNode = () => {
    if (!selectedNode) return;
    if (selectedNode.nodeId === nodeId) return;
    if (selectedNode.level !== "L3" && selectedNode.level !== "L4") return;
    if (selectedIds.has(selectedNode.nodeId)) return;

    onChange([
      ...value,
      {
        predecessorNodeId: selectedNode.nodeId,
        predecessorCode: selectedNode.code,
        predecessorName: selectedNode.name,
        predecessorLevel: selectedNode.level,
        conditionDesc: null,
        isMandatory: true,
      },
    ]);
    setSelectedNode(null);
    setOpen(false);
  };

  const selectedNodeInvalid =
    selectedNode &&
    (selectedNode.nodeId === nodeId ||
      selectedIds.has(selectedNode.nodeId) ||
      (selectedNode.level !== "L3" && selectedNode.level !== "L4"));

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <EmptyState title={t("noPredecessor")} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t("order")}</TableHead>
              <TableHead>{t("processCode")}</TableHead>
              <TableHead>{t("processName")}</TableHead>
              <TableHead>{t("conditionDesc")}</TableHead>
              <TableHead className="w-24">{t("mandatory")}</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {value.map((item, index) => (
              <TableRow key={item.predecessorNodeId}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                  {item.predecessorCode ?? item.predecessorNodeId}
                </TableCell>
                <TableCell>{item.predecessorName ?? "-"}</TableCell>
                <TableCell>
                  <Input
                    value={item.conditionDesc ?? ""}
                    onChange={(event) =>
                      updateItem(item.predecessorNodeId, {
                        conditionDesc: event.target.value,
                      })
                    }
                    placeholder={t("conditionPlaceholder")}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={item.isMandatory ?? true}
                    onChange={(event) =>
                      updateItem(item.predecessorNodeId, {
                        isMandatory: event.target.checked,
                      })
                    }
                    aria-label={t("mandatory")}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeItem(item.predecessorNodeId)}
                    aria-label={t("removePredecessor")}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t("addPredecessor")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("selectPredecessor")}</DialogTitle>
            <DialogDescription>{t("selectPredecessorDesc")}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto rounded-md border p-3">
            <ProcessTree
              selectedId={selectedNode?.nodeId}
              onSelect={setSelectedNode}
              variant="picker"
            />
          </div>

          {selectedNodeInvalid && (
            <p className="text-sm text-destructive">
              {selectedNode?.nodeId === nodeId
                ? t("selfPredecessorError")
                : selectedIds.has(selectedNode?.nodeId ?? 0)
                  ? t("duplicatePredecessorError")
                  : t("taskLevelOnly")}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={addSelectedNode}
              disabled={!selectedNode || Boolean(selectedNodeInvalid)}
            >
              {t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
