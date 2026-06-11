"use client";

import { useTranslations } from "next-intl";

import { PanelTitleBar } from "@/components/common/layout/PanelTitleBar";
import { pamsContentPanelClass } from "@/components/common/layout/panel-styles";
import { useColumnResize } from "@/hooks/useColumnResize";
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
};

const alignClass: Record<DataGridAlign, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

const DEFAULT_COLUMN_WIDTH = 120;

/** 컬럼 리사이즈·그룹 헤더·합계 행을 지원하는 엔터프라이즈 데이터 그리드 */
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
}: DataGridProps<T>) => {
  const t = useTranslations("common");
  const { getWidth, resizingKey, handleResizePointerDown } = useColumnResize({
    columns: columns.map((column) => ({
      key: column.key,
      defaultWidth: column.width ?? DEFAULT_COLUMN_WIDTH,
      minWidth: column.minWidth,
      maxWidth: column.maxWidth,
    })),
    storageKey,
    enabled: resizable,
  });

  const tableMinWidth =
    minTableWidth ??
    columns.reduce(
      (total, column) =>
        total + getWidth(column.key, column.width ?? DEFAULT_COLUMN_WIDTH),
      0,
    );

  const showTitleBar = Boolean(title || count !== undefined || toolbar || icon);

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

      <div className="min-h-0 flex-1 overflow-auto">
        {body ?? (
          <table
            className={cn("pams-data-grid-table", tableClassName)}
            style={{ minWidth: tableMinWidth, tableLayout: "fixed", width: "100%" }}
          >
            <colgroup>
              {columns.map((column) => (
                <col
                  key={column.key}
                  style={{
                    width: getWidth(column.key, column.width ?? DEFAULT_COLUMN_WIDTH),
                  }}
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
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "pams-data-grid-header-cell",
                      alignClass[column.headerAlign ?? "center"],
                      column.sticky === "left" && "pams-data-grid-sticky-left",
                      column.headerClassName,
                    )}
                  >
                    <span className="pams-data-grid-header-label">{column.header}</span>
                    {resizable ? (
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t("columnResize")}
                        className={cn(
                          "pams-data-grid-resizer",
                          resizingKey === column.key && "pams-data-grid-resizer-active",
                        )}
                        onPointerDown={(event) =>
                          handleResizePointerDown(column.key, event)
                        }
                      />
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="pams-data-grid-body">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="pams-data-grid-empty">
                    {emptyMessage ?? t("noData")}
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => {
                  const key = rowKey(row, rowIndex);
                  const isSelected =
                    selectedRowKey !== undefined && selectedRowKey === key;

                  return (
                    <tr
                      key={key}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn(onRowClick && "cursor-pointer")}
                      onClick={() => onRowClick?.(row, rowIndex)}
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "pams-data-grid-cell",
                            alignClass[column.align ?? "left"],
                            column.sticky === "left" && "pams-data-grid-sticky-left",
                            column.className,
                          )}
                        >
                          {column.cell(row, rowIndex)}
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
                  {summaryCells(data).map((cell, index) => (
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
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}
      </div>
    </div>
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
