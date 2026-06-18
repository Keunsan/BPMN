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
  Copy,
  FolderTree,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TreeLevelExpandControls } from "@/components/common/TreeLevelExpandControls";
import { VariantCreateDialog } from "@/components/process/VariantCreateDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/useDebounce";
import { useProcessTreeExpansion } from "@/hooks/useProcessTreeExpansion";
import {
  getDisabledTreeLevels,
  PROCESS_LEVELS,
  setTreeExpansionToLevel,
} from "@/lib/utils/process-tree-expansion";
import {
  useDeleteProcess,
  useMoveProcess,
  useProcessDeleteImpact,
  useProcessTree,
} from "@/lib/query/hooks/useProcess";
import { useRouter } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { formatProcessScope } from "@/lib/utils/process-label";
import { isEnterpriseScope } from "@/lib/utils/process-scope";
import type {
  ProcessDeleteImpact,
  ProcessFilters,
  ProcessLevel,
  ProcessNodeDto,
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
  scopeFilters?: Pick<ProcessFilters, "companyCode" | "businessUnitCode">;
  className?: string;
  /** picker: 모달 등에서 선택만 하고 페이지 이동·편집 UI를 숨김 */
  variant?: "default" | "picker";
  /** true면 검색은 고정하고 트리 목록만 스크롤 */
  fixSearchOnScroll?: boolean;
  /** false면 L1~L4 레벨 펼치기 컨트롤을 숨김 */
  showLevelControls?: boolean;
  /** picker에서 선택 가능한 레벨 (미지정 시 전체) */
  selectableLevels?: ProcessLevel[];
  /** 외부 검색어 — 지정 시 내부 SearchBar를 숨김 */
  search?: string;
  /** SearchBar 표시 여부 (기본: search 미지정 시 true) */
  showSearch?: boolean;
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
  onCreateVariant?: (node: ProcessNodeTree) => void;
  filter: string;
  pickerMode?: boolean;
  selectableLevels?: Set<ProcessLevel>;
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
  onCreateVariant,
  filter,
  pickerMode = false,
  selectableLevels,
}: TreeNodeItemProps) => {
  const t = useTranslations("process");
  const router = useRouter();
  const directChildCount = node.children?.length ?? 0;
  const hasChildren = directChildCount > 0;
  const isExpanded = expandedIds.has(node.nodeId);
  const isSelected = selectedId === node.nodeId;
  const isSelectable =
    !selectableLevels || selectableLevels.has(node.level);
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
          "group flex items-center gap-1 rounded-md py-1 pr-1 text-sm transition-colors",
          isSelectable ? "hover:bg-muted" : "opacity-50",
          isSelected && isSelectable && "bg-accent text-accent-foreground",
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
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 text-left",
            !isSelectable && "cursor-not-allowed",
          )}
          disabled={!isSelectable}
          onClick={() => {
            if (isSelectable) {
              onSelect?.(node);
            }
          }}
        >
          <FolderTree className={cn("size-3.5 shrink-0", levelStyles[node.level])} />
          <span className="truncate">{node.name}</span>
          {directChildCount > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {t("directChildCount", { count: directChildCount })}
            </span>
          )}
          {node.isOverlayVariant && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              {t("variant.badge")}
            </Badge>
          )}
          {!node.isOverlayVariant &&
            !isEnterpriseScope(node.companyCode, node.businessUnitCode) &&
            !node.variantOf && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {t("scope.scopedBadge")}
              </Badge>
            )}
          {!node.isOverlayVariant &&
            (node.variantCount ?? 0) > 0 &&
            (node.level === "L3" || node.level === "L4") && (
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {t("variant.count", { count: node.variantCount ?? 0 })}
              </Badge>
            )}
        </button>

        {node.isOverlayVariant && formatProcessScope(node) && (
          <span className="hidden max-w-28 truncate text-[10px] text-muted-foreground xl:inline">
            {formatProcessScope(node)}
          </span>
        )}

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
              {!node.variantOf &&
                (node.level === "L3" || node.level === "L4") && (
                  <DropdownMenuItem onClick={() => onCreateVariant?.(node)}>
                    <Copy className="size-3.5" />
                    {t("variant.createAction")}
                  </DropdownMenuItem>
                )}
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
              onCreateVariant={onCreateVariant}
              filter={filter}
              pickerMode={pickerMode}
              selectableLevels={selectableLevels}
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
  showLevelControls = true,
  scopeFilters,
  selectableLevels,
  search: externalSearch,
  showSearch,
}: ProcessTreeProps) => {
  const pickerMode = variant === "picker";
  const selectableLevelSet = useMemo(
    () => (selectableLevels ? new Set(selectableLevels) : undefined),
    [selectableLevels],
  );
  const t = useTranslations("process");
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState("");
  const useExternalSearch = externalSearch !== undefined;
  const showSearchBar = showSearch ?? !useExternalSearch;
  const querySearch = useExternalSearch ? externalSearch : internalSearch;
  const debouncedSearch = useDebounce(querySearch);
  const [deleteTarget, setDeleteTarget] = useState<ProcessNodeTree | null>(null);
  const [variantTarget, setVariantTarget] = useState<ProcessNodeTree | null>(null);
  const hasInitializedExpansion = useRef(false);

  const treeFilters = {
    search: debouncedSearch || undefined,
    companyCode: scopeFilters?.companyCode,
    businessUnitCode: scopeFilters?.businessUnitCode,
  };

  const { data: tree, isLoading, isError, refetch } = useProcessTree(treeFilters);

  const {
    expandedIds,
    expandedLevels,
    onToggleNode,
    onToggleLevel,
    setExpandedIds,
  } = useProcessTreeExpansion(tree);

  const disabledLevels = tree?.length ? getDisabledTreeLevels(tree) : new Set<ProcessLevel>();

  /** 최초 로드 시 L2까지 펼침 (L1 노드만 확장) */
  useEffect(() => {
    if (tree?.length && !hasInitializedExpansion.current) {
      setExpandedIds([...setTreeExpansionToLevel(tree, new Set(), "L2")]);
      hasInitializedExpansion.current = true;
    }
  }, [tree, setExpandedIds]);
  const deleteMutation = useDeleteProcess();
  const deleteImpactMutation = useProcessDeleteImpact();
  const moveMutation = useMoveProcess();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

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

    if (impact.blockedByVariants) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">{t("deleteBlockedByVariants")}</p>
          <p className="mt-1 text-muted-foreground">
            {t("deleteBlockedByVariantsHint", { count: impact.variantCount })}
          </p>
        </div>
      );
    }

    if (impact.blockedByChildren) {
      return (
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">
            {t("deleteBlockedByChildren", { count: impact.descendantProcesses.length })}
          </p>
          <p className="text-muted-foreground">{t("deleteBlockedByChildrenHint")}</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {impact.descendantProcesses.map((child) => (
              <li key={child.nodeId}>
                {child.code} · {child.name}
                <span className="ml-1">({child.level})</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    const hasCascadeChildren = impact.cascadeChildProcesses.length > 0;
    const hasLinkedData =
      impact.bpmnTaskLinks.length > 0 ||
      impact.ownedBpmnModels.length > 0 ||
      impact.metadataCounts.length > 0;

    if (!hasCascadeChildren && !hasLinkedData) {
      return (
        <p className="text-sm text-muted-foreground">{t("deleteNoLinkedData")}</p>
      );
    }

    return (
      <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm">
        <p className="font-medium text-destructive">
          {hasCascadeChildren ? t("deleteImpactChildWarning") : t("deleteImpactWarning")}
        </p>
        {hasCascadeChildren && (
          <section className="space-y-1">
            <p className="font-medium">{t("deleteImpactChildProcesses")}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {impact.cascadeChildProcesses.map((child) => (
                <li key={child.nodeId}>
                  {child.code} · {child.name}
                  <span className="ml-1">({child.level})</span>
                </li>
              ))}
            </ul>
          </section>
        )}
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
          onToggle={onToggleNode}
          onSelect={handleSelect}
          onCreate={onCreate}
          onDelete={handleRequestDelete}
          onCreateVariant={setVariantTarget}
          filter={debouncedSearch}
          pickerMode={pickerMode}
          selectableLevels={selectableLevelSet}
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
        value={querySearch}
        onChange={setInternalSearch}
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
      {showSearchBar ? searchRow : null}
      {showLevelControls && Boolean(tree?.length) && (
        <TreeLevelExpandControls
          levels={PROCESS_LEVELS}
          expandedLevels={expandedLevels}
          onToggleLevel={onToggleLevel}
          disabledLevels={disabledLevels}
          levelClassNames={levelStyles}
        />
      )}
      {fixSearchOnScroll ? (
        <div className="min-h-0 flex-1 overflow-y-auto">{treeBody}</div>
      ) : (
        treeBody
      )}

      <VariantCreateDialog
        open={Boolean(variantTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVariantTarget(null);
          }
        }}
        standardNode={variantTarget}
        onSuccess={(created: ProcessNodeDto) => {
          onSelect?.(created as ProcessNodeTree);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={handleDeleteDialogOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("deleteCascadeConfirm")}
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.nodeId, {
              onSuccess: () => handleDeleteDialogOpenChange(false),
            });
          }
        }}
        loading={deleteMutation.isPending || deleteImpactMutation.isPending}
        confirmDisabled={
          !deleteImpactMutation.data ||
          deleteImpactMutation.isError ||
          deleteImpactMutation.data.blockedByChildren ||
          deleteImpactMutation.data.blockedByVariants ||
          !deleteImpactMutation.data.canCascadeDelete
        }
      >
        {renderDeleteImpact(deleteImpactMutation.data)}
      </ConfirmDialog>
    </div>
  );
};
