"use client";

import { GripVertical, Link2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  endProcessLinkDrag,
  writeProcessLinkDrag,
} from "@/lib/constants/process-link";
import { useProcessTree } from "@/lib/query/hooks/useProcess";
import { cn } from "@/lib/utils";
import type { ProcessNodeTree } from "@/types/process";

import type { ProcessLinkInfo } from "./ProcessLinkModal";

type ProcessLinkSidebarProps = {
  parentNodeId: number;
  parentCode?: string | null;
  parentName?: string | null;
  links: Record<string, ProcessLinkInfo>;
  selectedElementId: string | null;
  selectedElementName: string | null;
  onLinkToSelected: (link: ProcessLinkInfo) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  width?: number;
  className?: string;
};

/** 트리에서 nodeId에 해당하는 노드를 찾는다 */
const findNodeInTree = (
  nodes: ProcessNodeTree[],
  nodeId: number,
): ProcessNodeTree | null => {
  for (const node of nodes) {
    if (node.nodeId === nodeId) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeInTree(node.children, nodeId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

/** BPMN 에디터 좌측 L4 프로세스 연결 패널 */
export const ProcessLinkSidebar = ({
  parentNodeId,
  parentCode,
  parentName,
  links,
  selectedElementId,
  selectedElementName,
  onLinkToSelected,
  open = true,
  onOpenChange,
  width = 288,
  className,
}: ProcessLinkSidebarProps) => {
  const t = useTranslations("bpmn");
  const [search, setSearch] = useState("");
  const { data: tree, isLoading, isError } = useProcessTree();

  const l4Processes = useMemo(() => {
    if (!tree?.length) {
      return [];
    }
    const parent = findNodeInTree(tree, parentNodeId);
    return (parent?.children ?? []).filter((node) => node.level === "L4");
  }, [parentNodeId, tree]);

  const filteredProcesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return l4Processes;
    }
    return l4Processes.filter((node) =>
      `${node.code} ${node.name}`.toLowerCase().includes(q),
    );
  }, [l4Processes, search]);

  const linkedCountByNodeId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const link of Object.values(links)) {
      counts.set(link.nodeId, (counts.get(link.nodeId) ?? 0) + 1);
    }
    return counts;
  }, [links]);

  const handleItemClick = (node: ProcessNodeTree) => {
    if (!selectedElementId) {
      return;
    }
    onLinkToSelected({
      nodeId: node.nodeId,
      code: node.code,
      name: node.name,
    });
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    node: ProcessNodeTree,
  ) => {
    const payload: ProcessLinkInfo = {
      nodeId: node.nodeId,
      code: node.code,
      name: node.name,
    };
    writeProcessLinkDrag(event.dataTransfer, payload);
  };

  const handleDragEnd = () => {
    endProcessLinkDrag();
  };

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 shrink-0 flex-col border-r bg-muted/20",
        !open && "w-9",
        className,
      )}
      style={open ? { width } : undefined}
    >
      <div className={cn("border-b", open ? "space-y-1 px-3 py-3" : "px-1 py-2")}>
        {open ? (
          <>
            <div className="flex items-center gap-2">
              <Link2 className="size-4 shrink-0 text-violet-600" />
              <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">
                {t("linkPanelTitle")}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 shrink-0"
                onClick={() => onOpenChange?.(false)}
                title={t("linkPanelCollapse")}
                aria-label={t("linkPanelCollapse")}
              >
                <PanelLeftClose className="size-3.5" />
              </Button>
            </div>
            {(parentCode || parentName) && (
              <p className="truncate text-xs text-muted-foreground">
                {parentCode} {parentName}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("linkPanelDesc")}</p>
          </>
        ) : (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6"
              onClick={() => onOpenChange?.(true)}
              title={t("linkPanelExpand")}
              aria-label={t("linkPanelExpand")}
            >
              <PanelLeftOpen className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {open && (
        <>
      <div className="border-b px-3 py-2">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("linkPanelSearch")}
          className="w-full"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <LoadingSpinner label={t("loading")} className="py-8" />
        ) : isError ? (
          <EmptyState title={t("linkPanelLoadError")} className="py-6" />
        ) : filteredProcesses.length === 0 ? (
          <EmptyState title={t("linkPanelEmpty")} className="py-6" />
        ) : (
          <ul className="space-y-1">
            {filteredProcesses.map((node) => {
              const linkedCount = linkedCountByNodeId.get(node.nodeId) ?? 0;
              const isLinkedToSelection =
                Boolean(selectedElementId) &&
                links[selectedElementId]?.nodeId === node.nodeId;

              return (
                <li key={node.nodeId}>
                  <div
                    className={cn(
                      "flex w-full items-stretch overflow-hidden rounded-md border bg-background text-sm transition-colors",
                      isLinkedToSelection && "border-violet-400 bg-violet-50/80 dark:bg-violet-950/30",
                    )}
                  >
                    <div
                      draggable
                      onDragStart={(event) => handleDragStart(event, node)}
                      onDragEnd={handleDragEnd}
                      className="flex shrink-0 cursor-grab items-center px-1.5 text-muted-foreground/60 active:cursor-grabbing hover:bg-muted/60"
                      title={t("linkPanelDropHint")}
                    >
                      <GripVertical className="size-3.5" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleItemClick(node)}
                      disabled={!selectedElementId}
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left transition-colors",
                        selectedElementId
                          ? "cursor-pointer hover:bg-violet-50/60 dark:hover:bg-violet-950/20"
                          : "cursor-default opacity-80",
                      )}
                      title={
                        selectedElementId
                          ? t("linkPanelClickHint", {
                              task: selectedElementName ?? selectedElementId,
                            })
                          : t("linkPanelSelectTask")
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {node.code}
                        </p>
                        <p className="truncate font-medium">{node.name}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={node.status} className="text-[10px]" />
                        {linkedCount > 0 && (
                          <span className="text-[10px] text-violet-600">
                            {t("linkPanelLinkedCount", { count: linkedCount })}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        {selectedElementId
          ? t("linkPanelActiveTask", {
              name: selectedElementName ?? selectedElementId,
            })
          : t("linkPanelSelectTask")}
      </div>
        </>
      )}
    </aside>
  );
};
