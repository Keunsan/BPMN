"use client";



import { Database } from "lucide-react";

import { useTranslations } from "next-intl";

import { useCallback, useMemo, useState } from "react";



import { DataGrid, type DataGridColumn } from "@/components/common/DataGrid";

import { EmptyState } from "@/components/common/EmptyState";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";

import {

  FilterField,

  FilterPanel,

  ListPageBody,

  ListPageLayout,

  PageActions,

  PageContent,

  PageHeader,

} from "@/components/common/layout";

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

import {

  useExternalColumns,

  useExternalTables,

} from "@/lib/query/hooks/useExternalTables";

import { useSystems } from "@/lib/query/hooks/useSystems";

import { formatSystemLabel } from "@/lib/utils/system-label";

import type {

  ExternalColumn,

  ExternalTable,

  ExternalTableQuery,

} from "@/types/external";



export type ExternalTableSelection = ExternalTable & {

  systemId: number;

  systemName: string;

};



type ExternalTableBrowserProps = {

  onSelect?: (selection: ExternalTableSelection) => void;

  selected?: ExternalTableSelection | null;

  /** true면 상위 레이아웃에 임베드 — 페이지 헤더·ListPageLayout 생략 */

  embedded?: boolean;

};



/** 외부 시스템 테이블과 컬럼 메타정보 조회 화면 */

