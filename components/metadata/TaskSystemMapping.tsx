"use client";

import { Link2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, useCallback } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ListPageLayout, PageHeader, PanelSplitter } from "@/components/common/layout";
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
import { TaskMappingSideLayout } from "@/components/metadata/TaskMappingSideLayout";
import { useProcessScopeParams } from "@/components/process/ProcessScopeFilter";
import { useDebounce } from "@/hooks/useDebounce";
import { useVerticalPanelResize } from "@/hooks/useVerticalPanelResize";
import { useCommonCodeLookup } from "@/lib/query/hooks/useCommonCode";
import {
  useCreateTaskSystemLinksBatch,
  useCreateTaskSystemScreenLinksBatch,
  useDeleteTaskSystemLink,
  useDeleteTaskSystemScreenLink,
  useScreenCatalogInfinite,
  useSystemCatalogInfinite,
  useTaskSystemLinks,
} from "@/lib/query/hooks/useSystems";
import { formatSystemLabel } from "@/lib/utils/system-label";
import type { ProcessNodeTree } from "@/types/process";
import type {
  ScreenCatalogItem,
  SystemCatalogItem,
  TaskSystemLinkDto,
  TaskSystemScreenLinkDto,
} from "@/types/system";

const PAGE_SIZE = 50;
const ALL_FILTER = "__ALL__";

