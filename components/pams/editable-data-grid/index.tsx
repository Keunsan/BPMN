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
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ChevronsUpDown,
  ListFilter,
  Plus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import { SearchBar } from "@/components/common/SearchBar";
import { PanelTitleBar } from "@/components/common/layout/PanelTitleBar";
import { pamsContentPanelClass } from "@/components/common/layout/panel-styles";
import { BatchActionBar } from "@/components/pams/batch-action-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  EditableColumn,
  EditableColumnOption,
  EditableDataGridProps,
} from "@/types/editable-data-grid";

import {
  buildCopyMatrix,
  buildPastePlan,
  copyCellsToTsv,
  getEffectiveRange,
  matrixToTsv,
  readClipboardTsv,
  tsvToMatrix,
  type PasteChange,
} from "./clipboard";
import { CellEditor } from "./cell-editor";
import { FillHandle } from "./fill-handle";
import {
  GridContextMenu,
  type ContextMenuAction,
} from "./grid-context-menu";
import {
  createInitialState,
  gridReducer,
  validateRowFields,
  type CellChange,
  type CellCoord,
  type GridAction,
  type GridState,
} from "./grid-reducer";
import {
  cellToCoord,
  getDataColumns,
  getNavigableColumns,
  getRowValue,
  isCellInRange,
  isEditableColumn,
  isMetaColumnKey,
  iterRangeCells,
  normalizeRange,
  PASTE_CONFIRM_THRESHOLD_DEFAULT,
  rangeFromCells,
  type CellRange,
} from "./grid-utils";
import {
  PasteConfirmDialog,
  PasteOverflowDialog,
} from "./paste-confirm-dialog";

const DEFAULT_COLUMN_WIDTH = 120;

type StoredGridState = {
  columnSizing?: ColumnSizingState;
};

