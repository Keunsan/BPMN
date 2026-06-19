"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
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

  const updateItem = useCallback(
    (predecessorNodeId: number, patch: Partial<PredecessorSelection>) => {
      onChange(
        value.map((item) =>
          item.predecessorNodeId === predecessorNodeId
            ? { ...item, ...patch }
            : item,
        ),
      );
    },
    [onChange, value],
  );

  const removeItem = useCallback(
    (predecessorNodeId: number) => {
      onChange(
        value.filter((item) => item.predecessorNodeId !== predecessorNodeId),
      );
    },
    [onChange, value],
  );

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

  const columns = useMemo<DataGridColumn<PredecessorSelection>[]>(
    () => [
      {
        key: "order",
        header: t("order"),
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_item, rowIndex) => rowIndex + 1,
      },
      {
        key: "processCode",
        header: t("processCode"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (item) => String(item.predecessorCode ?? item.predecessorNodeId),
        cell: (item) => (
          <span className="font-mono text-sm">
            {item.predecessorCode ?? item.predecessorNodeId}
          </span>
        ),
      },
      {
        key: "processName",
        header: t("processName"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (item) => item.predecessorName ?? "",
        cell: (item) => item.predecessorName ?? "-",
      },
      {
        key: "conditionDesc",
        header: t("conditionDesc"),
        width: 240,
        minWidth: 180,
        cell: (item) => (
          <Input
            value={item.conditionDesc ?? ""}
            onChange={(event) =>
              updateItem(item.predecessorNodeId, {
                conditionDesc: event.target.value,
              })
            }
            placeholder={t("conditionPlaceholder")}
          />
        ),
      },
      {
        key: "mandatory",
        header: t("mandatory"),
        width: 88,
        minWidth: 72,
        align: "center",
        cell: (item) => (
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
        ),
      },
      {
        key: "actions",
        header: "",
        width: 56,
        minWidth: 48,
        align: "center",
        cell: (item) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => removeItem(item.predecessorNodeId)}
            aria-label={t("removePredecessor")}
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [removeItem, t, updateItem],
  );

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <EmptyState title={t("noPredecessor")} />
      ) : (
        <DataGrid
          columns={columns}
          data={value}
          rowKey={(item) => item.predecessorNodeId}
          storageKey="pams-predecessor-select-grid"
          fillHeight={false}
        />
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