/** Task-시스템 2단계 매핑 — 1차 시스템 연결 · 2차 화면 연결(선택) */
export const TaskSystemMapping = () => {
  const t = useTranslations("systemMapping");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { companyCode, businessUnitCode, setScope, filters: scopeFilters } =
    useProcessScopeParams();

  const [nodeId, setNodeId] = useState(0);
  const [selectedTask, setSelectedTask] = useState<ProcessNodeTree | null>(null);
  const [linkId, setLinkId] = useState(0);
  const [systemSearch, setSystemSearch] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [screenSearch, setScreenSearch] = useState("");
  const [selectedSystemIds, setSelectedSystemIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [isPrimary, setIsPrimary] = useState(false);

  const debouncedSystemSearch = useDebounce(systemSearch, 300);
  const debouncedScreenSearch = useDebounce(screenSearch, 300);

  const { data: moduleOptions = [] } = useCommonCodeLookup("MODULE_CD");
  const { data: links, isLoading: linksLoading, refetch } =
    useTaskSystemLinks(nodeId);
  const batchConnectSystems = useCreateTaskSystemLinksBatch(nodeId);
  const deleteLink = useDeleteTaskSystemLink(nodeId);
  const batchConnectScreens = useCreateTaskSystemScreenLinksBatch(nodeId, linkId);
  const deleteScreenLink = useDeleteTaskSystemScreenLink(nodeId, linkId);

  const selectedLink = links?.find((link) => link.linkId === linkId);

  const systemCatalogFilters = useMemo(
    () => ({
      search: debouncedSystemSearch || undefined,
      excludeNodeId: nodeId || undefined,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSystemSearch, nodeId],
  );

  const screenCatalogFilters = useMemo(
    () => ({
      systemId: selectedLink?.systemId,
      moduleCode: moduleCode || undefined,
      search: debouncedScreenSearch || undefined,
      excludeLinkId: linkId || undefined,
      linkNodeId: nodeId || undefined,
      pageSize: PAGE_SIZE,
    }),
    [debouncedScreenSearch, linkId, moduleCode, nodeId, selectedLink?.systemId],
  );

  const {
    data: systemCatalog,
    isLoading: systemCatalogLoading,
    fetchNextPage: fetchNextSystemPage,
    hasNextPage: hasNextSystemPage,
    isFetchingNextPage: isFetchingNextSystemPage,
  } = useSystemCatalogInfinite(
    systemCatalogFilters,
    locale,
    nodeId > 0 && linkId === 0,
  );

  const {
    data: screenCatalog,
    isLoading: screenCatalogLoading,
    fetchNextPage: fetchNextScreenPage,
    hasNextPage: hasNextScreenPage,
    isFetchingNextPage: isFetchingNextScreenPage,
  } = useScreenCatalogInfinite(
    screenCatalogFilters,
    locale,
    nodeId > 0 && linkId > 0,
  );

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

  const {
    height: linkedScreensPanelHeight,
    isResizing: isResizingLinkedScreensPanel,
    handleResizePointerDown: handleLinkedScreensPanelResize,
  } = useVerticalPanelResize({
    storageKey: "pams-system-mapping-linked-screens-panel-height",
    defaultHeight: 180,
    minHeight: 120,
    maxHeight: 400,
  });

  const systemCatalogItems = useMemo(
    () => systemCatalog?.pages.flatMap((page) => page.items) ?? [],
    [systemCatalog?.pages],
  );
  const systemCatalogTotal = systemCatalog?.pages[0]?.total ?? 0;
  const screenCatalogItems = useMemo(
    () => screenCatalog?.pages.flatMap((page) => page.items) ?? [],
    [screenCatalog?.pages],
  );
  const screenCatalogTotal = screenCatalog?.pages[0]?.total ?? 0;
  const linkedScreens = selectedLink?.screens ?? [];

  const resetSystemSelection = useCallback(() => {
    setSelectedSystemIds(new Set());
  }, []);

  const resetScreenSelection = useCallback(() => {
    setSelectedScreenIds(new Set());
  }, []);

  const handleScopeChange = useCallback(
    (scope: Parameters<typeof setScope>[0]) => {
      setSelectedTask(null);
      setNodeId(0);
      setLinkId(0);
      resetSystemSelection();
      resetScreenSelection();
      setScope(scope);
    },
    [resetScreenSelection, resetSystemSelection, setScope],
  );

  const handleSelectProcess = useCallback(
    (node: ProcessNodeTree) => {
      setSelectedTask(node);
      setNodeId(node.nodeId);
      setLinkId(0);
      resetSystemSelection();
      resetScreenSelection();
    },
    [resetScreenSelection, resetSystemSelection],
  );

  const selectLink = useCallback(
    (nextLinkId: number) => {
      setLinkId((current) => (current === nextLinkId ? 0 : nextLinkId));
      resetScreenSelection();
      setModuleCode("");
      setScreenSearch("");
    },
    [resetScreenSelection],
  );

  const toggleSystemSelection = useCallback((systemId: number) => {
    setSelectedSystemIds((prev) => {
      const next = new Set(prev);
      if (next.has(systemId)) {
        next.delete(systemId);
      } else {
        next.add(systemId);
      }
      return next;
    });
  }, []);

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

  const toggleAllSystemsOnPage = useCallback(() => {
    const pageIds = systemCatalogItems.map((item) => item.systemId);
    const allSelected = pageIds.every((id) => selectedSystemIds.has(id));
    setSelectedSystemIds((prev) => {
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
  }, [selectedSystemIds, systemCatalogItems]);

  const toggleAllScreensOnPage = useCallback(() => {
    const pageIds = screenCatalogItems.map((item) => item.screenId);
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
  }, [screenCatalogItems, selectedScreenIds]);

  const handleConnectSystems = async () => {
    if (!nodeId || selectedSystemIds.size === 0) {
      return;
    }

    try {
      await batchConnectSystems.mutateAsync({
        systemIds: [...selectedSystemIds],
        isPrimary,
      });
      resetSystemSelection();
      setIsPrimary(false);
      await refetch();
    } catch {
      // onMutationError에서 토스트 표시
    }
  };

  const handleConnectScreens = async () => {
    if (!nodeId || !linkId || !selectedLink || selectedScreenIds.size === 0) {
      return;
    }

    try {
      await batchConnectScreens.mutateAsync({
        screenIds: [...selectedScreenIds],
      });
      resetScreenSelection();
      await refetch();
    } catch {
      // onMutationError에서 토스트 표시
    }
  };

  const linkedSystemColumns = useMemo<DataGridColumn<TaskSystemLinkDto>[]>(
    () => [
      {
        key: "company",
        header: t("company"),
        width: 96,
        minWidth: 72,
        sortable: true,
        filter: "select",
        value: (link) => link.companyName ?? link.companyCode ?? "",
        cell: (link) => (
          <span className="truncate">
            {link.companyName ?? link.companyCode ?? "-"}
          </span>
        ),
      },
      {
        key: "businessUnit",
        header: t("businessUnit"),
        width: 96,
        minWidth: 72,
        sortable: true,
        filter: "select",
        value: (link) =>
          link.businessUnitName ?? link.businessUnitCode ?? "",
        cell: (link) => (
          <span className="truncate">
            {link.businessUnitName ?? link.businessUnitCode ?? "-"}
          </span>
        ),
      },
      {
        key: "system",
        header: t("system"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "select",
        value: (link) => link.systemName,
        cell: (link) => <span className="truncate">{link.systemName}</span>,
      },
      {
        key: "primary",
        header: t("primary"),
        width: 72,
        minWidth: 60,
        align: "center",
        sortable: true,
        filter: "select",
        value: (link) => (link.isPrimary ? t("primaryYes") : ""),
        cell: (link) =>
          link.isPrimary ? (
            <Badge className="h-5 px-1.5 text-xs">{t("primaryYes")}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
      },
      {
        key: "screenCount",
        header: t("screenCount"),
        width: 64,
        minWidth: 52,
        align: "center",
        sortable: true,
        value: (link) => link.screenCount,
        cell: (link) => <span>{link.screenCount}</span>,
      },
      {
        key: "actions",
        header: t("actions"),
        width: 60,
        minWidth: 52,
        align: "center",
        cell: (link) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-sm"
            onClick={(event) => {
              event.stopPropagation();
              deleteLink.mutate(link.linkId);
              if (linkId === link.linkId) {
                setLinkId(0);
              }
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [deleteLink, linkId, t],
  );

  const linkedScreenColumns = useMemo<DataGridColumn<TaskSystemScreenLinkDto>[]>(
    () => [
      {
        key: "module",
        header: t("module"),
        width: 72,
        minWidth: 60,
        sortable: true,
        filter: "select",
        value: (screen) => screen.moduleCode,
        cell: (screen) => (
          <span className="font-mono text-sm">{screen.moduleCode}</span>
        ),
      },
      {
        key: "menuId",
        header: t("menuId"),
        width: 96,
        minWidth: 80,
        sortable: true,
        filter: "text",
        value: (screen) => screen.menuId,
        cell: (screen) => (
          <span className="font-mono text-sm">{screen.menuId}</span>
        ),
      },
      {
        key: "screen",
        header: t("screen"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (screen) => screen.screenName,
        cell: (screen) => (
          <span className="truncate">{screen.screenName}</span>
        ),
      },
      {
        key: "menuPath",
        header: t("menuPath"),
        width: 200,
        minWidth: 160,
        sortable: true,
        filter: "text",
        value: (screen) => screen.menuPath ?? "",
        cell: (screen) => (
          <span className="line-clamp-2 text-sm text-slate-600">
            {screen.menuPath ?? "-"}
          </span>
        ),
      },
      {
        key: "actions",
        header: t("actions"),
        width: 60,
        minWidth: 52,
        align: "center",
        cell: (screen) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-sm"
            onClick={() => deleteScreenLink.mutate(screen.screenLinkId)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [deleteScreenLink, t],
  );

  const availableSystemColumns = useMemo<DataGridColumn<SystemCatalogItem>[]>(
    () => [
      {
        key: "select",
        header: (
          <input
            type="checkbox"
            aria-label={t("selectAllOnPage")}
            checked={
              systemCatalogItems.length > 0 &&
              systemCatalogItems.every((item) =>
                selectedSystemIds.has(item.systemId),
              )
            }
            onChange={toggleAllSystemsOnPage}
          />
        ),
        width: 40,
        minWidth: 36,
        align: "center",
        cell: (item) => (
          <input
            type="checkbox"
            aria-label={t("selectSystem")}
            checked={selectedSystemIds.has(item.systemId)}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleSystemSelection(item.systemId)}
          />
        ),
      },
      {
        key: "company",
        header: t("company"),
        width: 96,
        minWidth: 72,
        sortable: true,
        filter: "select",
        value: (item) => item.companyName ?? item.companyCode ?? "",
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
        sortable: true,
        filter: "select",
        value: (item) => item.businessUnitName ?? item.businessUnitCode ?? "",
        cell: (item) => (
          <span className="truncate">
            {item.businessUnitName ?? item.businessUnitCode ?? "-"}
          </span>
        ),
      },
      {
        key: "system",
        header: t("system"),
        width: 140,
        minWidth: 110,
        sortable: true,
        filter: "select",
        value: (item) => item.systemName,
        cell: (item) => (
          <span className="truncate">{formatSystemLabel(item)}</span>
        ),
      },
      {
        key: "screenCount",
        header: t("screenCount"),
        width: 64,
        minWidth: 52,
        align: "center",
        value: (item) => item.screenCount ?? 0,
        cell: (item) => <span>{item.screenCount ?? 0}</span>,
      },
    ],
    [
      selectedSystemIds,
      systemCatalogItems,
      t,
      toggleAllSystemsOnPage,
      toggleSystemSelection,
    ],
  );

  const availableScreenColumns = useMemo<DataGridColumn<ScreenCatalogItem>[]>(
    () => [
      {
        key: "select",
        header: (
          <input
            type="checkbox"
            aria-label={t("selectAllOnPage")}
            checked={
              screenCatalogItems.length > 0 &&
              screenCatalogItems.every((item) =>
                selectedScreenIds.has(item.screenId),
              )
            }
            onChange={toggleAllScreensOnPage}
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
        key: "module",
        header: t("module"),
        width: 72,
        minWidth: 60,
        sortable: true,
        filter: "select",
        value: (item) => item.moduleCode ?? "",
        cell: (item) => (
          <span className="font-mono text-sm">{item.moduleCode}</span>
        ),
      },
      {
        key: "menuId",
        header: t("menuId"),
        width: 100,
        minWidth: 80,
        sortable: true,
        filter: "text",
        value: (item) => item.menuId ?? "",
        cell: (item) => (
          <span className="font-mono text-sm">{item.menuId}</span>
        ),
      },
      {
        key: "screenName",
        header: t("screen"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (item) => item.screenName,
        cell: (item) => <span className="truncate">{item.screenName}</span>,
      },
      {
        key: "menuPath",
        header: t("menuPath"),
        width: 220,
        minWidth: 160,
        sortable: true,
        filter: "text",
        value: (item) => item.menuPath ?? "",
        cell: (item) => (
          <span className="line-clamp-2 text-sm text-slate-600">
            {item.menuPath ?? "-"}
          </span>
        ),
      },
    ],
    [
      screenCatalogItems,
      selectedScreenIds,
      t,
      toggleAllScreensOnPage,
      toggleScreenSelection,
    ],
  );

  const screenFilterBar = (
    <div className="mb-1.5 flex shrink-0 flex-wrap items-center gap-1.5">
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

  const renderSystemMode = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SearchBar
        variant="filter"
        className="mb-1.5 shrink-0"
        value={systemSearch}
        onChange={(value) => {
          setSystemSearch(value);
          resetSystemSelection();
        }}
        placeholder={t("systemSearchPlaceholder")}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DataGrid
          title={t("availableSystems")}
          count={systemCatalogTotal}
          countSuffix={tc("countUnit")}
          icon
          toolbar={
            <span className="text-sm text-slate-500">
              {t("loadedCount", {
                loaded: systemCatalogItems.length,
                total: systemCatalogTotal,
              })}
              {isFetchingNextSystemPage ? ` · ${tc("loading")}` : null}
            </span>
          }
          columns={availableSystemColumns}
          data={systemCatalogItems}
          rowKey={(item) => item.systemId}
          storageKey="pams-task-system-available-systems-grid"
          emptyMessage={t("emptyAvailableSystems")}
          body={
            systemCatalogLoading ? (
              <LoadingSpinner className="min-h-[240px]" />
            ) : undefined
          }
          onRowClick={(item) => toggleSystemSelection(item.systemId)}
          onReachEnd={() => {
            if (hasNextSystemPage && !isFetchingNextSystemPage) {
              void fetchNextSystemPage();
            }
          }}
          loadingMore={isFetchingNextSystemPage}
          fillHeight
        />
      </div>
    </div>
  );

  const renderScreenMode = () => (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-1.5 shrink-0 rounded-lg border border-slate-200/85 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40">
        <span className="text-muted-foreground">{t("selectedSystem")}: </span>
        <span className="font-medium">
          {selectedLink ? formatSystemLabel(selectedLink) : "-"}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="ml-2 h-6 px-2 text-sm"
          onClick={() => {
            setLinkId(0);
            resetScreenSelection();
          }}
        >
          {t("clearSystemSelection")}
        </Button>
      </div>

      <div
        className="flex min-h-0 shrink-0 flex-col overflow-hidden"
        style={{ height: linkedScreensPanelHeight }}
      >
        <DataGrid
          title={t("linkedScreens")}
          count={linkedScreens.length}
          countSuffix={tc("countUnit")}
          icon
          columns={linkedScreenColumns}
          data={linkedScreens}
          rowKey={(screen) => screen.screenLinkId}
          storageKey="pams-task-system-linked-screens-grid"
          emptyMessage={t("emptyLinkedScreens")}
          fillHeight
        />
      </div>

      <PanelSplitter
        orientation="vertical"
        label={t("panelResizeVertical")}
        isResizing={isResizingLinkedScreensPanel}
        onPointerDown={handleLinkedScreensPanelResize}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {screenFilterBar}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DataGrid
            title={t("availableScreens")}
            count={screenCatalogTotal}
            countSuffix={tc("countUnit")}
            icon
            toolbar={
              <span className="text-sm text-slate-500">
                {t("loadedCount", {
                  loaded: screenCatalogItems.length,
                  total: screenCatalogTotal,
                })}
                {isFetchingNextScreenPage ? ` · ${tc("loading")}` : null}
              </span>
            }
            columns={availableScreenColumns}
            data={screenCatalogItems}
            rowKey={(item) => item.screenId}
            storageKey="pams-task-system-available-screens-grid"
            emptyMessage={t("emptyAvailableScreens")}
            body={
              screenCatalogLoading ? (
                <LoadingSpinner className="min-h-[240px]" />
              ) : undefined
            }
            onRowClick={(item) => toggleScreenSelection(item.screenId)}
            onReachEnd={() => {
              if (hasNextScreenPage && !isFetchingNextScreenPage) {
                void fetchNextScreenPage();
              }
            }}
            loadingMore={isFetchingNextScreenPage}
            fillHeight
          />
        </div>
      </div>
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
            count={links?.length ?? 0}
            countSuffix={tc("countUnit")}
            icon
            columns={linkedSystemColumns}
            data={links ?? []}
            rowKey={(link) => link.linkId}
            storageKey="pams-task-system-links-grid"
            selectedRowKey={linkId || undefined}
            onRowClick={(link) => selectLink(link.linkId)}
            emptyMessage={t("emptyMappings")}
            body={
              linksLoading ? (
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
          {linkId > 0 ? renderScreenMode() : renderSystemMode()}
        </div>
      </div>
    );
  };

  const isScreenMode = linkId > 0;

  return (
    <ListPageLayout>
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={Link2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {!isScreenMode ? (
              <label className="flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(event) => setIsPrimary(event.target.checked)}
                />
                {t("markPrimary")}
              </label>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={
                !nodeId ||
                (isScreenMode
                  ? selectedScreenIds.size === 0 || batchConnectScreens.isPending
                  : selectedSystemIds.size === 0 || batchConnectSystems.isPending)
              }
              onClick={() =>
                void (isScreenMode
                  ? handleConnectScreens()
                  : handleConnectSystems())
              }
            >
              <Link2 className="size-3.5" />
              {t("connectSelected", {
                count: isScreenMode
                  ? selectedScreenIds.size
                  : selectedSystemIds.size,
              })}
            </Button>
          </div>
        }
      />

      <TaskMappingSideLayout
        storageKey="pams-system-mapping-task-panel-width"
        defaultWidth={300}
        splitterLabel={t("panelResizeHorizontal")}
        companyCode={companyCode}
        businessUnitCode={businessUnitCode}
        onScopeChange={handleScopeChange}
        scopeFilters={scopeFilters}
        selectedProcessId={selectedTask?.nodeId}
        onSelectProcess={handleSelectProcess}
        selectableLevels={["L4"]}
        e2eSelectable={false}
      >
          {selectedTask ? (
            <div className="mb-1.5 shrink-0 rounded-lg border border-slate-200/85 bg-white px-3 py-2 text-xs shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40">
              <span className="font-medium">{selectedTask.name}</span>
              <span className="ml-2 font-mono text-slate-500">
                {selectedTask.code}
              </span>
              <span className="ml-2 text-muted-foreground">L4</span>
            </div>
          ) : null}
          {renderRightBody()}
      </TaskMappingSideLayout>
    </ListPageLayout>
  );
};
