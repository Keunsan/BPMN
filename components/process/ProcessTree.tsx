"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useDeleteProcess,
  useMoveProcess,
  useProcessDeleteImpact,
  useProcessTree,
} from "@/lib/query/hooks/useProcess";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type {
  ProcessDeleteImpact,
  ProcessLevel,
  ProcessNodeTree,
} from "@/types/process";

const levelStyles: Record<ProcessLevel, string> = {
  L1: "text-blue-600",
  L2: "text-emerald-600",
  L3: "text-amber-600",
  L4: "text-violet-600",
};

type ProcessTreeProps = {
  selectedId?: number;
  onSelect?: (node: ProcessNodeTree) => void;
  onCreate?: (parentId?: number | null) => void;
  className?: string;
  /** picker: 모달 등에서 선택만 하고 페이지 이동·편집 UI를 숨김 */
  variant?: "default" | "picker";
  /** true면 검색은 고정하고 트리 목록만 스크롤 */
  fixSearchOnScroll?: boolean;
};

type TreeNodeItemProps = {
  node: ProcessNodeTree;
  level: number;
  selectedId?: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelect?: (node: ProcessNodeTree) => void;
  onCreate?: (parentId?: number | null) => void;
  onDelete: (node: ProcessNodeTree) => void;
  filter: string;
  pickerMode?: boolean;
};

