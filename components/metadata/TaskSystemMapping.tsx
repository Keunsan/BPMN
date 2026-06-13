"use client";

import { Link2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useCallback } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ListPageLayout, PageHeader } from "@/components/common/layout";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import { useHorizontalPanelResize } from "@/hooks/useHorizontalPanelResize";
import { useVerticalPanelResize } from "@/hooks/useVerticalPanelResize";
import { useCommonCodeLookup } from "@/lib/query/hooks/useCommonCode";
import { useProcessTree } from "@/lib/query/hooks/useProcess";
import {
  useCreateTaskSystemMappingsBatch,
  useDeleteTaskSystemMapping,
  useScreenCatalogInfinite,
  useSystemHierarchy,
  useTaskSystemMappings,
} from "@/lib/query/hooks/useSystems";
import { cn } from "@/lib/utils";
import { formatSystemLabel } from "@/lib/utils/system-label";
import type { ProcessNodeTree } from "@/types/process";
import type {
  ScreenCatalogItem,
  SystemUsageType,
  TaskSystemMappingDto,
} from "@/types/system";

type TaskOption = {
  nodeId: number;
  code: string;
  name: string;
  level: string;
};

const USAGE_TYPES: SystemUsageType[] = [
  "EXECUTE",
  "INQUIRY",
  "APPROVAL",
  "REPORT",
  "INTERFACE",
];

const PAGE_SIZE = 50;
const ALL_FILTER = "__ALL__";

const flattenProcesses = (nodes: ProcessNodeTree[] = []): TaskOption[] =>
  nodes.flatMap((node) => [
    ...(node.level === "L3" || node.level === "L4"
      ? [
          {
            nodeId: node.nodeId,
            code: node.code,
            name: node.name,
            level: node.level,
          },
        ]
      : []),
    ...flattenProcesses(node.children ?? []),
  ]);

const PanelSplitter = ({
  orientation,
  onPointerDown,
  isResizing,
  label,
}: {
  orientation: "vertical" | "horizontal";
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  isResizing: boolean;
  label: string;
}) => (
  <div
    role="separator"
    aria-orientation={orientation}
    aria-label={label}
    className={cn(
      "relative z-20 shrink-0 touch-none select-none bg-transparent transition-colors hover:bg-primary/15 active:bg-primary/25",
      orientation === "vertical"
        ? "flex h-1.5 w-full cursor-row-resize items-center justify-center"
        : "hidden w-1.5 cursor-col-resize items-center justify-center md:flex",
      isResizing && "bg-primary/25",
    )}
    onPointerDown={onPointerDown}
  >
    <div
      className={cn(
        "pointer-events-none rounded-full bg-border",
        orientation === "vertical" ? "h-0.5 w-10" : "h-10 w-0.5",
      )}
    />
  </div>
);

