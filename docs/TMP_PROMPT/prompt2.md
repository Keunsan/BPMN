## 배경 / 목적
태스크 관리 화면이 "행 클릭→Sheet→1건 수정→저장→닫기→다음 건"이라 다건 편집이 비효율적이다.
좌측 프로세스 트리에서 프로세스 선택 → 우측에 해당 태스크들이 **편집 가능한 그리드**로
조회되고, **여러 행을 동시에 수정한 뒤 한 번에 일괄 저장**하도록 전환한다.

## 기술 결정 (확정 — 반드시 준수)
- 그리드는 **@tanstack/react-table v8** 기반으로 구현한다(이미 프로젝트 사용 중, 신규 의존성 금지).
- 셀 에디터는 shadcn/ui(Input/Select/Combobox/Checkbox/Popover)를 재사용한다.
- AG Grid 등 외부 그리드 라이브러리를 도입하지 않는다.
- 디자인은 .cursor/rules/design-system.mdc 를 100% 준수(hex·arbitrary font-size 금지).
- /docs/TMP_PROMPT/prompt1.md 파일을 설계 기준으로 삼는다.

## 이번 단계(Phase 1) 범위 — 아래만 구현, Phase 2 기능은 넣지 말 것
포함:  다건 인라인 편집 / dirty 추적 / 일괄 저장(부분 성공) / 키보드 내비게이션 /
       다중선택 일괄적용 / "+새 행" / 컬럼 freeze·정렬·필터·전역검색
제외(Phase 2): 복사·붙여넣기, fill-down, 범위선택, undo/redo
       → featureFlags로 끄되, 나중에 끼울 수 있게 구조만 열어둔다.

## 산출물
1) components/pams/editable-data-grid.tsx 신설 (TanStack 기반, 위 스펙대로)
2) 태스크 관리 화면을 좌 트리 / 우 편집그리드 2분할로 재구성
3) dirty 추적 + 하단 sticky BatchActionBar + 부분 성공/검증 처리
4) 기존 Sheet는 "단건 심층 편집" 용도로 유지(행의 펼치기 버튼으로 진입)

## 레이아웃
- 좌: 기존 프로세스 트리(ResizablePanel 재사용)
- 우: PageHeader(선택 프로세스명 + 조회 건수 칩 + 필터 칩) → EditableDataGrid →
     하단 sticky BatchActionBar
- 프로세스 미선택 시 우측은 EmptyState("프로세스를 선택하세요")

## 컬럼 정의 (태스크 그리드)
| 컬럼 | 타입 | 에디터 | 비고 |
|------|------|--------|------|
| 선택 | checkbox | - | 다중선택 |
| 태스크코드 | text | readonly | 좌측 freeze, mono + tabular-nums |
| 태스크명 | text | input | 필수, 좌측 freeze |
| 설명 | text | textarea(popover) | |
| 상태 | enum | Select | 초안/검토중/승인됨/배포됨/폐기됨 |
| 담당부서 | enum | Combobox | 조직 마스터 참조 |
| 연계시스템 | enum | Combobox | 시스템 마스터 참조(비어있을 수 있음) |
| 버전 | text | readonly | tabular-nums |
| 수정일 | date | readonly | |
| (펼치기) | action | - | 우측 Sheet 단건 심층편집 진입 |

## 인터랙션
1) 셀 편집: 더블클릭/Enter 진입, Esc 취소, Tab=다음 셀, Shift+Tab=이전,
   Enter(편집중)=확정 후 아래 행, 방향키=셀 이동(비편집)
2) dirty: 변경 셀=모서리 마커, 변경 행=좌측 accent 바. 원래 값 복귀 시 해제
3) BatchActionBar(dirty ≥1건일 때 노출): "변경 N건 · [모두 저장] [되돌리기]".
   저장 전 페이지 이탈/트리 이동 시 확인 다이얼로그
4) 일괄 저장: dirty 행만 모아 1회 요청. 부분 성공 —
   성공 행=초록 플래시 후 dirty 해제 / 실패 행=빨강 + 실패 셀 인라인 에러
5) 다중선택 일괄적용: 체크박스 선택 후 "선택 N건 상태 일괄 변경"
6) "+ 새 태스크 행": 그리드 하단 인라인 추가(임시 행, 저장 시 생성)
7) 조회: 헤더 정렬 / 전역 검색 / 컬럼 필터 / 컬럼 freeze

## API 계약 (백엔드 합의 전 가정 — TODO 주석 표기)
- GET   /api/processes/:processId/tasks  → Task[]
- PATCH /api/tasks/batch                  → 일괄 저장
  req: { updates:[{id, changedFields}], creates:[{tempId, ...}] }
  res: { results:[{id|tempId, status:"ok"|"error", errors?:{field:msg}}] }
- 낙관적 업데이트 후 실패 행만 롤백, 전역 실패 시 전체 롤백 + 토스트

## 상태관리 / 검증
- rows(원본)/draftRows(편집본)/dirtyMap/errorMap/selection/activeCell 분리
  (useReducer 또는 zustand 중 프로젝트 관례 따름)
- 필수값(태스크명)·enum 범위·중복코드 클라 1차 검증 → 서버 2차 검증

## 제약
- .cursor/rules 색/타이포/반경/컴포넌트 규약 준수
- 새 table 직접 구현 금지 — 반드시 이번에 만든 EditableDataGrid 사용
- 기존 라우팅/트리/Sheet의 외부 인터페이스를 깨지 않음

## 진행 방식
1) 먼저 변경/신설 파일 목록 + 컴포넌트 구조도를 표로 제시(코드 X)
2) 내 확인 후 ① EditableDataGrid(Phase1) ② 태스크 화면 ③ BatchActionBar 순 구현
3) 각 단계에서 키보드 내비/dirty/부분저장 처리 방식을 요약
4) Phase 2(엑셀 기능)를 끼우기 위해 어디를 열어뒀는지 명시