/** 단일 트리 노드 렌더링 */
const TreeNodeItem = ({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onCreate,
  onDelete,
  filter,
  pickerMode = false,
}: TreeNodeItemProps) => {
  const t = useTranslations("process");
  const router = useRouter();
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expandedIds.has(node.nodeId);
  const isSelected = selectedId === node.nodeId;
  const label = `${node.code} ${node.name}`;

  if (filter && !label.toLowerCase().includes(filter.toLowerCase())) {
    const childMatch = node.children?.some((c) =>
      `${c.code} ${c.name}`.toLowerCase().includes(filter.toLowerCase()),
    );
    if (!childMatch) return null;
  }

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md py-1 pr-1 text-sm transition-colors hover:bg-muted",
          isSelected && "bg-accent text-accent-foreground",
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {!pickerMode && (
          <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground/50" />
        )}

        {hasChildren ? (
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center"
            onClick={() => onToggle(node.nodeId)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block size-5" />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => onSelect?.(node)}
        >
          <FolderTree className={cn("size-3.5 shrink-0", levelStyles[node.level])} />
          <span className="truncate font-mono text-xs text-muted-foreground">
            {node.code}
          </span>
          <span className="truncate">{node.name}</span>
        </button>

        <StatusBadge
          status={node.status}
          className={cn(
            "shrink-0 text-[10px]",
            pickerMode ? "inline-flex" : "hidden sm:inline-flex",
          )}
        />

        {!pickerMode && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex size-6 items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-muted"
              aria-label="Actions"
            >
              <MoreHorizontal className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/process/${node.nodeId}`)}>
                {t("viewDetail")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onCreate
                    ? onCreate(node.nodeId)
                    : router.push(`/process/new?parentId=${node.nodeId}`)
                }
              >
                {t("addChild")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(node)}
              >
                <Trash2 className="size-3.5" />
                {t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {hasChildren && isExpanded && (
        <ul>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.nodeId}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onCreate={onCreate}
              onDelete={onDelete}
              filter={filter}
              pickerMode={pickerMode}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

/** L1~L4 프로세스 트리 */
export const ProcessTree = ({
  selectedId,
  onSelect,
  onCreate,
  className,
  variant = "default",
  fixSearchOnScroll = false,
}: ProcessTreeProps) => {
  const pickerMode = variant === "picker";
  const t = useTranslations("process");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProcessNodeTree | null>(null);
  const hasInitializedExpansion = useRef(false);

  const { data: tree, isLoading, isError, refetch } = useProcessTree(debouncedSearch);

  /** 최초 로드 시 L1 노드를 펼침 — 토글 시 상위가 접히지 않도록 state에 반영 */
  useEffect(() => {
    if (tree?.length && !hasInitializedExpansion.current) {
      setExpandedIds(new Set(tree.map((n) => n.nodeId)));
      hasInitializedExpansion.current = true;
    }
  }, [tree]);
  const deleteMutation = useDeleteProcess();
  const deleteImpactMutation = useProcessDeleteImpact();
  const moveMutation = useMoveProcess();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const onToggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (node: ProcessNodeTree) => {
      onSelect?.(node);
      if (!pickerMode && !onSelect) {
        router.push(`/process/${node.nodeId}`);
      }
    },
    [onSelect, pickerMode, router],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const nodeId = Number(active.id);
      const overId = Number(over.id);
      moveMutation.mutate({ nodeId, parentNodeId: overId });
    },
    [moveMutation],
  );

  const handleRequestDelete = useCallback(
    (node: ProcessNodeTree) => {
      setDeleteTarget(node);
      deleteImpactMutation.reset();
      deleteImpactMutation.mutate(node.nodeId);
    },
    [deleteImpactMutation],
  );

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setDeleteTarget(null);
        deleteImpactMutation.reset();
      }
    },
    [deleteImpactMutation],
  );

  const renderDeleteImpact = (impact?: ProcessDeleteImpact) => {
    if (deleteImpactMutation.isPending) {
      return <p className="text-sm text-muted-foreground">{t("deleteImpactLoading")}</p>;
    }

    if (!impact) {
      return null;
    }

    if (impact.childProcessCount > 0) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          {t("deleteBlockedByChildren", { count: impact.childProcessCount })}
        </div>
      );
    }

    if (!impact.hasDependencies) {
      return (
        <p className="text-sm text-muted-foreground">{t("deleteNoLinkedData")}</p>
      );
    }

    return (
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium text-destructive">{t("deleteImpactWarning")}</p>
        {impact.bpmnTaskLinks.length > 0 && (
          <section className="space-y-1">
            <p className="font-medium">{t("deleteImpactBpmnTasks")}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {impact.bpmnTaskLinks.map((link) => (
                <li key={link.elementId}>
                  {link.modelName} / {link.elementName ?? link.elementBpmnId}
                  <span className="ml-1">
                    ({link.modelProcessCode} {link.modelProcessName})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {impact.ownedBpmnModels.length > 0 && (
          <section className="space-y-1">
            <p className="font-medium">{t("deleteImpactOwnedBpmnModels")}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {impact.ownedBpmnModels.map((model) => (
                <li key={model.modelId}>
                  {model.modelName} v{model.version}
                  <span className="ml-1">
                    ({t("deleteImpactElementCount", { count: model.elementCount })})
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {impact.metadataCounts.length > 0 && (
          <section className="space-y-1">
            <p className="font-medium">{t("deleteImpactMetadata")}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {impact.metadataCounts.map((item) => (
                <li key={item.kind}>
                  {t(`deleteImpactKinds.${item.kind}`)} {item.count}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  };

  const renderTreeList = () => (
    <ul className="space-y-0.5 overflow-y-auto">
      {tree?.map((node) => (
        <TreeNodeItem
          key={node.nodeId}
          node={node}
          level={0}
          selectedId={selectedId}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={handleSelect}
          onCreate={onCreate}
          onDelete={handleRequestDelete}
          filter={debouncedSearch}
          pickerMode={pickerMode}
        />
      ))}
    </ul>
  );

  if (isLoading) return <LoadingSpinner label={t("loading")} />;
  if (isError) {
    return (
      <EmptyState
        title={t("loadError")}
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t("retry")}
          </Button>
        }
      />
    );
  }

  const searchRow = (
    <div className="flex shrink-0 items-center gap-2">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder={t("searchPlaceholder")}
        className="flex-1"
      />
      {!pickerMode && (
        <Button
          size="sm"
          onClick={() => (onCreate ? onCreate(null) : router.push("/process/new"))}
        >
          <Plus className="size-4" />
          {t("new")}
        </Button>
      )}
    </div>
  );

  const treeBody = !tree?.length ? (
    <EmptyState
      title={t("empty")}
      action={
        <Button
          size="sm"
          onClick={() => (onCreate ? onCreate(null) : router.push("/process/new"))}
        >
          {t("createFirst")}
        </Button>
      }
    />
  ) : pickerMode ? (
    renderTreeList()
  ) : (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {renderTreeList()}
    </DndContext>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        fixSearchOnScroll && "min-h-0 flex-1 overflow-hidden",
        className,
      )}
    >
      {searchRow}
      {fixSearchOnScroll ? (
        <div className="min-h-0 flex-1 overflow-y-auto">{treeBody}</div>
      ) : (
        treeBody
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={handleDeleteDialogOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc", { name: deleteTarget?.name ?? "" })}
        confirmLabel={
          deleteImpactMutation.data?.hasDependencies
            ? t("deleteCascadeConfirm")
            : undefined
        }
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(
              {
                nodeId: deleteTarget.nodeId,
                cascade: deleteImpactMutation.data?.hasDependencies ?? false,
              },
              {
                onSuccess: () => handleDeleteDialogOpenChange(false),
              },
            );
          }
        }}
        loading={deleteMutation.isPending || deleteImpactMutation.isPending}
        confirmDisabled={
          !deleteImpactMutation.data ||
          deleteImpactMutation.data.childProcessCount > 0 ||
          deleteImpactMutation.isError
        }
      >
        {renderDeleteImpact(deleteImpactMutation.data)}
      </ConfirmDialog>
    </div>
  );
};