const readStoredGridState = (storageKey?: string): StoredGridState | null => {
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

/** 긴 텍스트가 인접 셀로 넘치지 않도록 클리핑 */
const cellClipClass =
  "block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap";

/** 다건 인라인 편집 그리드 (TanStack Table + Phase 2 엑셀형 확장) */
export const EditableDataGrid = <T extends { id: string }>({
  columns,
  data,
  loading = false,
  density = "comfortable",
  onSave,
  onRowExpand,
  bulkActions,
  enableAddRow = false,
  createEmptyRow,
  toolbar,
  featureFlags,
  emptyMessage,
  fillHeight = true,
  className,
  onDirtyChange,
  addRowLabel,
  countLabel,
  pasteConfirmThreshold = PASTE_CONFIRM_THRESHOLD_DEFAULT,
  storageKey,
}: EditableDataGridProps<T>) => {
  const t = useTranslations("editableGrid");
  const tc = useTranslations("common");

  const storedGridState = useMemo(
    () => readStoredGridState(storageKey),
    [storageKey],
  );

  const flags = {
    clipboard: featureFlags?.clipboard ?? false,
    fillDown: featureFlags?.fillDown ?? false,
    rangeSelect: featureFlags?.rangeSelect ?? false,
    undoRedo: featureFlags?.undoRedo ?? false,
  };

  const [state, dispatch] = useReducer(
    (prev: GridState<T>, action: GridAction<T>) =>
      gridReducer(prev, action, columns),
    data,
    createInitialState,
  );

  const [globalSearch, setGlobalSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
    () => storedGridState?.columnSizing ?? {},
  );
  const [optionsCache, setOptionsCache] = useState<
    Record<string, EditableColumnOption[]>
  >({});
  const [pasteConfirm, setPasteConfirm] = useState<{
    changes: PasteChange[];
    cellCount: number;
    fieldErrors: Array<{ rowId: string; field: string }>;
  } | null>(null);
  const [pasteOverflowOpen, setPasteOverflowOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    cell: CellCoord;
  } | null>(null);
  const dragSelecting = useRef(false);
  const fillDragging = useRef(false);
  const fillOrigin = useRef<CellRange | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const dirtyCount = state.dirtyMap.size;
  const dataColumns = useMemo(() => getDataColumns(columns), [columns]);
  const navigableColumns = useMemo(() => getNavigableColumns(columns), [columns]);

  useEffect(() => {
    onDirtyChange?.(dirtyCount > 0);
  }, [dirtyCount, onDirtyChange]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ columnSizing }),
    );
  }, [storageKey, columnSizing]);

  useEffect(() => {
    dispatch({ type: "RESET", data });
  }, [data]);

  useEffect(() => {
    if (state.flashIds.size === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "CLEAR_FLASH" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [state.flashIds]);

  useEffect(() => {
    for (const column of columns) {
      if (typeof column.options === "function") {
        void column.options().then((opts) => {
          setOptionsCache((prev) => ({ ...prev, [column.key]: opts }));
        });
      } else if (column.options) {
        setOptionsCache((prev) => ({
          ...prev,
          [column.key]: column.options as EditableColumnOption[],
        }));
      }
    }
  }, [columns]);

  const getOptions = useCallback(
    (column: EditableColumn<T>) =>
      optionsCache[column.key] ??
      (Array.isArray(column.options) ? column.options : []),
    [optionsCache],
  );

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
        accessorFn: (row) => {
          if (column.accessor) {
            return column.accessor(row);
          }
          const value = getRowValue(row, column.key as string);
          return value == null ? "" : String(value);
        },
        enableSorting: Boolean(column.sortable),
        enableColumnFilter: Boolean(column.filter),
        filterFn:
          column.filter === "select" ? multiSelectFilter : "includesString",
        size: column.width ?? DEFAULT_COLUMN_WIDTH,
        minSize: column.minWidth ?? 48,
        maxSize: column.maxWidth ?? 640,
      })),
    [columns, multiSelectFilter],
  );

  const filteredBySearch = useMemo(() => {
    if (!toolbar?.globalSearch || !globalSearch.trim()) {
      return state.draft;
    }
    const q = globalSearch.toLowerCase();
    return state.draft.filter((row) =>
      columns.some((col) => {
        const raw = col.accessor
          ? col.accessor(row)
          : getRowValue(row, col.key as string);
        return String(raw ?? "").toLowerCase().includes(q);
      }),
    );
  }, [state.draft, globalSearch, columns, toolbar?.globalSearch]);

  const table = useReactTable({
    data: filteredBySearch,
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
    enableColumnResizing: true,
    getRowId: (row) => row.id,
  });

  const tableRows = table.getRowModel().rows;
  const leafColumns = table.getVisibleLeafColumns();
  const headers = table.getHeaderGroups()[0]?.headers ?? [];
  const lastColumnIndex = columns.length - 1;
  const tableMinWidth = table.getTotalSize();
  const rowIds = useMemo(
    () => tableRows.map((row) => row.original.id),
    [tableRows],
  );

  const applyPatch = useCallback(
    (
      changes: CellChange[],
      recordHistory = true,
      pasteFieldErrors: Array<{ rowId: string; field: string }> = [],
    ) => {
      if (changes.length === 0 && pasteFieldErrors.length === 0) {
        return;
      }
      if (changes.length > 0) {
        dispatch({ type: "PATCH_CELLS", changes, recordHistory });
      }
      const draftAfter =
        changes.length > 0
          ? changes.reduce(
              (draft, change) =>
                draft.map((row) =>
                  row.id === change.rowId
                    ? { ...row, [change.field]: change.value }
                    : row,
                ),
              state.draft,
            )
          : state.draft;
      const errors = new Map<string, Record<string, string>>();
      for (const rowId of new Set(changes.map((c) => c.rowId))) {
        const row = draftAfter.find((r) => r.id === rowId);
        if (!row) {
          continue;
        }
        const rowErrors = validateRowFields(row, columns, t("requiredField"));
        if (Object.keys(rowErrors).length > 0) {
          errors.set(rowId, rowErrors);
        }
      }
      for (const item of pasteFieldErrors) {
        const row = errors.get(item.rowId) ?? {};
        row[item.field] = t("pasteTypeError");
        errors.set(item.rowId, row);
      }
      if (errors.size > 0) {
        dispatch({ type: "SET_ERRORS", errors });
      }
    },
    [columns, state.draft, t],
  );

  const moveActiveCell = useCallback(
    (direction: "up" | "down" | "left" | "right", extend = false) => {
      if (!state.activeCell || tableRows.length === 0) {
        return;
      }
      const rowIndex = rowIds.indexOf(state.activeCell.rowId);
      const colIndex = navigableColumns.findIndex(
        (c) => c.key === state.activeCell?.field,
      );
      if (rowIndex < 0 || colIndex < 0) {
        return;
      }
      let nextRow = rowIndex;
      let nextCol = colIndex;
      if (direction === "up") {
        nextRow = Math.max(0, rowIndex - 1);
      }
      if (direction === "down") {
        nextRow = Math.min(tableRows.length - 1, rowIndex + 1);
      }
      if (direction === "left") {
        nextCol = Math.max(0, colIndex - 1);
      }
      if (direction === "right") {
        nextCol = Math.min(navigableColumns.length - 1, colIndex + 1);
      }
      const targetRow = tableRows[nextRow]?.original;
      const targetCol = navigableColumns[nextCol];
      if (!targetRow || !targetCol) {
        return;
      }
      const cell: CellCoord = {
        rowId: targetRow.id,
        field: targetCol.key as string,
      };
      if (extend && flags.rangeSelect) {
        dispatch({
          type: "SET_ACTIVE",
          cell,
          extendRange: true,
        });
      } else {
        dispatch({ type: "SET_ACTIVE", cell });
      }
    },
    [flags.rangeSelect, navigableColumns, rowIds, state.activeCell, tableRows],
  );

  const handleCopy = useCallback(async () => {
    if (!flags.clipboard) {
      return;
    }
    const range = getEffectiveRange(state.selectionRange, state.activeCell);
    if (!range) {
      return;
    }
    const start = cellToCoord(range.start, rowIds, dataColumns);
    const end = cellToCoord(range.end, rowIds, dataColumns);
    if (!start || !end) {
      return;
    }
    const norm = normalizeRange(start, end);
    const matrix = buildCopyMatrix(
      range,
      norm,
      rowIds,
      dataColumns,
      state.draft,
    );
    await copyCellsToTsv(matrixToTsv(matrix));
  }, [
    dataColumns,
    flags.clipboard,
    rowIds,
    state.activeCell,
    state.draft,
    state.selectionRange,
  ]);

  const executePaste = useCallback(
    (
      changes: PasteChange[],
      fieldErrors: Array<{ rowId: string; field: string }> = [],
    ) => {
      applyPatch(changes, true, fieldErrors);
    },
    [applyPatch],
  );

  const handlePaste = useCallback(async () => {
    if (!flags.clipboard || !state.activeCell) {
      return;
    }
    try {
      const tsv = await readClipboardTsv();
      if (!tsv.trim()) {
        return;
      }
      const matrix = tsvToMatrix(tsv);
      const plan = buildPastePlan(
        matrix,
        state.activeCell,
        rowIds,
        dataColumns,
        state.draft,
        getOptions,
      );
      if (!plan.ok) {
        if (plan.reason === "overflow") {
          setPasteOverflowOpen(true);
        }
        return;
      }
      if (plan.cellCount >= pasteConfirmThreshold) {
        setPasteConfirm({
          changes: plan.changes,
          cellCount: plan.cellCount,
          fieldErrors: plan.fieldErrors,
        });
        return;
      }
      executePaste(plan.changes, plan.fieldErrors);
    } catch {
      // 클립보드 접근 거부 등 — 무시
    }
  }, [
    dataColumns,
    executePaste,
    flags.clipboard,
    getOptions,
    pasteConfirmThreshold,
    rowIds,
    state.activeCell,
    state.draft,
  ]);

  const handleFillDown = useCallback(() => {
    if (!flags.fillDown) {
      return;
    }
    const range = getEffectiveRange(state.selectionRange, state.activeCell);
    if (!range) {
      return;
    }
    const start = cellToCoord(range.start, rowIds, dataColumns);
    const end = cellToCoord(range.end, rowIds, dataColumns);
    if (!start || !end) {
      return;
    }
    const norm = normalizeRange(start, end);
    const changes: CellChange[] = [];

    for (let c = norm.colStart; c <= norm.colEnd; c += 1) {
      const column = dataColumns[c];
      if (!column || !isEditableColumn(column)) {
        continue;
      }
      const topRowId = rowIds[norm.rowStart];
      const topRow = state.draft.find((r) => r.id === topRowId);
      if (!topRow) {
        continue;
      }
      const value = getRowValue(topRow, column.key as string);
      for (let r = norm.rowStart + 1; r <= norm.rowEnd; r += 1) {
        const rowId = rowIds[r];
        if (!rowId) {
          continue;
        }
        changes.push({ rowId, field: column.key as string, value });
      }
    }

    applyPatch(changes, true);
  }, [
    applyPatch,
    dataColumns,
    flags.fillDown,
    rowIds,
    state.activeCell,
    state.draft,
    state.selectionRange,
  ]);

  const handleClearRange = useCallback(() => {
    const range = getEffectiveRange(state.selectionRange, state.activeCell);
    if (!range) {
      return;
    }
    const changes: CellChange[] = [];
    for (const cell of iterRangeCells(range, rowIds, dataColumns)) {
      const column = columns.find((col) => col.key === cell.field);
      if (!column || !isEditableColumn(column)) {
        continue;
      }
      const empty =
        column.editor === "checkbox"
          ? false
          : column.editor === "number"
            ? null
            : "";
      changes.push({ rowId: cell.rowId, field: cell.field, value: empty });
    }
    applyPatch(changes, true);
  }, [
    applyPatch,
    columns,
    dataColumns,
    rowIds,
    state.activeCell,
    state.selectionRange,
  ]);

  const handleSave = async () => {
    const clientErrors = new Map<string, Record<string, string>>();
    const updates: Array<{ id: string; changedFields: Partial<T> }> = [];
    const creates: Array<Partial<T> & { tempId: string }> = [];

    for (const [rowId, fields] of state.dirtyMap) {
      const row = state.draft.find((r) => r.id === rowId);
      if (!row) {
        continue;
      }
      const rowErrors = validateRowFields(row, columns, t("requiredField"));
      if (Object.keys(rowErrors).length > 0) {
        clientErrors.set(rowId, rowErrors);
        continue;
      }
      const changedFields: Partial<T> = {};
      for (const field of fields) {
        changedFields[field as keyof T] = row[field as keyof T];
      }
      if (state.newRowIds.has(rowId)) {
        creates.push({ ...row, tempId: rowId });
      } else {
        updates.push({ id: rowId, changedFields });
      }
    }

    if (clientErrors.size > 0) {
      dispatch({ type: "SET_ERRORS", errors: clientErrors });
      return;
    }

    if (updates.length === 0 && creates.length === 0) {
      return;
    }

    setSaving(true);
    try {
      const result = await onSave({ updates, creates });
      const failedIds = new Set(
        result.results
          .filter((r) => r.status === "error")
          .map((r) => r.id ?? r.tempId)
          .filter(Boolean) as string[],
      );
      const nextData = state.draft.filter((row) => {
        if (state.newRowIds.has(row.id)) {
          return !result.results.some(
            (r) => r.tempId === row.id && r.status === "ok",
          );
        }
        return true;
      });
      const refreshed = nextData.map((row) => {
        const ok = result.results.find(
          (r) => r.status === "ok" && (r.id === row.id || r.tempId === row.id),
        );
        if (ok && !failedIds.has(row.id)) {
          return row;
        }
        return row;
      });
      dispatch({ type: "APPLY_SAVE", result, data: refreshed });
    } finally {
      setSaving(false);
    }
  };

  const handleGridKeyDown = (event: React.KeyboardEvent) => {
    if (state.editingCell) {
      return;
    }

    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === "c" && flags.clipboard) {
      event.preventDefault();
      void handleCopy();
      return;
    }
    if (mod && event.key.toLowerCase() === "v" && flags.clipboard) {
      event.preventDefault();
      void handlePaste();
      return;
    }
    if (mod && event.key.toLowerCase() === "d" && flags.fillDown) {
      event.preventDefault();
      handleFillDown();
      return;
    }
    if (mod && event.key.toLowerCase() === "z" && flags.undoRedo) {
      event.preventDefault();
      if (event.shiftKey) {
        dispatch({ type: "REDO" });
      } else {
        dispatch({ type: "UNDO" });
      }
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      handleClearRange();
      return;
    }

    const extend = event.shiftKey && flags.rangeSelect;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveCell("up", extend);
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveCell("down", extend);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveActiveCell("left", extend);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveActiveCell("right", extend);
    }
    if (event.key === "Enter" && state.activeCell) {
      event.preventDefault();
      dispatch({ type: "SET_EDITING", cell: state.activeCell });
    }
    if (event.key === " " && state.activeCell) {
      event.preventDefault();
      dispatch({ type: "TOGGLE_ROW", rowId: state.activeCell.rowId });
    }
  };

  const activateCell = (
    rowId: string,
    field: string,
    opts?: { extend?: boolean; shiftKey?: boolean },
  ) => {
    const cell: CellCoord = { rowId, field };
    if (opts?.extend && flags.rangeSelect && state.rangeAnchor) {
      const range = rangeFromCells(
        state.rangeAnchor,
        cell,
        rowIds,
        dataColumns,
      );
      dispatch({
        type: "SET_ACTIVE",
        cell,
        extendRange: true,
      });
      if (range) {
        dispatch({ type: "SET_RANGE", range, anchor: state.rangeAnchor });
      }
      return;
    }
    if (opts?.shiftKey && flags.rangeSelect && state.rangeAnchor) {
      const range = rangeFromCells(
        state.rangeAnchor,
        cell,
        rowIds,
        dataColumns,
      );
      dispatch({ type: "SET_ACTIVE", cell });
      if (range) {
        dispatch({ type: "SET_RANGE", range, anchor: state.rangeAnchor });
      }
      return;
    }
    dispatch({ type: "SET_ACTIVE", cell });
  };

  const handleCellMouseDown = (
    rowId: string,
    field: string,
    event: React.MouseEvent,
  ) => {
    if (!flags.rangeSelect || event.button !== 0) {
      return;
    }
  };

  const handleCellMouseEnter = (
    rowId: string,
    field: string,
    event: React.MouseEvent,
  ) => {
    if (fillDragging.current && fillOrigin.current) {
      const range = rangeFromCells(
        fillOrigin.current.start,
        { rowId, field },
        rowIds,
        dataColumns,
      );
      if (range) {
        dispatch({ type: "SET_RANGE", range, anchor: fillOrigin.current.start });
      }
      return;
    }
    if (!flags.rangeSelect || !dragSelecting.current) {
      return;
    }
    if (event.buttons !== 1) {
      return;
    }
    const anchor = state.rangeAnchor ?? state.activeCell;
    if (!anchor) {
      return;
    }
    const range = rangeFromCells(anchor, { rowId, field }, rowIds, dataColumns);
    if (range) {
      dispatch({ type: "SET_RANGE", range, anchor });
    }
  };

  const handleFillDownRef = useRef(handleFillDown);
  handleFillDownRef.current = handleFillDown;

  useEffect(() => {
    const stopDrag = () => {
      if (fillDragging.current) {
        handleFillDownRef.current();
      }
      dragSelecting.current = false;
      fillDragging.current = false;
      fillOrigin.current = null;
    };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  const contextActions = useMemo((): ContextMenuAction[] => {
    const actions: ContextMenuAction[] = [];
    if (flags.clipboard) {
      actions.push({
        id: "copy",
        label: t("contextCopy"),
        onSelect: () => void handleCopy(),
      });
      actions.push({
        id: "paste",
        label: t("contextPaste"),
        disabled: !state.activeCell,
        onSelect: () => void handlePaste(),
      });
    }
    if (flags.fillDown) {
      actions.push({
        id: "fill",
        label: t("contextFillDown"),
        onSelect: handleFillDown,
      });
    }
    if (flags.rangeSelect) {
      actions.push({
        id: "clear",
        label: t("contextClear"),
        onSelect: handleClearRange,
      });
    }
    return actions;
  }, [
    flags.clipboard,
    flags.fillDown,
    flags.rangeSelect,
    handleClearRange,
    handleCopy,
    handleFillDown,
    handlePaste,
    state.activeCell,
    t,
  ]);

  const renderCellDisplay = (column: EditableColumn<T>, row: T) => {
    const value = getRowValue(row, column.key as string);
    if (column.action === "expand") {
      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={(e) => {
            e.stopPropagation();
            onRowExpand?.(row);
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
      );
    }
    if (column.key === "_select") {
      const checked = state.selection.has(row.id);
      return (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={t("selectRow")}
          className="flex size-4 items-center justify-center rounded border border-input bg-background"
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "TOGGLE_ROW", rowId: row.id });
          }}
        >
          {checked ? <Check className="size-3 text-primary" /> : null}
        </button>
      );
    }
    if (column.editor === "select" || column.editor === "combobox") {
      const opts = getOptions(column);
      const label = opts.find((o) => o.value === String(value ?? ""))?.label;
      return (
        <span className={cellClipClass}>
          {label ?? (value ? String(value) : "—")}
        </span>
      );
    }
    if (column.editor === "checkbox") {
      return value ? <Check className="size-3.5 text-primary" /> : null;
    }
    if (value == null || value === "") {
      return <span className="text-muted-foreground">—</span>;
    }
    if (column.editor === "date" || column.key.toLowerCase().includes("at")) {
      try {
        return (
          <span className={cellClipClass}>
            {new Intl.DateTimeFormat(undefined, {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(String(value)))}
          </span>
        );
      } catch {
        return <span className={cellClipClass}>{String(value)}</span>;
      }
    }
    return <span className={cellClipClass}>{String(value)}</span>;
  };

  const rowPadding = density === "compact" ? "py-0.5" : "py-1";
  const effectiveRange = getEffectiveRange(state.selectionRange, state.activeCell);
  const rangeEndCell = effectiveRange?.end ?? null;
  const showFillHandle =
    flags.fillDown &&
    flags.rangeSelect &&
    Boolean(rangeEndCell) &&
    !state.editingCell;

  return (
    <div
      className={cn(
        pamsContentPanelClass,
        fillHeight && "flex min-h-0 flex-1 flex-col",
        className,
      )}
    >
      <PanelTitleBar
        title={countLabel ?? t("gridTitle")}
        count={state.draft.length}
        countSuffix={tc("countUnit")}
        toolbar={
          <div className="flex items-center gap-2">
            {toolbar?.globalSearch ? (
              <SearchBar
                variant="filter"
                className="w-[200px]"
                value={globalSearch}
                onChange={setGlobalSearch}
                placeholder={t("globalSearch")}
              />
            ) : null}
            {bulkActions && state.selection.size > 0
              ? bulkActions.map((action) => (
                  <Button
                    key={action.label}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const ids = [...state.selection];
                      if (action.field !== undefined) {
                        dispatch({
                          type: "BULK_UPDATE",
                          ids,
                          field: action.field,
                          value: action.value,
                        });
                        return;
                      }
                      action.apply?.(ids);
                    }}
                  >
                    {action.label}
                  </Button>
                ))
              : null}
          </div>
        }
      />

      <div
        ref={gridRef}
        className={cn("min-h-0 flex-1 overflow-auto", fillHeight && "flex-1")}
        onKeyDown={handleGridKeyDown}
        tabIndex={0}
        role="grid"
        aria-rowcount={tableRows.length}
        aria-colcount={columns.length}
        aria-multiselectable={flags.rangeSelect || undefined}
      >
        <table
          className="pams-data-grid-table"
          style={{
            minWidth: tableMinWidth,
            tableLayout: "fixed",
            width: "100%",
          }}
        >
          <colgroup>
            {leafColumns.map((column, columnIndex) => (
              <col
                key={column.id}
                style={
                  columnIndex === lastColumnIndex
                    ? undefined
                    : { width: column.getSize() }
                }
              />
            ))}
          </colgroup>
          <thead className="pams-data-grid-head">
            <tr>
              {headers.map((header, columnIndex) => {
                const column = columns[columnIndex];
                if (!column) {
                  return null;
                }
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    data-sorted={sortDir || undefined}
                    className={cn(
                      "pams-data-grid-header-cell",
                      column.freeze === "left" && "pams-data-grid-sticky-left",
                    )}
                  >
                    <div className="pams-data-grid-header-inner flex items-center justify-center gap-1">
                      {column.key === "_select" ? (
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={
                            tableRows.length > 0 &&
                            tableRows.every((r) =>
                              state.selection.has(r.original.id),
                            )
                          }
                          className="flex size-4 items-center justify-center rounded border border-input"
                          onClick={() => {
                            const allIds = tableRows.map((r) => r.original.id);
                            const allSelected = allIds.every((id) =>
                              state.selection.has(id),
                            );
                            dispatch({
                              type: "SET_SELECTION",
                              ids: allSelected ? [] : allIds,
                            });
                          }}
                        >
                          {tableRows.length > 0 &&
                          tableRows.every((r) =>
                            state.selection.has(r.original.id),
                          ) ? (
                            <Check className="size-3 text-primary" />
                          ) : null}
                        </button>
                      ) : (
                        <>
                          <span className="pams-data-grid-header-label">
                            {column.header}
                          </span>
                          {column.sortable ? (
                            <button
                              type="button"
                              className="pams-data-grid-sort-btn"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {sortDir === "asc" ? (
                                <ArrowUp className="size-3" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown className="size-3" />
                              ) : (
                                <ChevronsUpDown className="size-3 opacity-50" />
                              )}
                            </button>
                          ) : null}
                          {toolbar?.columnFilter && column.filter ? (
                            <ColumnFilterPopover column={header.column} />
                          ) : null}
                        </>
                      )}
                    </div>

                    {columnIndex < lastColumnIndex ? (
                      <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={tc("columnResize")}
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
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="pams-data-grid-empty">
                  {t("loading")}
                </td>
              </tr>
            ) : tableRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="pams-data-grid-empty">
                  {emptyMessage ?? t("empty")}
                </td>
              </tr>
            ) : (
              tableRows.map((tableRow, rowIndex) => {
                const row = tableRow.original;
                const isDirty = state.dirtyMap.has(row.id);
                const isNew = state.newRowIds.has(row.id);
                const isFlash = state.flashIds.has(row.id);
                const rowErrors = state.errorMap.get(row.id);
                const hasError = Boolean(
                  rowErrors && Object.keys(rowErrors).length > 0,
                );

                return (
                  <tr
                    key={row.id}
                    role="row"
                    aria-rowindex={rowIndex + 1}
                    aria-selected={state.selection.has(row.id)}
                    data-state={
                      state.selection.has(row.id) ? "selected" : undefined
                    }
                    className={cn(
                      isDirty && "border-l-2 border-l-primary",
                      hasError && "border-l-2 border-l-destructive",
                      isNew && "border-l border-l-dashed border-l-primary",
                      isFlash && "bg-primary/10 transition-colors duration-150",
                    )}
                  >
                    {columns.map((column, colIndex) => {
                      const field = column.key as string;
                      const cellCoord: CellCoord = { rowId: row.id, field };
                      const inRange =
                        flags.rangeSelect &&
                        isCellInRange(
                          cellCoord,
                          state.selectionRange,
                          rowIds,
                          dataColumns,
                        );
                      const isActive =
                        state.activeCell?.rowId === row.id &&
                        state.activeCell.field === field;
                      const isEditing =
                        state.editingCell?.rowId === row.id &&
                        state.editingCell.field === field;
                      const isCellDirty = state.dirtyMap
                        .get(row.id)
                        ?.has(field);
                      const cellError = rowErrors?.[field];
                      const isRangeEnd =
                        rangeEndCell?.rowId === row.id &&
                        rangeEndCell.field === field;

                      return (
                        <td
                          key={column.key}
                          role="gridcell"
                          aria-colindex={colIndex + 1}
                          aria-selected={inRange || isActive || undefined}
                          className={cn(
                            "pams-data-grid-cell relative overflow-hidden",
                            rowPadding,
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right tabular-nums",
                            column.mono && "font-mono",
                            column.freeze === "left" &&
                              "pams-data-grid-sticky-left",
                            inRange && "bg-primary/10",
                            isActive && "ring-2 ring-ring ring-inset",
                          )}
                          onMouseDown={(event) => {
                            if (
                              column.editor &&
                              column.action !== "expand" &&
                              !isMetaColumnKey(field)
                            ) {
                              dragSelecting.current = true;
                              activateCell(row.id, field, {
                                shiftKey: event.shiftKey,
                              });
                            }
                            handleCellMouseDown(row.id, field, event);
                          }}
                          onMouseEnter={(event) =>
                            handleCellMouseEnter(row.id, field, event)
                          }
                          onClick={() => {
                            if (
                              column.editor &&
                              column.action !== "expand" &&
                              !isMetaColumnKey(field)
                            ) {
                              activateCell(row.id, field);
                            }
                          }}
                          onDoubleClick={() => {
                            if (column.editor && column.action !== "expand") {
                              dispatch({
                                type: "SET_EDITING",
                                cell: cellCoord,
                              });
                            }
                          }}
                          onContextMenu={(event) => {
                            if (
                              !flags.clipboard &&
                              !flags.fillDown &&
                              !flags.rangeSelect
                            ) {
                              return;
                            }
                            event.preventDefault();
                            activateCell(row.id, field);
                            setContextMenu({
                              x: event.clientX,
                              y: event.clientY,
                              cell: cellCoord,
                            });
                          }}
                        >
                          {isNew && colIndex === 0 ? (
                            <Badge variant="secondary" className="mb-0.5">
                              {t("newRowBadge")}
                            </Badge>
                          ) : null}
                          {isCellDirty ? (
                            <span
                              className="pointer-events-none absolute top-0 right-0 size-0 border-t-8 border-l-8 border-t-primary border-l-transparent"
                              aria-hidden
                            />
                          ) : null}
                          {isEditing && column.editor ? (
                            <CellEditor
                              column={column}
                              value={getRowValue(row, field)}
                              options={getOptions(column)}
                              onCommit={(value) => {
                                dispatch({
                                  type: "UPDATE_CELL",
                                  rowId: row.id,
                                  field,
                                  value,
                                });
                                dispatch({ type: "SET_EDITING", cell: null });
                              }}
                              onCancel={() =>
                                dispatch({ type: "SET_EDITING", cell: null })
                              }
                            />
                          ) : (
                            <div
                              className={cn(
                                column.action === "expand" ||
                                  column.key === "_select"
                                  ? "flex justify-center"
                                  : "min-w-0 overflow-hidden",
                              )}
                            >
                              {renderCellDisplay(column, row)}
                            </div>
                          )}
                          {cellError ? (
                            <p className="mt-0.5 text-xs text-destructive">
                              {cellError}
                            </p>
                          ) : null}
                          {isRangeEnd && showFillHandle ? (
                            <FillHandle
                              visible
                              onMouseDown={() => {
                                fillDragging.current = true;
                                fillOrigin.current = effectiveRange;
                              }}
                            />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {enableAddRow && createEmptyRow ? (
          <div className="border-t px-2 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-sm"
              onClick={() =>
                dispatch({ type: "ADD_ROW", row: createEmptyRow() })
              }
            >
              <Plus className="size-3.5" />
              {addRowLabel ?? t("addRow")}
            </Button>
          </div>
        ) : null}
      </div>

      <BatchActionBar
        dirtyCount={dirtyCount}
        saving={saving}
        onSave={() => void handleSave()}
        onRevert={() => dispatch({ type: "REVERT_ALL" })}
      />

      <PasteConfirmDialog
        open={pasteConfirm !== null}
        cellCount={pasteConfirm?.cellCount ?? 0}
        onConfirm={() => {
          if (pasteConfirm) {
            executePaste(pasteConfirm.changes, pasteConfirm.fieldErrors);
          }
          setPasteConfirm(null);
        }}
        onCancel={() => setPasteConfirm(null)}
      />

      <PasteOverflowDialog
        open={pasteOverflowOpen}
        onClose={() => setPasteOverflowOpen(false)}
      />

      <GridContextMenu
        open={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        actions={contextActions}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
};

type ColumnFilterPopoverProps = {
  column: {
    getFilterValue: () => unknown;
    setFilterValue: (value: unknown) => void;
  };
};

const ColumnFilterPopover = ({ column }: ColumnFilterPopoverProps) => {
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const filterValue = (column.getFilterValue() as string) ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="pams-data-grid-filter-btn">
        <ListFilter className="size-3" />
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="flex items-center gap-1">
          <Input
            value={filterValue}
            onChange={(e) => column.setFilterValue(e.target.value)}
            placeholder={tc("filterPlaceholder")}
            className="h-8 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-8 shrink-0 px-0"
            onClick={() => column.setFilterValue("")}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
