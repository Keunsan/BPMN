"use client";

import { Link2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ListPageLayout, PageHeader } from "@/components/common/layout";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  useCreateTaskDataTableLink,
  useDeleteTaskDataTableLink,
  useExternalTables,
  useTaskDataTableLinks,
} from "@/lib/query/hooks/useExternalTables";
import { useProcessTree } from "@/lib/query/hooks/useProcess";
import { useSystems } from "@/lib/query/hooks/useSystems";
import { cn } from "@/lib/utils";
import { formatSystemLabel } from "@/lib/utils/system-label";
import type { TaskDataTableLinkDto } from "@/types/data-table";
import type { ExternalTable } from "@/types/external";
import type { CrudType, DataLinkType } from "@/types/metadata";
import type { ProcessNodeTree } from "@/types/process";

type TaskOption = {
  nodeId: number;
  code: string;
  name: string;
  level: string;
};

type AvailableTableRow = ExternalTable & {
  systemId: number;
  systemName: string;
};

const LINK_TYPES: DataLinkType[] = ["INPUT", "OUTPUT", "REFERENCE"];
const CRUD_TYPES: CrudType[] = [
  "C",
  "R",
  "U",
  "D",
  "CR",
  "CU",
  "CRU",
  "CRUD",
  "RU",
  "RD",
  "CRD",
  "RUD",
];
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

const tableRowKey = (row: {
  systemId: number;
  schemaName: string | null;
  tableName: string;
}) => `${row.systemId}:${row.schemaName ?? ""}:${row.tableName}`;

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

