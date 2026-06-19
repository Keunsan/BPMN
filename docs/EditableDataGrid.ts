// components/pams/editable-data-grid.tsx — 설계 스펙
// 목적: 조회 결과를 엑셀형으로 다건 인라인 편집 + 일괄 저장하는 공용 그리드.
// 기반: TanStack Table v8 (headless) + shadcn 셀 에디터 + 디자인 토큰.

// ── 컬럼 정의 ────────────────────────────────────────────
type EditorType =
  | "text" | "number" | "textarea"
  | "select" | "combobox" | "checkbox" | "date";

interface EditableColumn<T> {
  key: keyof T & string;
  header: string;
  editor?: EditorType;              // 없으면 readonly
  width?: number;
  freeze?: "left";                 // 좌측 고정(코드/명)
  align?: "left" | "right";        // 숫자=right + tabular-nums
  mono?: boolean;                   // 코드/버전 등 등폭
  required?: boolean;
  options?: Array<{ label: string; value: string }> // select/combobox
         | (() => Promise<Array<{ label: string; value: string }>>);                // 비동기 옵션
  validate?: (value: unknown, row: T) => string | null; // 셀 검증
}

// ── 컴포넌트 Props ───────────────────────────────────────
interface EditableDataGridProps<T extends { id: string }> {
  columns: EditableColumn<T>[];
  data: T[];                        // 원본(서버) 데이터
  loading?: boolean;                // 스켈레톤
  density?: "comfortable" | "compact";

  // 저장: dirty 행/신규 행을 모아 호출. 부분 성공 결과 반환.
  onSave: (payload: {
    updates: Array<{ id: string; changedFields: Partial<T> }>;
    creates: Array<Partial<T> & { tempId: string }>;
  }) => Promise<SaveResult>;

  onRowExpand?: (row: T) => void;   // 우측 Sheet 단건 심층편집

  // 선택 기반 일괄 액션 (예: 상태 일괄 변경)
  bulkActions?: Array<{
    label: string;
    apply: (selectedIds: string[]) => void; // 보통 draft 일괄 수정
  }>;

  enableAddRow?: boolean;           // "+ 새 행"
  enablePaste?: boolean;            // 엑셀 붙여넣기
  enableFillDown?: boolean;         // Ctrl+D
  toolbar?: {                       // 조회 도구
    globalSearch?: boolean;
    columnFilter?: boolean;
    savedViews?: boolean;
    columnManager?: boolean;
  };
}

interface SaveResult {
  results: Array<{
    id?: string; tempId?: string;
    status: "ok" | "error";
    errors?: Record<string, string>; // field → 메시지
  }>;
}

// ── 내부 상태 모델 ───────────────────────────────────────
// rows:      원본 스냅샷 (저장 성공 시 갱신)
// draftRows: 편집본 (셀 변경 시 갱신)
// dirtyMap:  Map<rowId, Set<field>>  — 변경 셀 추적, 원본과 같아지면 제거
// errorMap:  Map<rowId, Record<field,msg>> — 서버/클라 검증 에러
// selection: Set<rowId>
// activeCell:{ rowId, field } | null  — 키보드 내비 포커스

// ── 키보드 규약 ──────────────────────────────────────────
// 비편집: ↑↓←→ 셀 이동 / Enter·Dblclick 편집진입 / Space 선택토글
// 편집중: Enter 확정+아래 / Tab 확정+우 / Shift+Tab 좌 / Esc 취소
// Ctrl+D fill-down / Ctrl+V 붙여넣기(enablePaste 시)

// ── 시각 규약(디자인 토큰만 사용) ────────────────────────
// dirty 셀: 우상단 삼각 마커(bg-primary)
// dirty 행: 좌측 2px accent 바
// 저장 성공: 행 배경 1회 초록 플래시(150ms) 후 해제
// 저장 실패: 행 좌측 빨강 바 + 셀 하단 text-xs text-destructive 메시지
// 신규 행: 좌측 점선 accent 바 + "신규" 뱃지
// 헤더: text-xs font-medium text-muted-foreground, 정렬 가능 시 아이콘

// ── 접근성 ──────────────────────────────────────────────
// role="grid" / aria-rowindex/colindex / aria-selected
// 편집 셀 focus-visible ring, esc 시 포커스 셀로 복귀
