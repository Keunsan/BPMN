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
import {
  flattenL3Processes,
  isBpmnCallActivityType,
  isProcessLinkCompatible,
  toScopedL3LinkPayload,
  type ProcessScopeContext,
} from "@/lib/utils/bpmn-link";
import { cn } from "@/lib/utils";
import type { BpmnElementType, ProcessLinkInfo } from "@/types/bpmn";
import type { ProcessNodeTree } from "@/types/process";

type LinkPanelTab = "L4" | "L3";

type ProcessLinkSidebarProps = {
  parentNodeId: number;
  parentCode?: string | null;
  parentName?: string | null;
  companyCode?: string | null;
  businessUnitCode?: string | null;
  selectedElementType?: BpmnElementType | null;
  links: Record<string, ProcessLinkInfo>;
  selectedElementId: string | null;
  selectedElementName: string | null;
  onLinkToSelected: (link: ProcessLinkInfo) => void;
  /** E2E BPMN: L3 탭만, L4 숨김 */
  e2eMode?: boolean;
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

const toLinkPayload = (
  node: ProcessNodeTree,
  tab: LinkPanelTab,
): ProcessLinkInfo => ({
  nodeId: node.nodeId,
  code: node.code,
  name: node.name,
  level: tab === "L3" ? "L3" : "L4",
  linkKind: tab === "L3" ? "L3_CALL" : "L4_TASK",
});

/** BPMN 에디터 좌측 L4/L3 프로세스 연결 패널 */
export const ProcessLinkSidebar = ({
  parentNodeId,
  parentCode,
  parentName,
  companyCode,
  businessUnitCode,
  selectedElementType,
  links,
  selectedElementId,
  selectedElementName,
  onLinkToSelected,
  e2eMode = false,
  open = true,
  onOpenChange,
  width = 288,
  className,
}: ProcessLinkSidebarProps) => {
  const t = useTranslations("bpmn");
  const [search, setSearch] = useState("");
  const [browseTab, setBrowseTab] = useState<LinkPanelTab>(e2eMode ? "L3" : "L4");
  const scope: ProcessScopeContext = { companyCode, businessUnitCode };
  const { data: tree, isLoading, isError } = useProcessTree({
    companyCode: companyCode ?? undefined,
    businessUnitCode: businessUnitCode ?? undefined,
  });

  const tab: LinkPanelTab = e2eMode
    ? "L3"
    : selectedElementType
      ? isBpmnCallActivityType(selectedElementType)
        ? "L3"
        : "L4"
      : browseTab;

  const l4Processes = useMemo(() => {
    if (!tree?.length) {
      return [];
    }
    const parent = findNodeInTree(tree, parentNodeId);
    return (parent?.children ?? []).filter((node) => node.level === "L4");
  }, [parentNodeId, tree]);

  const l3Processes = useMemo(() => {
    if (!tree?.length) {
      return [];
    }
    return flattenL3Processes(tree, e2eMode ? [] : [parentNodeId]);
  }, [e2eMode, parentNodeId, tree]);

  const buildLinkPayload = (node: ProcessNodeTree, linkTab: LinkPanelTab) => {
    if (linkTab === "L3" && tree?.length) {
      return toScopedL3LinkPayload(node, tree, scope);
    }
    return toLinkPayload(node, linkTab);
  };

  const activeList = tab === "L3" ? l3Processes : l4Processes;

  const filteredProcesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return activeList;
    }
    return activeList.filter((node) =>
      `${node.code} ${node.name}`.toLowerCase().includes(q),
    );
  }, [activeList, search]);

  const linkedCountByNodeId = useMemo(() => {
    const counts = new Map<number, number>();
    for (const link of Object.values(links)) {
      counts.set(link.nodeId, (counts.get(link.nodeId) ?? 0) + 1);
    }
    return counts;
  }, [links]);

  const canLinkSelection =
    selectedElementId !== null &&
    (tab === "L3"
      ? isBpmnCallActivityType(selectedElementType ?? undefined)
      : !isBpmnCallActivityType(selectedElementType ?? undefined));

  const handleItemClick = (node: ProcessNodeTree) => {
    if (!selectedElementId || !canLinkSelection) {
      return;
    }
    const payload = buildLinkPayload(node, tab);
    if (!isProcessLinkCompatible(selectedElementType, payload)) {
      return;
    }
    onLinkToSelected(payload);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    node: ProcessNodeTree,
  ) => {
    if (!canLinkSelection) {
      event.preventDefault();
      return;
    }
    const payload = buildLinkPayload(node, tab);
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
          <div className="flex gap-1 border-b px-2 py-2">
            {!e2eMode ? (
              <Button
                type="button"
                size="sm"
                variant={tab === "L4" ? "default" : "outline"}
                className="h-7 flex-1 text-xs"
                onClick={() => setBrowseTab("L4")}
              >
                {t("linkPanelTabL4")}
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant={tab === "L3" ? "default" : "outline"}
              className={cn("h-7 text-xs", e2eMode ? "flex-1" : "flex-1")}
              onClick={() => setBrowseTab("L3")}
            >
              {t("linkPanelTabL3")}
            </Button>
          </div>

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
              <EmptyState
                title={tab === "L3" ? t("linkPanelEmptyL3") : t("linkPanelEmpty")}
                className="py-6"
              />
            ) : (
              <ul className="space-y-1">
                {filteredProcesses.map((node) => {
                  const linkedCount = linkedCountByNodeId.get(node.nodeId) ?? 0;
                  const isLinkedToSelection =
                    selectedElementId !== null &&
                    links[selectedElementId]?.nodeId === node.nodeId;

                  return (
                    <li key={node.nodeId}>
                      <div
                        className={cn(
                          "flex w-full items-stretch overflow-hidden rounded-md border bg-background text-sm transition-colors",
                          isLinkedToSelection &&
                            "border-violet-400 bg-violet-50/80 dark:bg-violet-950/30",
                        )}
                      >
                        <div
                          draggable={canLinkSelection}
                          onDragStart={(event) => handleDragStart(event, node)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "flex shrink-0 items-center px-1.5 text-muted-foreground/60",
                            canLinkSelection
                              ? "cursor-grab active:cursor-grabbing hover:bg-muted/60"
                              : "cursor-not-allowed opacity-40",
                          )}
                          title={t("linkPanelDropHint")}
                        >
                          <GripVertical className="size-3.5" />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleItemClick(node)}
                          disabled={!canLinkSelection}
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left transition-colors",
                            canLinkSelection
                              ? "cursor-pointer hover:bg-violet-50/60 dark:hover:bg-violet-950/20"
                              : "cursor-default opacity-80",
                          )}
                          title={
                            canLinkSelection
                              ? t("linkPanelClickHint", {
                                  task: selectedElementName ?? selectedElementId ?? "",
                                })
                              : tab === "L3"
                                ? t("linkPanelSelectCallActivity")
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
                            <StatusBadge status={node.status} className="text-xs" />
                            {linkedCount > 0 && (
                              <span className="text-xs text-violet-600">
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
            {!selectedElementId
              ? t("linkPanelSelectTask")
              : !canLinkSelection
                ? tab === "L3"
                  ? t("linkPanelSelectCallActivity")
                  : t("linkPanelSelectTask")
                : t("linkPanelActiveTask", {
                    name: selectedElementName ?? selectedElementId,
                  })}
          </div>
        </>
      )}
    </aside>
  );
};