/** Task와 외부 데이터 테이블 연결 — 좌측 태스크 · 우측 테이블 다중 연결 */
export const DataTableLink = () => {
  const t = useTranslations("dataLink");
  const ts = useTranslations("systemMapping");
  const te = useTranslations("externalTables");
  const tc = useTranslations("common");

  const [nodeId, setNodeId] = useState(0);
  const [taskSearch, setTaskSearch] = useState("");
  const [systemId, setSystemId] = useState(0);
  const [schemaName, setSchemaName] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [selectedTableKeys, setSelectedTableKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [linkType, setLinkType] = useState<DataLinkType>("INPUT");
  const [crudType, setCrudType] = useState<CrudType>("R");
  const [isCritical, setIsCritical] = useState(false);

  const debouncedSchema = useDebounce(schemaName, 300);
  const debouncedTableSearch = useDebounce(tableSearch, 300);

  const { data: tree, isLoading: treeLoading } = useProcessTree();
  const { data: systems } = useSystems({ isActive: true });
  const { data: links, isLoading: linksLoading, refetch } =
    useTaskDataTableLinks(nodeId);
  const createLink = useCreateTaskDataTableLink(nodeId);
  const deleteLink = useDeleteTaskDataTableLink(nodeId);

  const tableQuery = useMemo(
    () => ({
      systemId,
      schemaName: debouncedSchema.trim() || undefined,
      search: debouncedTableSearch.trim() || undefined,
    }),
    [debouncedSchema, debouncedTableSearch, systemId],
  );

  const {
    data: externalTables,
    isLoading: catalogLoading,
    isError: catalogError,
    refetch: refetchCatalog,
  } = useExternalTables(tableQuery, {
    enabled: nodeId > 0 && systemId > 0,
  });

  const {
    width: taskPanelWidth,
    isResizing: isResizingTaskPanel,
    handleResizePointerDown: handleTaskPanelResize,
  } = useHorizontalPanelResize({
    storageKey: "pams-data-table-link-task-panel-width",
    defaultWidth: 400,
    minWidth: 280,
    maxWidth: 640,
  });

  const {
    height: linkedPanelHeight,
    isResizing: isResizingLinkedPanel,
    handleResizePointerDown: handleLinkedPanelResize,
  } = useVerticalPanelResize({
    storageKey: "pams-data-table-link-linked-panel-height",
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
  const selectedSystem = systems?.find(
    (system) => Number(system.systemId) === systemId,
  );
  const linkTypeLabel = t(`linkTypes.${linkType}`);
  const crudTypeLabel = t(`crudTypes.${crudType}`);

  const linkedKeys = useMemo(
    () =>
      new Set(
        (links ?? []).map((link) =>
          tableRowKey({
            systemId: link.systemId,
            schemaName: link.schemaName,
            tableName: link.tableName,
          }),
        ),
      ),
    [links],
  );

  const catalogItems = useMemo<AvailableTableRow[]>(() => {
    if (systemId <= 0) {
      return [];
    }

    const system =
      selectedSystem ??
      systems?.find((item) => Number(item.systemId) === systemId) ??
      null;
    const resolvedSystemId = system ? Number(system.systemId) : systemId;
    const systemName = system ? formatSystemLabel(system) : String(systemId);

    return (externalTables ?? [])
      .map((table) => ({
        ...table,
        systemId: resolvedSystemId,
        systemName,
      }))
      .filter((table) => !linkedKeys.has(tableRowKey(table)));
  }, [externalTables, linkedKeys, selectedSystem, systemId, systems]);

  const resetTableSelection = useCallback(() => {
    setSelectedTableKeys(new Set());
  }, []);

  const selectTask = useCallback(
    (nextNodeId: number) => {
      setNodeId(nextNodeId);
      resetTableSelection();
    },
    [resetTableSelection],
  );

  const toggleTableSelection = useCallback((key: string) => {
    setSelectedTableKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    const pageKeys = catalogItems.map((item) => tableRowKey(item));
    const allSelected = pageKeys.every((key) => selectedTableKeys.has(key));
    setSelectedTableKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const key of pageKeys) {
          next.delete(key);
        }
      } else {
        for (const key of pageKeys) {
          next.add(key);
        }
      }
      return next;
    });
  }, [catalogItems, selectedTableKeys]);

  const handleConnect = async () => {
    if (!nodeId || selectedTableKeys.size === 0) {
      return;
    }

    const rowMap = new Map(
      catalogItems.map((item) => [tableRowKey(item), item] as const),
    );

    for (const key of selectedTableKeys) {
      const row = rowMap.get(key);
      if (!row) {
        continue;
      }

      await createLink.mutateAsync({
        nodeId,
        systemId: row.systemId,
        schemaName: row.schemaName,
        tableName: row.tableName,
        tableNameKor: row.tableNameKor,
        linkType,
        crudType,
        isCritical,
      });
    }

    setSelectedTableKeys(new Set());
    setIsCritical(false);
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
        header: ts("taskCode"),
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
        header: ts("level"),
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
        header: ts("taskName"),
        width: 180,
        minWidth: 140,
        sortable: true,
        filter: "text",
        value: (task) => task.name,
        cell: (task) => <span className="font-medium">{task.name}</span>,
      },
    ],
    [ts],
  );

  const linkedColumns = useMemo<DataGridColumn<TaskDataTableLinkDto>[]>(
    () => [
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
        key: "schemaName",
        header: te("schema"),
        width: 72,
        minWidth: 60,
        sortable: true,
        filter: "text",
        value: (link) => link.schemaName ?? "",
        cell: (link) => (
          <span className="font-mono text-[11px]">{link.schemaName ?? "-"}</span>
        ),
      },
      {
        key: "tableName",
        header: te("tableName"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (link) => link.tableName,
        cell: (link) => (
          <span className="truncate font-mono text-[11px]">{link.tableName}</span>
        ),
      },
      {
        key: "tableNameKor",
        header: t("tableNameKor"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "text",
        value: (link) => link.tableNameKor ?? "",
        cell: (link) => (
          <span className="truncate">{link.tableNameKor ?? "-"}</span>
        ),
      },
      {
        key: "linkType",
        header: t("linkType"),
        width: 88,
        minWidth: 72,
        align: "center",
        sortable: true,
        filter: "select",
        value: (link) => link.linkType,
        cell: (link) => (
          <Badge className="h-5 px-1.5 text-[10px]">
            {t(`linkTypes.${link.linkType}`)}
          </Badge>
        ),
      },
      {
        key: "crudType",
        header: t("crudType"),
        width: 72,
        minWidth: 60,
        align: "center",
        sortable: true,
        filter: "select",
        value: (link) => link.crudType ?? "",
        cell: (link) => link.crudType ?? "-",
      },
      {
        key: "keyColumns",
        header: t("keyColumns"),
        width: 140,
        minWidth: 100,
        sortable: true,
        filter: "text",
        value: (link) => link.keyColumns ?? "",
        cell: (link) => (
          <span className="truncate">{link.keyColumns ?? "-"}</span>
        ),
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
            className="h-6 px-2 text-[11px]"
            onClick={() => deleteLink.mutate(link.linkId)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ),
      },
    ],
    [deleteLink, t, te],
  );

  const availableColumns = useMemo<DataGridColumn<AvailableTableRow>[]>(
    () => [
      {
        key: "select",
        header: (
          <input
            type="checkbox"
            aria-label={ts("selectAllOnPage")}
            checked={
              catalogItems.length > 0 &&
              catalogItems.every((item) =>
                selectedTableKeys.has(tableRowKey(item)),
              )
            }
            onChange={toggleAllOnPage}
          />
        ),
        width: 40,
        minWidth: 36,
        align: "center",
        cell: (item) => {
          const key = tableRowKey(item);
          return (
            <input
              type="checkbox"
              aria-label={t("selectTable")}
              checked={selectedTableKeys.has(key)}
              onClick={(event) => event.stopPropagation()}
              onChange={() => toggleTableSelection(key)}
            />
          );
        },
      },
      {
        key: "system",
        header: t("system"),
        width: 120,
        minWidth: 96,
        sortable: true,
        filter: "select",
        value: (item) => item.systemName,
        cell: (item) => <span className="truncate">{item.systemName}</span>,
      },
      {
        key: "schemaName",
        header: te("schema"),
        width: 72,
        minWidth: 60,
        sortable: true,
        filter: "text",
        value: (item) => item.schemaName ?? "",
        cell: (item) => (
          <span className="font-mono text-[11px]">{item.schemaName ?? "-"}</span>
        ),
      },
      {
        key: "tableName",
        header: te("tableName"),
        width: 160,
        minWidth: 120,
        sortable: true,
        filter: "text",
        value: (item) => item.tableName,
        cell: (item) => (
          <span className="truncate font-mono text-[11px]">{item.tableName}</span>
        ),
      },
      {
        key: "tableNameKor",
        header: t("tableNameKor"),
        width: 140,
        minWidth: 100,
        sortable: true,
        filter: "text",
        value: (item) => item.tableNameKor ?? "",
        cell: (item) => (
          <span className="truncate">{item.tableNameKor ?? "-"}</span>
        ),
      },
      {
        key: "tableType",
        header: te("tableType"),
        width: 88,
        minWidth: 72,
        sortable: true,
        filter: "select",
        value: (item) => item.tableType ?? "",
        cell: (item) => item.tableType ?? "-",
      },
    ],
    [catalogItems, selectedTableKeys, t, te, toggleAllOnPage, toggleTableSelection, ts],
  );

  const tableFilterBar = (
    <div className="mb-1.5 flex shrink-0 flex-wrap items-center gap-1.5">
      <Select
        value={systemId ? String(systemId) : ALL_FILTER}
        onValueChange={(value) => {
          setSystemId(value === ALL_FILTER ? 0 : Number(value));
          resetTableSelection();
        }}
      >
        <SelectTrigger variant="filter" className="h-8 w-[180px]">
          <SelectValue placeholder={te("selectSystem")}>
            {selectedSystem ? formatSystemLabel(selectedSystem) : te("selectSystem")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent variant="filter">
          <SelectItem variant="filter" value={ALL_FILTER}>
            {ts("allSystems")}
          </SelectItem>
          {systems?.map((system) => (
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
      <Input
        value={schemaName}
        onChange={(event) => {
          setSchemaName(event.target.value);
          resetTableSelection();
        }}
        placeholder={te("schema")}
        className="h-8 w-[100px] text-xs"
      />
      <SearchBar
        variant="filter"
        className="min-w-[200px] flex-1"
        value={tableSearch}
        onChange={(value) => {
          setTableSearch(value);
          resetTableSelection();
        }}
        placeholder={te("tableSearchPlaceholder")}
      />
    </div>
  );

  const renderAvailableBody = () => {
    if (!systemId) {
      return (
        <EmptyState title={te("selectSystem")} className="min-h-[240px]" />
      );
    }
    if (catalogLoading) {
      return <LoadingSpinner className="min-h-[240px]" />;
    }
    if (catalogError) {
      return (
        <EmptyState
          title={te("loadError")}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetchCatalog()}
            >
              {te("search")}
            </Button>
          }
          className="min-h-[240px]"
        />
      );
    }
    return undefined;
  };

  const renderRightBody = () => {
    if (!nodeId) {
      return (
        <EmptyState title={ts("selectTaskHint")} className="min-h-[320px]" />
      );
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className="flex min-h-0 shrink-0 flex-col overflow-hidden"
          style={{ height: linkedPanelHeight }}
        >
          <DataGrid
            title={t("linkedTables")}
            count={links?.length ?? 0}
            countSuffix={tc("countUnit")}
            icon
            columns={linkedColumns}
            data={links ?? []}
            rowKey={(link) => link.linkId}
            storageKey="pams-data-table-links-linked-grid"
            emptyMessage={t("emptyLinks")}
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
          label={ts("panelResizeVertical")}
          isResizing={isResizingLinkedPanel}
          onPointerDown={handleLinkedPanelResize}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {tableFilterBar}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DataGrid
              title={t("availableTables")}
              count={catalogItems.length}
              countSuffix={tc("countUnit")}
              icon
              columns={availableColumns}
              data={catalogItems}
              rowKey={(item) => tableRowKey(item)}
              storageKey="pams-data-table-links-available-grid"
              emptyMessage={t("emptyAvailableTables")}
              body={renderAvailableBody()}
              onRowClick={(item) => toggleTableSelection(tableRowKey(item))}
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
              value={linkType}
              onValueChange={(value) =>
                value && setLinkType(value as DataLinkType)
              }
            >
              <SelectTrigger variant="filter" className="h-8 w-[120px]">
                <SelectValue>{linkTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent variant="filter">
                {LINK_TYPES.map((type) => (
                  <SelectItem variant="filter" key={type} value={type}>
                    {t(`linkTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={crudType}
              onValueChange={(value) =>
                value && setCrudType(value as CrudType)
              }
            >
              <SelectTrigger variant="filter" className="h-8 w-[120px]">
                <SelectValue>{crudTypeLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent variant="filter">
                {CRUD_TYPES.map((type) => (
                  <SelectItem variant="filter" key={type} value={type}>
                    {t(`crudTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs">
              <input
                type="checkbox"
                checked={isCritical}
                onChange={(event) => setIsCritical(event.target.checked)}
              />
              {t("markCritical")}
            </label>
            <Button
              type="button"
              size="sm"
              disabled={
                !nodeId ||
                selectedTableKeys.size === 0 ||
                createLink.isPending
              }
              onClick={() => void handleConnect()}
            >
              <Link2 className="size-3.5" />
              {t("connectSelected", { count: selectedTableKeys.size })}
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
            title={ts("taskList")}
            count={filteredTasks.length}
            countSuffix={tc("countUnit")}
            icon
            toolbar={
              <SearchBar
                variant="filter"
                className="w-[160px]"
                value={taskSearch}
                onChange={setTaskSearch}
                placeholder={ts("taskSearchPlaceholder")}
              />
            }
            columns={taskColumns}
            data={filteredTasks}
            rowKey={(task) => task.nodeId}
            storageKey="pams-data-table-link-task-grid"
            selectedRowKey={nodeId || undefined}
            onRowClick={(task) => selectTask(task.nodeId)}
            emptyMessage={ts("emptyTasks")}
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
          label={ts("panelResizeHorizontal")}
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
