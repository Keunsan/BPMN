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
import { useCallback, useMemo, useState } from "react";

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
  useProcessTree,
} from "@/lib/query/hooks/useProcess";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ProcessLevel, ProcessNodeTree } from "@/types/process";

const levelStyles: Record<ProcessLevel, string> = {
  L1: "text-blue-600",
  L2: "text-emerald-600",
  L3: "text-amber-600",
  L4: "text-violet-600",
};

type ProcessTreeProps = {
  selectedId?: number;
  onSelect?: (node: ProcessNodeTree) => void;
  className?: string;
};

type TreeNodeItemProps = {
  node: ProcessNodeTree;
  level: number;
  selectedId?: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelect?: (node: ProcessNodeTree) => void;
  onDelete: (node: ProcessNodeTree) => void;
  filter: string;
};

/** 단일 트리 노드 렌더링 */
const TreeNodeItem = ({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onDelete,
  filter,
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
          "group flex items-center gap-1 rounded-md py-1 pr-1 text-sm",
          isSelected && "bg-accent text-accent-foreground",
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        <GripVertical className="size-3 shrink-0 cursor-grab text-muted-foreground/50" />

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

        <StatusBadge status={node.status} className="hidden shrink-0 text-[10px] sm:inline-flex" />

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
                router.push(`/process/new?parentId=${node.nodeId}`)
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
              onDelete={onDelete}
              filter={filter}
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
  className,
}: ProcessTreeProps) => {
  const t = useTranslations("process");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<ProcessNodeTree | null>(null);

  const { data: tree, isLoading, isError, refetch } = useProcessTree(debouncedSearch);
  const deleteMutation = useDeleteProcess();
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
      router.push(`/process/${node.nodeId}`);
    },
    [onSelect, router],
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

  const defaultExpanded = useMemo(() => {
    if (tree?.length && expandedIds.size === 0) {
      return new Set(tree.map((n) => n.nodeId));
    }
    return expandedIds;
  }, [tree, expandedIds]);

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

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
          className="flex-1"
        />
        <Button size="sm" onClick={() => router.push("/process/new")}>
          <Plus className="size-4" />
          {t("new")}
        </Button>
      </div>

      {!tree?.length ? (
        <EmptyState
          title={t("empty")}
          action={
            <Button size="sm" onClick={() => router.push("/process/new")}>
              {t("createFirst")}
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <ul className="space-y-0.5 overflow-y-auto">
            {tree.map((node) => (
              <TreeNodeItem
                key={node.nodeId}
                node={node}
                level={0}
                selectedId={selectedId}
                expandedIds={defaultExpanded}
                onToggle={onToggle}
                onSelect={handleSelect}
                onDelete={setDeleteTarget}
                filter={debouncedSearch}
              />
            ))}
          </ul>
        </DndContext>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => setDeleteTarget(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc", { name: deleteTarget?.name ?? "" })}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.nodeId, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
};
