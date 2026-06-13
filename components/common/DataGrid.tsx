"use client";

import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  type FilterFn,
  type Header,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { PanelTitleBar } from "@/components/common/layout/PanelTitleBar";
import { pamsContentPanelClass } from "@/components/common/layout/panel-styles";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DataGridAlign = "left" | "center" | "right";

export type DataGridColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T, rowIndex: number) => React.ReactNode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: DataGridAlign;
  /** 미지정 시 헤더는 가운데 정렬 */
  headerAlign?: DataGridAlign;
  className?: string;
  headerClassName?: string;
  sticky?: "left";
  /** 정렬 가능 여부 — `value`가 함께 지정돼야 동작 */
  sortable?: boolean;
  /** 컬럼 필터 종류 — `value`가 함께 지정돼야 동작 */
  filter?: "text" | "select";
  /** 정렬·필터 비교에 사용할 원시값 (cell은 표시 전용) */
  value?: (row: T) => string | number | null;
};

export type DataGridHeaderGroup = {
  key: string;
  label: React.ReactNode;
  colSpan: number;
  className?: string;
};

type DataGridProps<T> = {
  columns: DataGridColumn<T>[];
  data: T[];
  rowKey: (row: T, rowIndex: number) => string | number;
  headerGroups?: DataGridHeaderGroup[];
  summaryCells?: (data: T[]) => React.ReactNode[];
  storageKey?: string;
  className?: string;
  tableClassName?: string;
  emptyMessage?: string;
  minTableWidth?: number;
  onRowClick?: (row: T, rowIndex: number) => void;
  selectedRowKey?: string | number;
  resizable?: boolean;
  title?: string;
  count?: number;
  countSuffix?: string;
  toolbar?: React.ReactNode;
  icon?: React.ReactNode;
  body?: React.ReactNode;
  fillHeight?: boolean;
  /** 외부 패널·제목 바 없이 테이블만 렌더 — 복합 패널 내부 섹션용 */
  embedded?: boolean;
  /** 스크롤이 하단 근처에 도달하면 호출 — 무한 스크롤용 */
  onReachEnd?: () => void;
  /** 다음 페이지 로딩 중 하단 인디케이터 표시 */
  loadingMore?: boolean;
};

const alignClass: Record<DataGridAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const headerJustifyClass: Record<DataGridAlign, string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const DEFAULT_COLUMN_WIDTH = 120;

type StoredGridState = {
  sorting?: SortingState;
  columnSizing?: ColumnSizingState;
};

const readStoredState = (storageKey?: string): StoredGridState | null => {
  if (!storageKey || typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredGridState) : null;
  } catch {
    return null;
  }
};

