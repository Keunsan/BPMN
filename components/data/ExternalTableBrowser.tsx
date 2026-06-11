"use client";

import { Database, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { SearchBar } from "@/components/common/SearchBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/useDebounce";
import {
  useExternalColumns,
  useExternalTables,
} from "@/lib/query/hooks/useExternalTables";
import { useSystems } from "@/lib/query/hooks/useSystems";
import type { ExternalColumn, ExternalTable } from "@/types/external";

export type ExternalTableSelection = ExternalTable & {
  systemId: number;
  systemName: string;
};

type ExternalTableBrowserProps = {
  onSelect?: (selection: ExternalTableSelection) => void;
  selected?: ExternalTableSelection | null;
};

/** 외부 시스템 테이블과 컬럼 메타정보 조회 화면 */
export const ExternalTableBrowser = ({
  onSelect,
  selected,
}: ExternalTableBrowserProps) => {
  const t = useTranslations("externalTables");
  const [systemId, setSystemId] = useState<number>(selected?.systemId ?? 0);
  const [schemaName, setSchemaName] = useState(selected?.schemaName ?? "");
  const [search, setSearch] = useState("");
  const [mock, setMock] = useState(true);
  const [activeTable, setActiveTable] = useState<ExternalTable | null>(
    selected ?? null,
  );
  const debouncedSearch = useDebounce(search, 300);

  const { data: systems } = useSystems({ isActive: true });
  const selectedSystem = useMemo(
    () => systems?.find((system) => system.systemId === systemId) ?? null,
    [systemId, systems],
  );
  const { data: tables, isLoading, isError, refetch } = useExternalTables(
    {
      systemId,
      schemaName: schemaName || undefined,
      search: debouncedSearch || undefined,
      mock,
    },
    { enabled: systemId > 0 },
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
      mock,
    },
    { enabled: Boolean(activeTable) },
  );

  const handleSelect = (table: ExternalTable) => {
    setActiveTable(table);
    if (selectedSystem && onSelect) {
      onSelect({
        ...table,
        systemId: selectedSystem.systemId,
        systemName: selectedSystem.systemName,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[220px_160px_minmax(220px,1fr)_auto]">
          <div className="space-y-1.5">
            <Label>{t("system")}</Label>
            <Select
              value={systemId ? String(systemId) : ""}
              onValueChange={(value) => {
                setSystemId(Number(value));
                setActiveTable(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectSystem")} />
              </SelectTrigger>
              <SelectContent>
                {systems?.map((system) => (
                  <SelectItem key={system.systemId} value={String(system.systemId)}>
                    {system.systemName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("schema")}</Label>
            <Input
              value={schemaName}
              onChange={(event) => setSchemaName(event.target.value)}
              placeholder="dbo"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("tableSearch")}</Label>
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder={t("tableSearchPlaceholder")}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant={mock ? "default" : "outline"}
              onClick={() => setMock((value) => !value)}
            >
              {t("mock")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={!systemId}
            >
              <RefreshCw className="size-4" />
              {t("refresh")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b p-3 font-semibold">{t("tables")}</div>
          {!systemId ? (
            <EmptyState title={t("selectSystem")} className="min-h-72" />
          ) : isLoading ? (
            <LoadingSpinner className="min-h-72" />
          ) : isError ? (
            <EmptyState
              title={t("loadError")}
              action={
                <Button variant="outline" onClick={() => void refetch()}>
                  {t("refresh")}
                </Button>
              }
              className="min-h-72"
            />
          ) : !tables?.length ? (
            <EmptyState title={t("emptyTables")} className="min-h-72" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("schema")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableName")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableNameKor")}</th>
                    <th className="px-4 py-3 font-medium">{t("tableType")}</th>
                    <th className="px-4 py-3 font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((table) => (
                    <tr
                      key={`${table.schemaName ?? ""}.${table.tableName}`}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">{table.schemaName ?? "-"}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {table.tableName}
                      </td>
                      <td className="px-4 py-3">{table.tableNameKor ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{table.tableType ?? "-"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelect(table)}
                        >
                          <Database className="size-4" />
                          {t("select")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ColumnPanel
          columns={columns}
          loading={columnsLoading}
          table={activeTable}
          onRefresh={() => void refetchColumns()}
        />
      </div>
    </div>
  );
};

const ColumnPanel = ({
  table,
  columns,
  loading,
  onRefresh,
}: {
  table: ExternalTable | null;
  columns?: ExternalColumn[];
  loading: boolean;
  onRefresh: () => void;
}) => {
  const t = useTranslations("externalTables");

  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <h2 className="font-semibold">{t("columns")}</h2>
          <p className="text-xs text-muted-foreground">
            {table ? table.tableName : t("selectTable")}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!table} onClick={onRefresh}>
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {!table ? (
        <EmptyState title={t("selectTable")} className="min-h-72" />
      ) : loading ? (
        <LoadingSpinner className="min-h-72" />
      ) : !columns?.length ? (
        <EmptyState title={t("emptyColumns")} className="min-h-72" />
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          {columns.map((column) => (
            <div key={column.columnName} className="border-b p-3 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-xs">{column.columnName}</div>
                <Badge variant={column.isPrimaryKey ? "default" : "secondary"}>
                  {column.dataType}
                  {column.dataLength ? `(${column.dataLength})` : ""}
                </Badge>
              </div>
              <p className="mt-1 text-sm">{column.columnNameKor ?? "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {column.description ?? (column.isNullable ? "NULL" : "NOT NULL")}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
