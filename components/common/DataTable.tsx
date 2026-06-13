"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DataGrid,
  type DataGridAlign,
  type DataGridColumn,
} from "@/components/common/DataGrid";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  width?: number;
  minWidth?: number;
  align?: DataGridAlign;
  sortable?: boolean;
  filter?: "text" | "select";
  value?: (row: T) => string | number | null;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (row: T) => void;
  selectedRowKey?: string | number;
  title?: string;
  count?: number;
  countSuffix?: string;
  icon?: boolean;
  storageKey?: string;
  fillHeight?: boolean;
};

const resolveAlign = (
  column: DataTableColumn<unknown>,
): DataGridAlign | undefined => {
  if (column.align) {
    return column.align;
  }

  if (column.className?.includes("text-right")) {
    return "right";
  }

  if (column.className?.includes("text-center")) {
    return "center";
  }

  return undefined;
};

/** DataGrid 기반 데이터 테이블 — 페이지네이션·행 선택 지원 */
export const DataTable = <T,>({
  columns,
  data,
  rowKey,
  page = 1,
  totalPages = 1,
  onPageChange,
  emptyMessage,
  className,
  onRowClick,
  selectedRowKey,
  title,
  count,
  countSuffix,
  icon,
  storageKey,
  fillHeight = false,
}: DataTableProps<T>) => {
  const t = useTranslations();

  const gridColumns: DataGridColumn<T>[] = columns.map((column) => ({
    key: column.key,
    header: column.header,
    cell: (row) => column.cell(row),
    className: column.className,
    width: column.width,
    minWidth: column.minWidth,
    align: resolveAlign(column as DataTableColumn<unknown>),
    sortable: column.sortable,
    filter: column.filter,
    value: column.value,
  }));

  const resolvedStorageKey =
    storageKey ?? `pams-datatable-${columns.map((column) => column.key).join("-")}`;

  return (
    <div className={cn("space-y-2", className)}>
      <DataGrid
        columns={gridColumns}
        data={data}
        rowKey={(row) => rowKey(row)}
        emptyMessage={emptyMessage ?? t("common.noData")}
        onRowClick={onRowClick}
        selectedRowKey={selectedRowKey}
        fillHeight={fillHeight}
        storageKey={resolvedStorageKey}
        title={title}
        count={count}
        countSuffix={countSuffix}
        icon={icon}
      />

      {onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
