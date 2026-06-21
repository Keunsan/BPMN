/** EditableDataGrid 셀 에디터 종류 */
export type EditorType =
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "combobox"
  | "checkbox"
  | "date";

export type EditableColumnOption = {
  label: string;
  value: string;
};

/** EditableDataGrid 컬럼 정의 */
export type EditableColumn<T> = {
  key: (keyof T & string) | "_select" | "_expand";
  header: string;
  editor?: EditorType;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  freeze?: "left";
  align?: "left" | "right" | "center";
  mono?: boolean;
  required?: boolean;
  sortable?: boolean;
  filter?: "text" | "select";
  options?:
    | EditableColumnOption[]
    | (() => Promise<EditableColumnOption[]>);
  validate?: (value: unknown, row: T) => string | null;
  /** 펼치기 등 액션 컬럼 */
  action?: "expand";
  /** Phase 2: 붙여넣기 파서 */
  parsePaste?: (raw: string) => unknown;
  /** 표시·정렬·필터용 원시값 */
  accessor?: (row: T) => string | number | null;
};

export type SaveResult = {
  results: Array<{
    id?: string;
    tempId?: string;
    status: "ok" | "error";
    errors?: Record<string, string>;
  }>;
};

export type EditableGridSavePayload<T> = {
  updates: Array<{ id: string; changedFields: Partial<T> }>;
  creates: Array<Partial<T> & { tempId: string }>;
};

export type EditableGridBulkAction<T extends { id: string }> = {
  label: string;
  field?: keyof T & string;
  value?: unknown;
  apply?: (selectedIds: string[]) => void;
};

export type EditableGridFeatureFlags = {
  clipboard?: boolean;
  fillDown?: boolean;
  rangeSelect?: boolean;
  undoRedo?: boolean;
};

export type EditableGridToolbar = {
  globalSearch?: boolean;
  columnFilter?: boolean;
  savedViews?: boolean;
  columnManager?: boolean;
};

export type EditableDataGridProps<T extends { id: string }> = {
  columns: EditableColumn<T>[];
  data: T[];
  loading?: boolean;
  density?: "comfortable" | "compact";
  onSave: (payload: EditableGridSavePayload<T>) => Promise<SaveResult>;
  onRowExpand?: (row: T) => void;
  bulkActions?: EditableGridBulkAction<T>[];
  enableAddRow?: boolean;
  createEmptyRow?: () => T;
  toolbar?: EditableGridToolbar;
  featureFlags?: EditableGridFeatureFlags;
  storageKey?: string;
  emptyMessage?: string;
  fillHeight?: boolean;
  className?: string;
  onDirtyChange?: (dirty: boolean) => void;
  addRowLabel?: string;
  countLabel?: string;
  /** 붙여넣기 확인 다이얼로그 임계 셀 수 (기본 50) */
  pasteConfirmThreshold?: number;
};

export type TaskGridRow = {
  id: string;
  nodeId: number;
  attrId: number;
  processCode: string;
  processName: string;
  definition: string | null;
  purpose: string | null;
  inputDeliverable: string | null;
  outputDeliverable: string | null;
  ownerOrgId: string | null;
  linkedSystemId: string | null;
  version: string | null;
  updatedAt: string | null;
};

export type TaskAttributeBatchUpdate = {
  id: string;
  changedFields: Partial<TaskGridRow>;
};

export type TaskAttributeBatchCreate = Partial<TaskGridRow> & { tempId: string };

export type TaskAttributeBatchRequest = {
  updates: TaskAttributeBatchUpdate[];
  creates: TaskAttributeBatchCreate[];
};