/** 컬럼 정렬·필터·리사이즈·그룹 헤더·합계 행을 지원하는 엔터프라이즈 데이터 그리드 (TanStack Table 엔진) */
export const DataGrid = <T,>({
  columns,
  data,
  rowKey,
  headerGroups,
  summaryCells,
  storageKey,
  className,
  tableClassName,
  emptyMessage,
  minTableWidth,
  onRowClick,
  selectedRowKey,
  resizable = true,
  title,
  count,
  countSuffix,
  toolbar,
  icon,
  body,
  fillHeight = true,
  embedded = false,
  onReachEnd,
  loadingMore = false,
}: DataGridProps<T>) => {
  const t = useTranslations("common");

  const reachEndRef = useRef(onReachEnd);
  reachEndRef.current = onReachEnd;

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!reachEndRef.current) {
      return;
    }
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      reachEndRef.current();
    }
  };

  const stored = useMemo(() => readStoredState(storageKey), [storageKey]);
  const [sorting, setSorting] = useState<SortingState>(
    () => stored?.sorting ?? [],
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
    () => stored?.columnSizing ?? {},
  );

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ sorting, columnSizing }),
    );
  }, [storageKey, sorting, columnSizing]);

  // 다중선택 필터 — 선택값 배열에 포함되는 행만 통과 (제네릭 T에 맞춰 안정 식별자로 보관)
  const multiSelectFilter = useRef<FilterFn<T>>((row, columnId, filterValue) => {
    const selected = filterValue as unknown[];
    if (!Array.isArray(selected) || selected.length === 0) {
      return true;
    }
    return selected.includes(row.getValue(columnId));
  }).current;

  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        id: column.key,
        accessorFn: column.value ? (row) => column.value!(row) : () => null,
        enableSorting: Boolean(column.sortable && column.value),
        enableColumnFilter: Boolean(column.filter && column.value),
        filterFn:
          column.filter === "select" ? multiSelectFilter : "includesString",
        size: column.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: column.minWidth ?? 48,
        maxSize: column.maxWidth ?? 640,
      })),
    [columns, multiSelectFilter],
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { sorting, columnFilters, columnSizing },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    columnResizeMode: "onChange",
    enableColumnResizing: resizable,
    getRowId: (row, index) => String(rowKey(row, index)),
  });

  const rows = table.getRowModel().rows;
  const leafColumns = table.getVisibleLeafColumns();
  const headers = table.getHeaderGroups().at(-1)?.headers ?? [];
  const lastColumnIndex = columns.length - 1;

  const tableMinWidth = minTableWidth ?? table.getTotalSize();

  const showTitleBar =
    !embedded && Boolean(title || count !== undefined || toolbar || icon);

  const tableContent = (
      <div
        className={cn(
          embedded ? "overflow-auto" : "min-h-0 flex-1 overflow-auto",
          !embedded && fillHeight && "min-h-0 flex-1",
        )}
        onScroll={handleScroll}
      >
        {body ?? (
          <table
            className={cn("pams-data-grid-table", tableClassName)}
            style={{ minWidth: tableMinWidth, tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              {leafColumns.map((column, columnIndex) => (
                <col
                  key={column.id}
                  // 마지막 컬럼은 너비를 비워(auto) 남는 공간을 흡수하게 한다.
                  style={
                    columnIndex === lastColumnIndex
                      ? undefined
                      : { width: column.getSize() }
                  }
                />
              ))}
            </colgroup>

            <thead className="pams-data-grid-head">
              {headerGroups?.length ? (
                <tr className="pams-data-grid-group-row">
                  {headerGroups.map((group) => (
                    <th
                      key={group.key}
                      colSpan={group.colSpan}
                      className={cn("pams-data-grid-group-cell", group.className)}
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
              ) : null}
              <tr>
                {headers.map((header, columnIndex) => {
                  const column = columns[columnIndex];
                  if (!column) {
                    return null;
                  }
                  const headerAlign = column.headerAlign ?? "center";
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      data-sorted={sortDir || undefined}
                      className={cn(
                        "pams-data-grid-header-cell",
                        column.sticky === "left" && "pams-data-grid-sticky-left",
                        column.headerClassName,
                      )}
                    >
                      <div
                        className={cn(
                          "pams-data-grid-header-inner",
                          headerJustifyClass[headerAlign],
                        )}
                      >
                        {canSort ? (
                          <button
                            type="button"
                            className="pams-data-grid-sort-btn"
                            onClick={header.column.getToggleSortingHandler()}
                            title={
                              sortDir === "asc"
                                ? t("sortDescending")
                                : sortDir === "desc"
                                  ? t("clearSort")
                                  : t("sortAscending")
                            }
                          >
                            <span className="pams-data-grid-header-label">
                              {column.header}
                            </span>
                            {sortDir === "asc" ? (
                              <ArrowUp className="size-3 shrink-0" />
                            ) : sortDir === "desc" ? (
                              <ArrowDown className="size-3 shrink-0" />
                            ) : (
                              <ChevronsUpDown className="size-3 shrink-0 opacity-40" />
                            )}
                          </button>
                        ) : (
                          <span className="pams-data-grid-header-label">
                            {column.header}
                          </span>
                        )}

                        {header.column.getCanFilter() && column.filter ? (
                          <ColumnFilter
                            header={header}
                            type={column.filter}
                            label={t("filterColumn")}
                            placeholder={t("filterPlaceholder")}
                            clearLabel={t("filterClear")}
                            emptyLabel={t("filterNoOptions")}
                          />
                        ) : null}
                      </div>

                      {/* 마지막 컬럼은 리사이저가 테이블 우측 밖으로 넘쳐 가로 스크롤을 유발하므로 제외 */}
                      {resizable && columnIndex < lastColumnIndex ? (
                        <div
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={t("columnResize")}
                          className={cn(
                            "pams-data-grid-resizer",
                            header.column.getIsResizing() &&
                              "pams-data-grid-resizer-active",
                          )}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onClick={(event) => event.stopPropagation()}
                        />
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="pams-data-grid-body">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="pams-data-grid-empty">
                    {emptyMessage ?? t("noData")}
                  </td>
                </tr>
              ) : (
                rows.map((row, displayIndex) => {
                  const original = row.original;
                  const key = rowKey(original, displayIndex);
                  const isSelected =
                    selectedRowKey !== undefined && selectedRowKey === key;

                  return (
                    <tr
                      key={row.id}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn(onRowClick && "cursor-pointer")}
                      onClick={() => onRowClick?.(original, displayIndex)}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "pams-data-grid-cell",
                            alignClass[column.align ?? "left"],
                            column.sticky === "left" &&
                              "pams-data-grid-sticky-left",
                            column.className,
                          )}
                        >
                          {column.cell(original, displayIndex)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>

            {summaryCells ? (
              <tfoot className="pams-data-grid-foot">
                <tr>
                  {summaryCells(rows.map((row) => row.original)).map(
                    (cell, index) => (
                      <td
                        key={columns[index]?.key ?? index}
                        className={cn(
                          "pams-data-grid-summary-cell",
                          columns[index] &&
                            alignClass[columns[index].align ?? "left"],
                        )}
                      >
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}

        {loadingMore ? (
          <div className="py-2 text-center text-[11px] text-slate-400">
            {t("loading")}
          </div>
        ) : null}
      </div>
  );

  if (embedded) {
    return (
      <div className={cn("min-h-0 w-full min-w-0", className)}>{tableContent}</div>
    );
  }

  return (
    <div
      className={cn(
        pamsContentPanelClass,
        fillHeight && "min-h-0 flex-1",
        className,
      )}
    >
      {showTitleBar ? (
        <PanelTitleBar
          title={title}
          count={count}
          countSuffix={countSuffix}
          toolbar={toolbar}
          icon={Boolean(icon)}
        />
      ) : null}
      {tableContent}
    </div>
  );
};

/** 헤더 컬럼 필터 — 텍스트 입력 또는 distinct 다중선택 Popover */
const ColumnFilter = <T,>({
  header,
  type,
  label,
  placeholder,
  clearLabel,
  emptyLabel,
}: {
  header: Header<T, unknown>;
  type: "text" | "select";
  label: string;
  placeholder: string;
  clearLabel: string;
  emptyLabel: string;
}) => {
  const filterValue = header.column.getFilterValue();
  const isActive = Array.isArray(filterValue)
    ? filterValue.length > 0
    : filterValue != null && filterValue !== "";

  const options = useMemo(() => {
    if (type !== "select") {
      return [] as string[];
    }
    const facets = header.column.getFacetedUniqueValues();
    return Array.from(facets.keys())
      .filter((value) => value != null && value !== "")
      .map((value) => String(value))
      .sort((a, b) => a.localeCompare(b));
  }, [header.column, type]);

  const selected = (filterValue as unknown[] | undefined) ?? [];

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "pams-data-grid-filter-btn",
          isActive && "pams-data-grid-filter-btn-active",
        )}
        aria-label={label}
        onClick={(event) => event.stopPropagation()}
      >
        <ListFilter className="size-3" />
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-2"
        align="end"
        onClick={(event) => event.stopPropagation()}
      >
        {type === "text" ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              className="h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs outline-none focus:border-ring"
              placeholder={placeholder}
              value={(filterValue as string) ?? ""}
              onChange={(event) =>
                header.column.setFilterValue(event.target.value || undefined)
              }
            />
            {isActive ? (
              <button
                type="button"
                className="pams-data-grid-filter-btn"
                aria-label={clearLabel}
                onClick={() => header.column.setFilterValue(undefined)}
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        ) : options.length === 0 ? (
          <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <div className="flex max-h-60 flex-col gap-0.5 overflow-y-auto">
            {isActive ? (
              <button
                type="button"
                className="mb-1 self-end text-[11px] text-sky-600 hover:underline"
                onClick={() => header.column.setFilterValue(undefined)}
              >
                {clearLabel}
              </button>
            ) : null}
            {options.map((option) => {
              const checked = selected.includes(option);
              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs hover:bg-accent"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selected.filter((value) => value !== option)
                        : [...selected, option];
                      header.column.setFilterValue(
                        next.length > 0 ? next : undefined,
                      );
                    }}
                  />
                  <span className="truncate">{option}</span>
                </label>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/** 그리드 상태 배지 — 운영/중단 등 pill 스타일 */
export const DataGridStatusBadge = ({
  active,
  activeLabel,
  inactiveLabel,
  className,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium",
      active
        ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
      className,
    )}
  >
    {active ? activeLabel : inactiveLabel}
  </span>
);