/** Task-시스템/화면 매핑 관리 — 좌측 태스크 · 우측 화면 다중 연결 */
export const TaskSystemMapping = () => {
  const t = useTranslations("systemMapping");
  const tc = useTranslations("common");
  const locale = useLocale();

  const [nodeId, setNodeId] = useState(0);
  const [taskSearch, setTaskSearch] = useState("");
  const [systemId, setSystemId] = useState(0);
  const [moduleCode, setModuleCode] = useState("");
  const [screenSearch, setScreenSearch] = useState("");
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [usageType, setUsageType] = useState<SystemUsageType>("EXECUTE");
  const [isPrimary, setIsPrimary] = useState(false);

  const debouncedScreenSearch = useDebounce(screenSearch, 300);

  const { data: tree, isLoading: treeLoading } = useProcessTree();
  const { data: hierarchy } = useSystemHierarchy();
  const { data: moduleOptions = [] } = useCommonCodeLookup("MODULE_CD");
  const { data: mappings, isLoading: mappingsLoading, refetch } =
    useTaskSystemMappings(nodeId);
  const batchConnect = useCreateTaskSystemMappingsBatch(nodeId);
  const deleteMapping = useDeleteTaskSystemMapping(nodeId);

  const catalogFilters = useMemo(
    () => ({
      systemId: systemId || undefined,
      moduleCode: moduleCode || undefined,
      search: debouncedScreenSearch || undefined,
      excludeNodeId: nodeId || undefined,
      pageSize: PAGE_SIZE,
    }),
    [debouncedScreenSearch, moduleCode, nodeId, systemId],
  );

  const {
    data: catalog,
    isLoading: catalogLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useScreenCatalogInfinite(catalogFilters, locale, nodeId > 0);

  const {
    width: taskPanelWidth,
    isResizing: isResizingTaskPanel,
    handleResizePointerDown: handleTaskPanelResize,
  } = useHorizontalPanelResize({
    storageKey: "pams-system-mapping-task-panel-width",
    defaultWidth: 400,
    minWidth: 280,
    maxWidth: 640,
  });

  const {
    height: linkedPanelHeight,
    isResizing: isResizingLinkedPanel,
    handleResizePointerDown: handleLinkedPanelResize,
  } = useVerticalPanelResize({
    storageKey: "pams-system-mapping-linked-panel-height",
    defaultHeight: 240,
    minHeight: 160,
    maxHeight: 520,
  });

  const taskOptions = useMemo(() => flattenProcesses(tree), [tree]);
  const filteredTasks = useMemo(() => {
    const keyword = taskSearch.trim().toLowerCase();
    if (!keyword) {
      return taskOptions;
    }
    return taskOptions.filter(
      (task) =>
        task.code.toLowerCase().includes(keyword) ||
        task.name.toLowerCase().includes(keyword),
    );
  }, [taskOptions, taskSearch]);

  const selectedTask = taskOptions.find((task) => task.nodeId === nodeId);
  const selectedSystem = hierarchy?.find((system) => system.systemId === systemId);
  const catalogItems = useMemo(
    () => catalog?.pages.flatMap((page) => page.items) ?? [],
    [catalog?.pages],
  );
  const catalogTotal = catalog?.pages[0]?.total ?? 0;
  const handleCatalogReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const usageTypeLabel = t(`usageTypes.${usageType}`);

  const resetScreenSelection = useCallback(() => {
    setSelectedScreenIds(new Set());
  }, []);

  const selectTask = useCallback(
    (nextNodeId: number) => {
      setNodeId(nextNodeId);
      resetScreenSelection();
    },
    [resetScreenSelection],
  );

  const toggleScreenSelection = useCallback((screenId: number) => {
    setSelectedScreenIds((prev) => {
      const next = new Set(prev);
      if (next.has(screenId)) {
        next.delete(screenId);
      } else {
        next.add(screenId);
      }
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    const pageIds = catalogItems.map((item) => item.screenId);
    const allSelected = pageIds.every((id) => selectedScreenIds.has(id));
    setSelectedScreenIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) {
          next.delete(id);
        }
      } else {
        for (const id of pageIds) {
          next.add(id);
        }
      }
      return next;
    });
  }, [catalogItems, selectedScreenIds]);

  const handleConnect = async () => {
    if (!nodeId || selectedScreenIds.size === 0) {
      return;
    }

    await batchConnect.mutateAsync({
      screenIds: [...selectedScreenIds],
      usageType,
      isPrimary,
    });
    setSelectedScreenIds(new Set());
    setIsPrimary(false);
    await refetch();
  };

  const taskColumns = useMemo<DataGridColumn<TaskOption>[]>(
    () => [
      {
        key: "no",
        header: "No.",
        width: 48,
        minWidth: 44,
        align: "center",
        cell: (_task, rowIndex) => rowIndex + 1,
      },
      {
        key: "code",
        header: t("taskCode"),
        width: 112,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (task) => task.code,
        cell: (task) => (
          <span className="font-mono text-[11px]">{task.code}</span>
        ),
      },
      {
        key: "level",
        header: t("level"),
        width: 52,
        minWidth: 44,
        align: "center",
        sortable: true,
        filter: "select",
        value: (task) => task.level,
        cell: (task) => (
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {task.level}
          </Badge>
        ),
      },
      {
        key: "name",
        header: t("taskName"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (task) => task.name,
        cell: (task) => <span className="font-medium">{task.name}</span>,
      },
    ],
    [t],
  );

  const linkedColumns = useMemo<DataGridColumn<TaskSystemMappingDto>[]>(
    () => [
      {
        key: "company",
        header: t("company"),
        width: 96,
        minWidth: 72,
        cell: (mapping) => (
          <span className="truncate">
            {mapping.companyName ?? mapping.companyCode ?? "-"}
          </span>
        ),
      },
      {
        key: "businessUnit",
        header: t("businessUnit"),
        width: 96,
        minWidth: 72,
        cell: (mapping) => (
          <span className="truncate">
            {mapping.businessUnitName ?? mapping.businessUnitCode ?? "-"}
          </span>
        ),
      },
      {
        key: "system",
        header: t("system"),
        width: 96,
        minWidth: 80,
        sortable: true,
        filter: "select",
        value: (mapping) => mapping.systemName,
        cell: (mapping) => <span className="truncate">{mapping.systemName}</span>,
      },
      {
        key: "module",
        header: t("module"),
        width: 72,
        minWidth: 60,
        sortable: true,
        filter: "select",
        value: (mapping) => mapping.moduleCode,
        cell: (mapping) => (
          <span className="font-mono text-[11px]">{mapping.moduleCode}</span>
        ),
      },
      {
        key: "menuId",
        header: t("menuId"),
        width: 96,
        minWidth: 80,
        cell: (mapping) => (
          <span className="font-mono text-[11px]">{mapping.menuId}</span>
        ),
      },
      {
        key: "screen",
        header: t("screen"),
        width: 160,
        minWidth: 120,
        cell: (mapping) => <span className="truncate">{mapping.screenName}</span>,
      },
      {
        key: "usageType",
        header: t("usageType"),
        width: 80,
        minWidth: 64,
        align: "center",
        sortable: true,
        filter: "select",
        value: (mapping) => mapping.usageType,
        cell: (mapping) => (
          <Badge className="h-5 px-1.5 text-[10px]">
            {t(`usageTypes.${mapping.usageType}`)}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("actions"),
        width: 60,
        minWidth: 52,
        align: "center",
        cell: (mapping) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => deleteMapping.mutate(mapping.mappingId)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [deleteMapping, t],
  );

  const availableColumns = useMemo<DataGridColumn<ScreenCatalogItem>[]>(
    () => [
      {
        key: "select",
        header: (
          <input
            type="checkbox"
            aria-label={t("selectAllOnPage")}
            checked={
              catalogItems.length > 0 &&
              catalogItems.every((item) => selectedScreenIds.has(item.screenId))
            }
            onChange={toggleAllOnPage}
          />
        ),
        width: 40,
        minWidth: 36,
        align: "center",
        cell: (item) => (
          <input
            type="checkbox"
            aria-label={t("selectScreen")}
            checked={selectedScreenIds.has(item.screenId)}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleScreenSelection(item.screenId)}
          />
        ),
      },
      {
        key: "company",
        header: t("company"),
        width: 96,
        minWidth: 72,
        cell: (item) => (
          <span className="truncate">
            {item.companyName ?? item.companyCode ?? "-"}
          </span>
        ),
      },
      {
        key: "businessUnit",
        header: t("businessUnit"),
        width: 96,
        minWidth: 72,
        cell: (item) => (
          <span className="truncate">
            {item.businessUnitName ?? item.businessUnitCode ?? "-"}
          </span>
        ),
      },
      {
        key: "system",
        header: t("system"),
        width: 96,
        minWidth: 80,
        cell: (item) => <span className="truncate">{item.systemName}</span>,
      },
      {
        key: "module",
        header: t("module"),
        width: 72,
        minWidth: 60,
        cell: (item) => (
          <span className="font-mono text-[11px]">{item.moduleCode}</span>
        ),
      },
      {
        key: "menuId",
        header: t("menuId"),
        width: 100,
        minWidth: 80,
        cell: (item) => (
          <span className="font-mono text-[11px]">{item.menuId}</span>
        ),
      },
      {
        key: "screenName",
        header: t("screen"),
        width: 180,
        minWidth: 140,
        cell: (item) => <span className="truncate">{item.screenName}</span>,
      },
      {
        key: "menuPath",
        header: t("menuPath"),
        width: 220,
        minWidth: 160,
        cell: (item) => (
          <span className="line-clamp-2 text-[11px] text-slate-600">
            {item.menuPath ?? "-"}
          </span>
        ),
      },
    ],
    [catalogItems, selectedScreenIds, t, toggleAllOnPage, toggleScreenSelection],
  );

  const catalogToolbar = (
    <div className="flex items-center gap-2 text-[11px] text-slate-500">
      <span>
        {t("loadedCount", {
          loaded: catalogItems.length,
          total: catalogTotal,
        })}
      </span>
      {isFetchingNextPage ? <span>{tc("loading")}</span> : null}
    </div>
  );

  const screenFilterBar = (
    <div className="mb-1.5 flex shrink-0 flex-wrap items-center gap-1.5">
      <Select
        value={systemId ? String(systemId) : ALL_FILTER}
        onValueChange={(value) => {
          setSystemId(value === ALL_FILTER ? 0 : Number(value));
          resetScreenSelection();
        }}
      >
        <SelectTrigger variant="filter" className="h-8 w-[180px]">
          <SelectValue placeholder={t("selectSystem")}>
            {selectedSystem ? formatSystemLabel(selectedSystem) : t("allSystems")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent variant="filter">
          <SelectItem variant="filter" value={ALL_FILTER}>
            {t("allSystems")}
          </SelectItem>
          {hierarchy?.map((system) => (
            <SelectItem
              variant="filter"
              key={system.systemId}
              value={String(system.systemId)}
            >
              {formatSystemLabel(system)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={moduleCode || ALL_FILTER}
        onValueChange={(value) => {
          setModuleCode(value === ALL_FILTER ? "" : (value ?? ""));
          resetScreenSelection();
        }}
      >
        <SelectTrigger variant="filter" className="h-8 w-[140px]">
          <SelectValue placeholder={t("selectModule")} />
        </SelectTrigger>
        <SelectContent variant="filter">
          <SelectItem variant="filter" value={ALL_FILTER}>
            {t("allModules")}
          </SelectItem>
          {moduleOptions.map((module) => (
            <SelectItem variant="filter" key={module.code} value={module.code}>
              {module.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SearchBar
        variant="filter"
        className="min-w-[200px] flex-1"
        value={screenSearch}
        onChange={(value) => {
          setScreenSearch(value);
          resetScreenSelection();
        }}
        placeholder={t("screenSearchPlaceholder")}
      />
    </div>
  );

  const renderRightBody = () => {
    if (!nodeId) {
      return <EmptyState title={t("selectTaskHint")} className="min-h-[320px]" />;
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex min-h-0 shrink-0 flex-col overflow-hidden"
          style={{ height: linkedPanelHeight }}
        >
          <DataGrid
            title={t("linkedSystems")}
            count={mappings?.length ?? 0}
            countSuffix={tc("countUnit")}
            icon
            columns={linkedColumns}
            data={mappings ?? []}
            rowKey={(mapping) => mapping.mappingId}
            storageKey="pams-task-system-mappings-linked-grid"
            emptyMessage={t("emptyMappings")}
            body={
              mappingsLoading ? (
                <LoadingSpinner className="min-h-[160px]" />
              ) : undefined
            }
            fillHeight
          />
        </div>

        <PanelSplitter
          orientation="vertical"
          label={t("panelResizeVertical")}
          isResizing={isResizingLinkedPanel}
          onPointerDown={handleLinkedPanelResize}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {screenFilterBar}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DataGrid
              title={t("availableScreens")}
              count={catalogTotal}
              countSuffix={tc("countUnit")}
              icon
              toolbar={catalogToolbar}
              columns={availableColumns}
              data={catalogItems}
              rowKey={(item) => item.screenId}
              storageKey="pams-task-system-screens-available-grid"
              emptyMessage={t("emptyAvailableScreens")}
              body={
                catalogLoading ? (
                  <LoadingSpinner className="min-h-[240px]" />
                ) : undefined
              }
              onRowClick={(item) => toggleScreenSelection(item.screenId)}
              onReachEnd={handleCatalogReachEnd}
              loadingMore={isFetchingNextPage}
              fillHeight
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Link2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={usageType}
              onValueChange={(value) =>
                value && setUsageType(value as SystemUsageType)
              }
            >
              <SelectTrigger variant="filter" className="h-8 w-[120px]">
                <SelectValue>{usageTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent variant="filter">
                {USAGE_TYPES.map((type) => (
                  <SelectItem variant="filter" key={type} value={type}>
                    {t(`usageTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(event) => setIsPrimary(event.target.checked)}
              />
              {t("markPrimary")}
            </label>
            <Button
              type="button"
              size="sm"
              disabled={
                !nodeId ||
                selectedScreenIds.size === 0 ||
                batchConnect.isPending
              }
              onClick={() => void handleConnect()}
            >
              <Link2 className="size-3.5" />
              {t("connectSelected", { count: selectedScreenIds.size })}
            </Button>
          </div>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div
          className="flex min-h-[220px] w-full shrink-0 flex-col overflow-hidden md:min-h-0 md:w-auto"
          style={{ width: taskPanelWidth }}
        >
          <DataGrid
            title={t("taskList")}
            count={filteredTasks.length}
            countSuffix={tc("countUnit")}
            icon
            toolbar={
              <SearchBar
                variant="filter"
                className="w-[160px]"
                value={taskSearch}
                onChange={setTaskSearch}
                placeholder={t("taskSearchPlaceholder")}
              />
            }
            columns={taskColumns}
            data={filteredTasks}
            rowKey={(task) => task.nodeId}
            storageKey="pams-task-system-mapping-task-grid"
            selectedRowKey={nodeId || undefined}
            onRowClick={(task) => selectTask(task.nodeId)}
            emptyMessage={t("emptyTasks")}
            body={
              treeLoading ? (
                <LoadingSpinner className="min-h-[240px]" />
              ) : undefined
            }
            fillHeight
          />
        </div>

        <PanelSplitter
          orientation="horizontal"
          label={t("panelResizeHorizontal")}
          isResizing={isResizingTaskPanel}
          onPointerDown={handleTaskPanelResize}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {selectedTask ? (
            <div className="mb-1.5 shrink-0 rounded-lg border border-slate-200/85 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40">
              <span className="font-medium">{selectedTask.name}</span>
              <span className="ml-2 font-mono text-slate-500">
                {selectedTask.code}
              </span>
            </div>
          ) : null}
          {renderRightBody()}
        </div>
      </div>
    </ListPageLayout>
  );
};
