# EditableDataGrid 공용 컴포넌트 스펙 (TanStack Table 기반)

## 기술 결정 (확정)
- 베이스: **@tanstack/react-table v8** (이미 프로젝트에서 사용 중 — 신규 의존성 없음)
- 셀 에디터: shadcn/ui 컴포넌트(Input/Select/Combobox/Checkbox/Popover) 재사용
- 디자인: 100% 디자인 토큰(.cursor/rules/design-system.mdc) 준수, hex/arbitrary 금지
- 라이선스: MIT (상업적 제약 없음)
- 풀스펙 스프레드시트(AG Grid)가 아니라, "다건 인라인 편집 + 일괄 저장"에 최적화

## 단계 구분 (중요)
- **Phase 1 (필수)**: 다건 인라인 편집 / dirty 추적 / 일괄 저장(부분 성공) /
  키보드 내비게이션 / 다중선택 일괄적용 / "+새 행" / 컬럼 freeze·정렬·필터
- **Phase 2 (확장)**: 엑셀 복사·붙여넣기 / fill-down(Ctrl+D) / 범위 선택 /
  Undo·Redo / 셀 범위 드래그
- Phase 1 컴포넌트는 Phase 2 기능을 "플러그인처럼 끼울 수 있는" 구조로 설계한다
  (아래 featureFlags 참고). Phase 1에서 Phase 2 코드를 미리 넣지 않는다.

## 컬럼 정의
```typescript
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
  mono?: boolean;                  // 코드/버전 등 등폭(tabular-nums font-mono)
  required?: boolean;
  options?: Array<{ label: string; value: string }>
         | (() => Promise<Array<{ label: string; value: string }>>);
  validate?: (value: unknown, row: T) => string | null; // 셀 단위 검증
  // Phase 2용 (Phase 1에선 무시): 붙여넣기 시 문자열→값 파서
  parsePaste?: (raw: string) => unknown;
}
```

## 컴포넌트 Props
```typescript
interface EditableDataGridProps<T extends { id: string }> {
  columns: EditableColumn<T>[];
  data: T[];
  loading?: boolean;
  density?: "comfortable" | "compact";

  // 일괄 저장 — dirty 행 + 신규 행을 모아 한 번에. 부분 성공 결과 반환.
  onSave: (payload: {
    updates: Array<{ id: string; changedFields: Partial<T> }>;
    creates: Array<Partial<T> & { tempId: string }>;
  }) => Promise<SaveResult>;

  onRowExpand?: (row: T) => void;   // 우측 Sheet 단건 심층편집

  bulkActions?: Array<{
    label: string;
    apply: (selectedIds: string[]) => void;
  }>;

  enableAddRow?: boolean;
  toolbar?: {
    globalSearch?: boolean;
    columnFilter?: boolean;
    savedViews?: boolean;
    columnManager?: boolean;
  };

  // ── Phase 2 기능 플래그 (Phase 1에선 전부 false/미구현) ──
  featureFlags?: {
    clipboard?: boolean;   // 엑셀 복사·붙여넣기
    fillDown?: boolean;    // Ctrl+D
    rangeSelect?: boolean; // 셀 범위 선택/드래그
    undoRedo?: boolean;    // Ctrl+Z / Ctrl+Shift+Z
  };
}

interface SaveResult {
  results: Array<{
    id?: string; tempId?: string;
    status: "ok" | "error";
    errors?: Record<string, string>; // field → 메시지
  }>;
}
```

## 내부 상태 모델
```
rows       : 원본 스냅샷 (저장 성공 시 갱신)
draftRows  : 편집본 (셀 변경 시 갱신)
dirtyMap   : Map<rowId, Set<field>>  — 원본과 같아지면 자동 해제
errorMap   : Map<rowId, Record<field,msg>>
selection  : Set<rowId>
activeCell : { rowId, field } | null      — 키보드 포커스
// Phase 2 추가: selectionRange, history(undo/redo 스택)
```

## 키보드 규약
- Phase 1
  - 비편집: ↑↓←→ 셀 이동 / Enter·Dblclick 편집진입 / Space 선택토글
  - 편집중: Enter=확정+아래 / Tab=확정+우 / Shift+Tab=좌 / Esc=취소
- Phase 2 (featureFlags로 활성)
  - Ctrl+C / Ctrl+V (엑셀 호환 TSV) / Ctrl+D fill-down /
    Shift+방향키 범위확장 / Ctrl+Z·Ctrl+Shift+Z

## 시각 규약 (디자인 토큰만)
- dirty 셀: 우상단 삼각 마커(bg-primary)
- dirty 행: 좌측 2px accent 바
- 저장 성공: 행 배경 초록 1회 플래시(≤150ms) 후 해제
- 저장 실패: 행 좌측 destructive 바 + 셀 하단 text-xs text-destructive 메시지
- 신규 행: 좌측 점선 accent 바 + "신규" 뱃지
- 헤더: text-xs font-medium text-muted-foreground
- 숫자/코드: text-right + tabular-nums (+ mono시 font-mono)

## 접근성
- role="grid" / aria-rowindex·colindex / aria-selected
- 편집 셀 focus-visible ring, Esc 시 포커스 셀로 복귀

## 재사용
- 태스크/시스템연계/테이블연계/코드관리 화면은 columns 정의만 주입해 재사용