export const ExternalTableBrowser = ({

  onSelect,

  selected,

  embedded = false,

}: ExternalTableBrowserProps) => {

  const t = useTranslations("externalTables");

  const tc = useTranslations("common");

  const [systemId, setSystemId] = useState<number>(selected?.systemId ?? 0);

  const [schemaName, setSchemaName] = useState(selected?.schemaName ?? "");

  const [search, setSearch] = useState("");

  const [submittedQuery, setSubmittedQuery] = useState<ExternalTableQuery | null>(

    selected

      ? {

          systemId: selected.systemId,

          schemaName: selected.schemaName ?? undefined,

        }

      : null,

  );

  const [activeTable, setActiveTable] = useState<ExternalTable | null>(

    selected ?? null,

  );



  const { data: systems } = useSystems({ isActive: true });

  const selectedSystem = useMemo(

    () => systems?.find((system) => Number(system.systemId) === systemId) ?? null,

    [systemId, systems],

  );

  const systemItems = useMemo(

    () =>

      systems?.map((system) => ({

        label: formatSystemLabel(system),

        value: String(system.systemId),

      })) ?? [],

    [systems],

  );

  const { data: tables, isLoading, isError, refetch } = useExternalTables(

    submittedQuery ?? { systemId: 0 },

    { enabled: Boolean(submittedQuery?.systemId) },

  );

  const {

    data: columns,

    isLoading: columnsLoading,

    refetch: refetchColumns,

  } = useExternalColumns(

    {

      systemId,

      schemaName: activeTable?.schemaName ?? undefined,

      tableName: activeTable?.tableName,

    },

    { enabled: Boolean(activeTable) },

  );



  const clearSubmittedQuery = () => {

    setSubmittedQuery(null);

    setActiveTable(null);

  };



  const handleSearch = () => {

    if (!systemId) return;



    const nextQuery: ExternalTableQuery = {

      systemId,

      schemaName: schemaName.trim() || undefined,

      search: search.trim() || undefined,

    };



    setActiveTable(null);

    if (

      submittedQuery?.systemId === nextQuery.systemId &&

      submittedQuery.schemaName === nextQuery.schemaName &&

      submittedQuery.search === nextQuery.search

    ) {

      void refetch();

      return;

    }



    setSubmittedQuery(nextQuery);

  };



  const handleSelect = useCallback(

    (table: ExternalTable) => {

      setActiveTable(table);

      if (selectedSystem && onSelect) {

        onSelect({

          ...table,

          systemId: selectedSystem.systemId,

          systemName: formatSystemLabel(selectedSystem),

        });

      }

    },

    [onSelect, selectedSystem],

  );



  const tableColumns = useMemo<DataGridColumn<ExternalTable>[]>(

    () => [

      {

        key: "no",

        header: "No.",

        width: 48,

        minWidth: 44,

        align: "center",

        cell: (_table, rowIndex) => rowIndex + 1,

      },

      {

        key: "tableName",

        header: t("tableName"),

        width: 180,

        minWidth: 120,

        sortable: true,

        filter: "text",

        value: (table) => table.tableName,

        cell: (table) => (

          <span className="font-mono text-sm">{table.tableName}</span>

        ),

      },

      {

        key: "tableNameKor",

        header: t("tableNameKor"),

        width: 160,

        minWidth: 100,

        sortable: true,

        filter: "text",

        value: (table) => table.tableNameKor ?? "",

        cell: (table) => table.tableNameKor ?? "-",

      },

      {

        key: "actions",

        header: t("actions"),

        width: 88,

        minWidth: 80,

        align: "center",

        cell: (table) => (

          <Button

            type="button"

            size="sm"

            variant="outline"

            className="h-6 px-2 text-sm"

            onClick={(event) => {

              event.stopPropagation();

              handleSelect(table);

            }}

          >

            <Database className="size-3.5" />

            {t("select")}

          </Button>

        ),

      },

    ],

    [handleSelect, t],

  );



  const renderTableBody = () => {

    if (!systemId) {

      return <EmptyState title={t("selectSystem")} className="min-h-[240px]" />;

    }

    if (!submittedQuery) {

      return <EmptyState title={t("searchPrompt")} className="min-h-[240px]" />;

    }

    if (isLoading) {

      return <LoadingSpinner className="min-h-[240px]" />;

    }

    if (isError) {

      return (

        <EmptyState

          title={t("loadError")}

          action={

            <Button variant="outline" size="sm" onClick={() => void refetch()}>

              {t("search")}

            </Button>

          }

          className="min-h-[240px]"

        />

      );

    }



    return undefined;

  };



  const filterFields = (
    <>
      <FilterField label={t("system")} required>

        <Select

          items={systemItems}

          value={systemId ? String(systemId) : ""}

          onValueChange={(value) => {

            setSystemId(value ? Number(value) : 0);

            clearSubmittedQuery();

          }}

        >

          <SelectTrigger variant="filter">

            <SelectValue placeholder={t("selectSystem")}>

              {selectedSystem ? formatSystemLabel(selectedSystem) : undefined}

            </SelectValue>

          </SelectTrigger>

          <SelectContent variant="filter">

            {systems?.map((system) => (

              <SelectItem variant="filter" key={system.systemId} value={String(system.systemId)}>

                {formatSystemLabel(system)}

              </SelectItem>

            ))}

          </SelectContent>

        </Select>

      </FilterField>

      <FilterField label={t("schema")}>

        <Input

          value={schemaName}

          onChange={(event) => {

            setSchemaName(event.target.value);

            clearSubmittedQuery();

          }}

          placeholder="dbo"

        />

      </FilterField>

      <FilterField label={t("tableSearch")}>

        <SearchBar

          value={search}

          onChange={(value) => {

            setSearch(value);

            clearSubmittedQuery();

          }}

          placeholder={t("tableSearchPlaceholder")}

        />

      </FilterField>
    </>
  );



  const tableGrid = (

    <div

      className={

        embedded

          ? "grid min-h-[360px] flex-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]"

          : "grid h-full min-h-[360px] flex-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]"

      }

    >

      <DataGrid

        title={t("tables")}

        count={tables?.length ?? 0}

        countSuffix={tc("countUnit")}

        icon

        columns={tableColumns}

        data={tables ?? []}

        rowKey={(table) => `${table.schemaName ?? ""}.${table.tableName}`}

        storageKey="pams-external-tables-grid"

        emptyMessage={t("emptyTables")}

        selectedRowKey={

          activeTable

            ? `${activeTable.schemaName ?? ""}.${activeTable.tableName}`

            : undefined

        }

        onRowClick={handleSelect}

        body={renderTableBody()}

        summaryCells={(rows) => [

          rows.length.toLocaleString(),

          "",

          "",

          "",

        ]}

        fillHeight

      />



      <ColumnPanel

        columns={columns}

        countSuffix={tc("countUnit")}

        loading={columnsLoading}

        table={activeTable}

        onRefresh={() => void refetchColumns()}

      />

    </div>

  );



  if (embedded) {

    return (

      <div className="flex min-h-0 flex-col gap-3">

        <div className="rounded-lg border border-slate-200/85 bg-white p-2 shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40">

          {filterFields}

        </div>

        <div className="flex justify-end">

          <PageActions

            showRegister={false}

            onSearch={handleSearch}

            searchDisabled={!systemId}

            searchLabel={t("search")}

          />

        </div>

        {tableGrid}

      </div>

    );

  }



  return (

    <ListPageLayout>

      <PageHeader

        title={t("title")}

        description={t("description")}

        icon={Database}

        actions={

          <PageActions

            showRegister={false}

            onSearch={handleSearch}

            searchDisabled={!systemId}

          />

        }

      />

      <ListPageBody
        filterStorageKey="pams-external-tables-filter-panel-width"
        filter={<FilterPanel className="h-full w-full">{filterFields}</FilterPanel>}

        content={
          <PageContent>
            {tableGrid}
          </PageContent>
        }

      />

    </ListPageLayout>

  );

};



