import type {
  EditableColumn,
  SaveResult,
} from "@/types/editable-data-grid";

import {
  buildDirtyMap,
  cloneDraft,
  getRowValue,
  isMetaColumnKey,
  type CellCoord,
  type CellRange,
} from "./grid-utils";

export type { CellCoord, CellRange };

export type GridState<T extends { id: string }> = {
  snapshot: T[];
  draft: T[];
  dirtyMap: Map<string, Set<string>>;
  errorMap: Map<string, Record<string, string>>;
  selection: Set<string>;
  activeCell: CellCoord | null;
  editingCell: CellCoord | null;
  selectionRange: CellRange | null;
  rangeAnchor: CellCoord | null;
  flashIds: Set<string>;
  newRowIds: Set<string>;
  historyPast: T[][];
  historyFuture: T[][];
};

export type CellChange = { rowId: string; field: string; value: unknown };

export type GridAction<T extends { id: string }> =
  | { type: "RESET"; data: T[] }
  | { type: "UPDATE_CELL"; rowId: string; field: string; value: unknown }
  | { type: "PATCH_CELLS"; changes: CellChange[]; recordHistory?: boolean }
  | { type: "REVERT_ALL" }
  | { type: "SET_ACTIVE"; cell: CellCoord | null; extendRange?: boolean }
  | { type: "SET_EDITING"; cell: CellCoord | null }
  | { type: "SET_RANGE"; range: CellRange | null; anchor?: CellCoord | null }
  | { type: "TOGGLE_ROW"; rowId: string }
  | { type: "SET_SELECTION"; ids: string[] }
  | { type: "ADD_ROW"; row: T }
  | { type: "APPLY_SAVE"; result: SaveResult; data: T[] }
  | { type: "SET_ERRORS"; errors: Map<string, Record<string, string>> }
  | { type: "CLEAR_FLASH" }
  | { type: "BULK_UPDATE"; ids: string[]; field: string; value: unknown }
  | { type: "UNDO" }
  | { type: "REDO" };

const MAX_HISTORY = 50;

const applyChanges = <T extends { id: string }>(
  draft: T[],
  changes: CellChange[],
): T[] => {
  if (changes.length === 0) {
    return draft;
  }
  const byRow = new Map<string, Record<string, unknown>>();
  for (const change of changes) {
    const patch = byRow.get(change.rowId) ?? {};
    patch[change.field] = change.value;
    byRow.set(change.rowId, patch);
  }
  return draft.map((row) => {
    const patch = byRow.get(row.id);
    return patch ? { ...row, ...patch } : row;
  });
};

const clearFieldErrors = (
  errorMap: Map<string, Record<string, string>>,
  changes: CellChange[],
): Map<string, Record<string, string>> => {
  const next = new Map(errorMap);
  for (const change of changes) {
    const rowErrors = { ...(next.get(change.rowId) ?? {}) };
    delete rowErrors[change.field];
    if (Object.keys(rowErrors).length === 0) {
      next.delete(change.rowId);
    } else {
      next.set(change.rowId, rowErrors);
    }
  }
  return next;
};

const withHistory = <T extends { id: string }>(
  state: GridState<T>,
  recordHistory: boolean,
): Pick<GridState<T>, "historyPast" | "historyFuture"> => {
  if (!recordHistory) {
    return { historyPast: state.historyPast, historyFuture: state.historyFuture };
  }
  const past = [...state.historyPast, cloneDraft(state.draft)].slice(-MAX_HISTORY);
  return { historyPast: past, historyFuture: [] };
};

export const createInitialState = <T extends { id: string }>(
  data: T[],
): GridState<T> => ({
  snapshot: data,
  draft: data,
  dirtyMap: new Map(),
  errorMap: new Map(),
  selection: new Set(),
  activeCell: null,
  editingCell: null,
  selectionRange: null,
  rangeAnchor: null,
  flashIds: new Set(),
  newRowIds: new Set(),
  historyPast: [],
  historyFuture: [],
});

