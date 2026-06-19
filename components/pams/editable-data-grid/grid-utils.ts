import type { EditableColumn } from "@/types/editable-data-grid";

export type CellCoord = { rowId: string; field: string };

export type CellRange = {
  start: CellCoord;
  end: CellCoord;
};

export type GridCoord = { rowIndex: number; colIndex: number };

export type NormalizedRange = {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
};

export const PASTE_CONFIRM_THRESHOLD_DEFAULT = 50;

export const isMetaColumnKey = (key: string): key is "_select" | "_expand" =>
  key === "_select" || key === "_expand";

export const isEqualValue = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (a == null && b == null) {
    return true;
  }
  return String(a) === String(b);
};

export const getRowValue = <T extends { id: string }>(
  row: T,
  key: string,
): unknown => {
  if (isMetaColumnKey(key)) {
    return undefined;
  }
  return row[key as keyof T & string];
};

/** 클립보드·범위용 데이터 컬럼 (메타 제외) */
export const getDataColumns = <T extends { id: string }>(
  columns: EditableColumn<T>[],
): EditableColumn<T>[] =>
  columns.filter((col) => !isMetaColumnKey(col.key));

/** 키보드·편집 내비게이션 컬럼 */
export const getNavigableColumns = <T extends { id: string }>(
  columns: EditableColumn<T>[],
): EditableColumn<T>[] =>
  columns.filter(
    (col) => col.editor && col.action !== "expand" && !isMetaColumnKey(col.key),
  );

export const getEditableDataKeys = <T extends { id: string }>(
  columns: EditableColumn<T>[],
): Array<keyof T & string> =>
  getNavigableColumns(columns).map((col) => col.key as keyof T & string);

export const buildDirtyMap = <T extends { id: string }>(
  snapshot: T[],
  draft: T[],
  columns: EditableColumn<T>[],
): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  const snapshotById = new Map(snapshot.map((row) => [row.id, row]));
  const editableKeys = getEditableDataKeys(columns);

  for (const row of draft) {
    const original = snapshotById.get(row.id);
    if (!original) {
      if (editableKeys.length > 0) {
        map.set(row.id, new Set(editableKeys));
      }
      continue;
    }
    const changed = new Set<string>();
    for (const key of editableKeys) {
      if (!isEqualValue(getRowValue(row, key), getRowValue(original, key))) {
        changed.add(key);
      }
    }
    if (changed.size > 0) {
      map.set(row.id, changed);
    }
  }
  return map;
};

export const isEditableColumn = <T extends { id: string }>(
  column: EditableColumn<T>,
): boolean =>
  Boolean(column.editor && column.action !== "expand" && !isMetaColumnKey(column.key));

export const cellToCoord = <T extends { id: string }>(
  cell: CellCoord,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
): GridCoord | null => {
  const rowIndex = rowIds.indexOf(cell.rowId);
  const colIndex = dataColumns.findIndex((col) => col.key === cell.field);
  if (rowIndex < 0 || colIndex < 0) {
    return null;
  }
  return { rowIndex, colIndex };
};

export const coordToCell = <T extends { id: string }>(
  coord: GridCoord,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
): CellCoord | null => {
  const rowId = rowIds[coord.rowIndex];
  const column = dataColumns[coord.colIndex];
  if (!rowId || !column) {
    return null;
  }
  return { rowId, field: column.key as string };
};

export const normalizeRange = (
  start: GridCoord,
  end: GridCoord,
): NormalizedRange => ({
  rowStart: Math.min(start.rowIndex, end.rowIndex),
  rowEnd: Math.max(start.rowIndex, end.rowIndex),
  colStart: Math.min(start.colIndex, end.colIndex),
  colEnd: Math.max(start.colIndex, end.colIndex),
});

export const rangeFromCells = <T extends { id: string }>(
  start: CellCoord,
  end: CellCoord,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
): CellRange | null => {
  const startCoord = cellToCoord(start, rowIds, dataColumns);
  const endCoord = cellToCoord(end, rowIds, dataColumns);
  if (!startCoord || !endCoord) {
    return null;
  }
  const norm = normalizeRange(startCoord, endCoord);
  const startCell = coordToCell(
    { rowIndex: norm.rowStart, colIndex: norm.colStart },
    rowIds,
    dataColumns,
  );
  const endCell = coordToCell(
    { rowIndex: norm.rowEnd, colIndex: norm.colEnd },
    rowIds,
    dataColumns,
  );
  if (!startCell || !endCell) {
    return null;
  }
  return { start: startCell, end: endCell };
};

export const isCellInRange = <T extends { id: string }>(
  cell: CellCoord,
  range: CellRange | null,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
): boolean => {
  if (!range) {
    return false;
  }
  const coord = cellToCoord(cell, rowIds, dataColumns);
  const start = cellToCoord(range.start, rowIds, dataColumns);
  const end = cellToCoord(range.end, rowIds, dataColumns);
  if (!coord || !start || !end) {
    return false;
  }
  const norm = normalizeRange(start, end);
  return (
    coord.rowIndex >= norm.rowStart &&
    coord.rowIndex <= norm.rowEnd &&
    coord.colIndex >= norm.colStart &&
    coord.colIndex <= norm.colEnd
  );
};

export const iterRangeCells = <T extends { id: string }>(
  range: CellRange,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
): CellCoord[] => {
  const start = cellToCoord(range.start, rowIds, dataColumns);
  const end = cellToCoord(range.end, rowIds, dataColumns);
  if (!start || !end) {
    return [];
  }
  const norm = normalizeRange(start, end);
  const cells: CellCoord[] = [];
  for (let r = norm.rowStart; r <= norm.rowEnd; r += 1) {
    for (let c = norm.colStart; c <= norm.colEnd; c += 1) {
      const cell = coordToCell({ rowIndex: r, colIndex: c }, rowIds, dataColumns);
      if (cell) {
        cells.push(cell);
      }
    }
  }
  return cells;
};

export const cloneDraft = <T extends { id: string }>(draft: T[]): T[] =>
  draft.map((row) => ({ ...row }));