const ColumnPanel = ({

  table,

  columns,

  loading,

  countSuffix,

  onRefresh,

}: {

  table: ExternalTable | null;

  columns?: ExternalColumn[];

  loading: boolean;

  countSuffix?: string;

  onRefresh: () => void;

}) => {

  const t = useTranslations("externalTables");



  const columnGridColumns = useMemo<DataGridColumn<ExternalColumn>[]>(

    () => [

      {

        key: "columnName",

        header: t("columnName"),

        width: 160,

        minWidth: 120,

        sticky: "left",

        sortable: true,

        filter: "text",

        value: (column) => column.columnName,

        cell: (column) => (

          <span className="font-mono text-sm">{column.columnName}</span>

        ),

      },

      {

        key: "columnNameKor",

        header: t("tableNameKor"),

        width: 140,

        minWidth: 100,

        sortable: true,

        filter: "text",

        value: (column) => column.columnNameKor ?? "",

        cell: (column) => column.columnNameKor ?? "-",

      },

      {

        key: "dataType",

        header: t("dataType"),

        width: 120,

        minWidth: 96,

        sortable: true,

        filter: "select",

        value: (column) => column.dataType,

        cell: (column) => (

          <Badge

            variant={column.isPrimaryKey ? "default" : "secondary"}

            className="h-5 px-1.5 text-xs"

          >

            {column.dataType}

            {column.dataLength ? `(${column.dataLength})` : ""}

          </Badge>

        ),

      },

      {

        key: "nullable",

        header: t("nullable"),

        width: 96,

        minWidth: 80,

        align: "center",

        sortable: true,

        filter: "select",

        value: (column) => (column.isNullable ? "NULL" : "NOT NULL"),

        cell: (column) => (column.isNullable ? "NULL" : "NOT NULL"),

      },

      {

        key: "description",

        header: t("descriptionField"),

        width: 200,

        minWidth: 120,

        sortable: true,

        filter: "text",

        value: (column) => column.description ?? "",

        cell: (column) => (

          <span className="text-slate-500">{column.description ?? "-"}</span>

        ),

      },

    ],

    [t],

  );



  const renderBody = () => {

    if (!table) {

      return <EmptyState title={t("selectTable")} className="min-h-[240px]" />;

    }

    if (loading) {

      return <LoadingSpinner className="min-h-[240px]" />;

    }

    return undefined;

  };



  return (

    <DataGrid

      title={t("columns")}

      count={columns?.length ?? 0}

      countSuffix={countSuffix}

      icon

      toolbar={

        <Button

          type="button"

          size="sm"

          variant="outline"

          className="h-7 px-2 text-sm"

          disabled={!table}

          onClick={onRefresh}

        >

          {t("refresh")}

        </Button>

      }

      columns={columnGridColumns}

      data={columns ?? []}

      rowKey={(column) => column.columnName}

      storageKey="pams-external-columns-grid"

      emptyMessage={t("emptyColumns")}

      body={renderBody()}

      summaryCells={(rows) => [

        rows.length.toLocaleString(),

        "",

        "",

        "",

        "",

      ]}

      fillHeight

    />

  );

};