export const gridReducer = <T extends { id: string }>(
  state: GridState<T>,
  action: GridAction<T>,
  columns: EditableColumn<T>[],
): GridState<T> => {
  switch (action.type) {
    case "RESET": {
      return createInitialState(action.data);
    }
    case "PATCH_CELLS": {
      if (action.changes.length === 0) {
        return state;
      }
      const history = withHistory(state, action.recordHistory !== false);
      const draft = applyChanges(state.draft, action.changes);
      return {
        ...state,
        ...history,
        draft,
        dirtyMap: buildDirtyMap(state.snapshot, draft, columns),
        errorMap: clearFieldErrors(state.errorMap, action.changes),
        editingCell: null,
      };
    }
    case "UPDATE_CELL": {
      return gridReducer(
        state,
        {
          type: "PATCH_CELLS",
          changes: [
            { rowId: action.rowId, field: action.field, value: action.value },
          ],
          recordHistory: true,
        },
        columns,
      );
    }
    case "REVERT_ALL":
      return {
        ...createInitialState(state.snapshot),
        selection: state.selection,
      };
    case "SET_ACTIVE": {
      const cell = action.cell;
      if (!cell) {
        return {
          ...state,
          activeCell: null,
          selectionRange: null,
          rangeAnchor: null,
          editingCell: null,
        };
      }
      if (action.extendRange && state.rangeAnchor) {
        return {
          ...state,
          activeCell: cell,
          selectionRange: { start: state.rangeAnchor, end: cell },
          editingCell: null,
        };
      }
      return {
        ...state,
        activeCell: cell,
        rangeAnchor: cell,
        selectionRange: { start: cell, end: cell },
        editingCell: null,
      };
    }
    case "SET_RANGE":
      return {
        ...state,
        selectionRange: action.range,
        rangeAnchor: action.anchor ?? state.rangeAnchor,
      };
    case "SET_EDITING":
      return {
        ...state,
        editingCell: action.cell,
        activeCell: action.cell,
        rangeAnchor: action.cell ?? state.rangeAnchor,
        selectionRange: action.cell
          ? { start: action.cell, end: action.cell }
          : state.selectionRange,
      };
    case "TOGGLE_ROW": {
      const selection = new Set(state.selection);
      if (selection.has(action.rowId)) {
        selection.delete(action.rowId);
      } else {
        selection.add(action.rowId);
      }
      return { ...state, selection };
    }
    case "SET_SELECTION":
      return { ...state, selection: new Set(action.ids) };
    case "ADD_ROW": {
      const draft = [...state.draft, action.row];
      const newRowIds = new Set(state.newRowIds);
      newRowIds.add(action.row.id);
      return {
        ...state,
        draft,
        dirtyMap: buildDirtyMap(state.snapshot, draft, columns),
        newRowIds,
      };
    }
    case "SET_ERRORS":
      return { ...state, errorMap: action.errors };
    case "BULK_UPDATE": {
      const changes: CellChange[] = [];
      for (const id of action.ids) {
        changes.push({ rowId: id, field: action.field, value: action.value });
      }
      return gridReducer(
        state,
        { type: "PATCH_CELLS", changes, recordHistory: true },
        columns,
      );
    }
    case "CLEAR_FLASH":
      return { ...state, flashIds: new Set() };
    case "UNDO": {
      if (state.historyPast.length === 0) {
        return state;
      }
      const previous = state.historyPast[state.historyPast.length - 1]!;
      return {
        ...state,
        historyPast: state.historyPast.slice(0, -1),
        historyFuture: [cloneDraft(state.draft), ...state.historyFuture].slice(
          0,
          MAX_HISTORY,
        ),
        draft: cloneDraft(previous),
        dirtyMap: buildDirtyMap(state.snapshot, previous, columns),
        editingCell: null,
      };
    }
    case "REDO": {
      if (state.historyFuture.length === 0) {
        return state;
      }
      const [next, ...rest] = state.historyFuture;
      return {
        ...state,
        historyPast: [...state.historyPast, cloneDraft(state.draft)].slice(
          -MAX_HISTORY,
        ),
        historyFuture: rest,
        draft: cloneDraft(next!),
        dirtyMap: buildDirtyMap(state.snapshot, next!, columns),
        editingCell: null,
      };
    }
    case "APPLY_SAVE": {
      const okIds = new Set(
        action.result.results
          .filter((r) => r.status === "ok")
          .map((r) => r.id ?? r.tempId)
          .filter(Boolean) as string[],
      );
      const errorMap = new Map<string, Record<string, string>>();
      for (const item of action.result.results) {
        if (item.status === "error" && item.errors) {
          const key = item.id ?? item.tempId;
          if (key) {
            errorMap.set(key, item.errors);
          }
        }
      }
      const newRowIds = new Set(state.newRowIds);
      for (const id of okIds) {
        newRowIds.delete(id);
      }
      return {
        ...state,
        snapshot: action.data,
        draft: action.data,
        dirtyMap: new Map(),
        errorMap,
        flashIds: okIds,
        newRowIds,
        editingCell: null,
        historyPast: [],
        historyFuture: [],
      };
    }
    default:
      return state;
  }
};

export const validateRowFields = <T extends { id: string }>(
  row: T,
  columns: EditableColumn<T>[],
  requiredLabel: string,
): Record<string, string> => {
  const errors: Record<string, string> = {};
  for (const column of columns) {
    if (!column.editor || column.action === "expand" || isMetaColumnKey(column.key)) {
      continue;
    }
    const value = getRowValue(row, column.key as string);
    const fieldKey = column.key as string;
    if (column.required && (value == null || String(value).trim() === "")) {
      errors[fieldKey] = requiredLabel;
    }
    const custom = column.validate?.(value, row);
    if (custom) {
      errors[fieldKey] = custom;
    }
  }
  return errors;
};
