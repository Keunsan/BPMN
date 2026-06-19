import type { EditableColumn, EditableColumnOption } from "@/types/editable-data-grid";

import {
  getRowValue,
  isEditableColumn,
  type CellCoord,
  type CellRange,
  type NormalizedRange,
} from "./grid-utils";

/** 셀 값을 TSV 셀 문자열로 직렬화 */
export const formatCellForTsv = (value: unknown): string => {
  if (value == null) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  const text = String(value);
  if (text.includes("\t") || text.includes("\n") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

/** TSV 행렬 → 2차원 문자열 배열 */
export const tsvToMatrix = (tsv: string): string[][] => {
  const rows = tsv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (rows.length > 0 && rows[rows.length - 1] === "") {
    rows.pop();
  }
  return rows.map((row) => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i += 1) {
      const ch = row[i];
      if (inQuotes) {
        if (ch === '"' && row[i + 1] === '"') {
          current += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === "\t") {
        cells.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  });
};

export const matrixToTsv = (matrix: string[][]): string =>
  matrix.map((row) => row.map(formatCellForTsv).join("\t")).join("\n");

/** 에디터 타입별 기본 붙여넣기 파서 */
export const parseCellValue = <T extends { id: string }>(
  raw: string,
  column: EditableColumn<T>,
  options: EditableColumnOption[],
): { value: unknown; error: string | null } => {
  const trimmed = raw.trim();
  if (column.parsePaste) {
    try {
      return { value: column.parsePaste(raw), error: null };
    } catch {
      return { value: null, error: "parse" };
    }
  }

  switch (column.editor) {
    case "number": {
      if (trimmed === "") {
        return { value: null, error: null };
      }
      const num = Number(trimmed);
      if (Number.isNaN(num)) {
        return { value: null, error: "number" };
      }
      return { value: num, error: null };
    }
    case "checkbox": {
      const lower = trimmed.toLowerCase();
      if (["true", "1", "yes", "y"].includes(lower)) {
        return { value: true, error: null };
      }
      if (["false", "0", "no", "n", ""].includes(lower)) {
        return { value: false, error: null };
      }
      return { value: null, error: "boolean" };
    }
    case "select":
    case "combobox": {
      if (trimmed === "") {
        return { value: null, error: null };
      }
      const byValue = options.find((o) => o.value === trimmed);
      if (byValue) {
        return { value: byValue.value, error: null };
      }
      const byLabel = options.find(
        (o) => o.label.toLowerCase() === trimmed.toLowerCase(),
      );
      if (byLabel) {
        return { value: byLabel.value, error: null };
      }
      return { value: null, error: "enum" };
    }
    case "date": {
      if (trimmed === "") {
        return { value: null, error: null };
      }
      const date = new Date(trimmed);
      if (Number.isNaN(date.getTime())) {
        return { value: null, error: "date" };
      }
      return { value: trimmed, error: null };
    }
    default:
      return { value: raw, error: null };
  }
};

export const buildCopyMatrix = <T extends { id: string }>(
  range: CellRange,
  norm: NormalizedRange,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
  draft: T[],
): string[][] => {
  const matrix: string[][] = [];
  for (let r = norm.rowStart; r <= norm.rowEnd; r += 1) {
    const row: string[] = [];
    for (let c = norm.colStart; c <= norm.colEnd; c += 1) {
      const rowId = rowIds[r];
      const column = dataColumns[c];
      if (!rowId || !column) {
        row.push("");
        continue;
      }
      const dataRow = draft.find((item) => item.id === rowId);
      const value = dataRow ? getRowValue(dataRow, column.key as string) : "";
      row.push(value == null ? "" : String(value));
    }
    matrix.push(row);
  }
  return matrix;
};

export type PasteChange = { rowId: string; field: string; value: unknown };

export type PastePlanResult =
  | {
      ok: true;
      changes: PasteChange[];
      cellCount: number;
      fieldErrors: Array<{ rowId: string; field: string }>;
    }
  | {
      ok: false;
      reason: "overflow" | "noAnchor";
    };

/** 붙여넣기 계획 — 범위 초과 시 overflow */
export const buildPastePlan = <T extends { id: string }>(
  matrix: string[][],
  anchor: CellCoord,
  rowIds: string[],
  dataColumns: EditableColumn<T>[],
  draft: T[],
  getOptions: (column: EditableColumn<T>) => EditableColumnOption[],
): PastePlanResult => {
  const anchorCoord = rowIds.indexOf(anchor.rowId);
  const anchorCol = dataColumns.findIndex((col) => col.key === anchor.field);
  if (anchorCoord < 0 || anchorCol < 0) {
    return { ok: false, reason: "noAnchor" };
  }

  if (anchorCoord + matrix.length > rowIds.length) {
    return { ok: false, reason: "overflow" };
  }

  const changes: PasteChange[] = [];
  const fieldErrors: Array<{ rowId: string; field: string }> = [];
  let cellCount = 0;

  for (let r = 0; r < matrix.length; r += 1) {
    const rowId = rowIds[anchorCoord + r];
    const dataRow = draft.find((item) => item.id === rowId);
    if (!dataRow) {
      continue;
    }
    const pasteRow = matrix[r] ?? [];
    let dataColIndex = anchorCol;
    for (let p = 0; p < pasteRow.length; p += 1) {
      while (
        dataColIndex < dataColumns.length &&
        !isEditableColumn(dataColumns[dataColIndex]!)
      ) {
        dataColIndex += 1;
      }
      if (dataColIndex >= dataColumns.length) {
        break;
      }
      const column = dataColumns[dataColIndex]!;
      const field = column.key as string;
      const options = getOptions(column);
      const { value, error } = parseCellValue(
        pasteRow[p] ?? "",
        column,
        options,
      );
      if (error) {
        fieldErrors.push({ rowId, field });
      } else {
        changes.push({ rowId, field, value });
      }
      cellCount += 1;
      dataColIndex += 1;
    }
  }

  return { ok: true, changes, cellCount, fieldErrors };
};

export const copyCellsToTsv = async (tsv: string): Promise<void> => {
  await navigator.clipboard.writeText(tsv);
};

export const readClipboardTsv = async (): Promise<string> => {
  return navigator.clipboard.readText();
};

export const getEffectiveRange = (
  selectionRange: CellRange | null,
  activeCell: CellCoord | null,
): CellRange | null => {
  if (selectionRange) {
    return selectionRange;
  }
  if (activeCell) {
    return { start: activeCell, end: activeCell };
  }
  return null;
};
