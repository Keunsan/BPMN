# PAMS 개발 현황 및 남은 과제 정리

> **작성일:** 2026-06-25  
> **기준:** `docs/PLAN.md` · `docs/PRD.md` §14.7 · `docs/ontology_v1.md` · git 커밋(260616~260625)  
> **현재 위치:** Phase 4~5 진행 중 — Layer C 핵심·운영지식그래프·E2E 완료, 조직/역할/RACI·BPMN 선행 동기화 고도화 진행

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | PAMS (Process Architecture Management System) |
| **목표** | 전사 업무 아키텍처(L1~L4·E2E) · BPMN · 시스템 운영 메타데이터 통합 플랫폼 |
| **기술 스택** | Next.js 16 App Router · TypeScript strict · Tailwind/Shadcn · MSSQL 2017 · TanStack Query · bpmn.js · next-intl (ko/en/zh-TW) |
| **DB 마이그레이션** | `001` ~ `029` (최신: RACI role-only, 시스템 카탈로그 인덱스) |

---

## 2. Phase별 구현 현황 요약

| Phase | 상태 | 완료 | 미완 |
|-------|:----:|------|------|
| **0** 환경·기반 | ✅ (Auth ⏸️) | Next.js·i18n·MSSQL·Query/Service·에러코드 | Supabase Auth (쿠키 세션 stub) |
| **1** 기반 구조 | ✅ | 레이아웃·API·에러·공통 UI·언어 선택 | — |
| **2** Layer A | ✅ | L1~L4·승인·버전·Scope/Variant·표준/변형 비교 | — |
| **3** Layer B | ✅ | BPMN 에디터·Call Activity·버전비교·Send/Receive Task | L2 오케스트레이션 뷰 |
| **4** Layer C | 🔄 | Task속성·선행·시스템(2-tier)·데이터연결·조직/역할/RACI | KPI/리스크/통제·문서 |
| **5** 분석/검색 | 🔄 | 운영 지식그래프 | 영향도·통합검색·대시보드 실데이터·히트맵·내보내기 |
| **7** E2E 카탈로그 | ✅ | E2E CRUD·E2E BPMN·drill-down·프로세스맵 E2E 섹션 | — |
| **6** 통합·마무리 | 📋 | — | E2E 테스트·성능·배포·다국어 검수 |

---

## 3. 완료된 개발 내역 (상세)

### 3.1 Phase 0~2 — 기반·프로세스 계층 ✅

- Next.js 16 App Router, `[locale]` 다국어 라우팅, TanStack Query v5, Zustand(UI), Service/Query 레이어
- `ApiResponse<T>` · `ApiError` · E001~E604 에러 코드 · traceId
- L1~L4 프로세스 트리(DnD), CRUD, 다국어 입력(`MultiLangInput`), 코드 자동생성
- 승인 워크플로(DRAFT → IN_REVIEW → APPROVED → PUBLISHED), 버전 관리(Major.Minor.Patch)
- Scope/Variant (migration 018~019), 표준/변형 비교 UI
- FilterPanel 접기/펼치기, ListPageBody 레이아웃 패턴 정립

### 3.2 Phase 3 — BPMN (Layer B) ✅

- bpmn.js 에디터, XML/SVG 저장, 속성 패널, Undo/Redo
- Task ↔ L4 프로세스 연결, Call Activity ↔ 전사 L3 (migration 022)
- BPMN 버전 비교(`BpmnCompareView`)
- **Send/Receive Task** 지원 (migration 027, `pams-palette-provider`, `pams-context-pad-provider`)
- BPMN 목록·필터·썸네일 (`BpmnModelList`)

### 3.3 Phase 4 — Layer C (핵심 완료)

| 영역 | 구현 파일·API | 비고 |
|------|--------------|------|
| Task 속성 | `TaskAttributeForm`, `TaskAttributeList`, `/api/metadata/task-attribute` | 다국어, EditableDataGrid, 배치 API |
| 선행 프로세스 | `PredecessorSelect`, `task_predecessor` | BPMN sequenceFlow ↔ DB 동기화 |
| 시스템 연결 | `TaskSystemMapping`, migration 023 (2-tier) | 시스템→화면 |
| 데이터 연결 | `DataTableLink`, `ExternalTableBrowser`, `/api/external/systems` | 외부 API 연동 |
| 시스템/외부API/공통코드 | `SystemMasterManagement`, `ExternalApiSettingsManagement`, `CommonCodeManagement` | migration 012~016 |
| **조직 마스터** | `OrganizationMasterManagement`, `/api/admin/organizations`, HR ERP sync | migration 026, 017 |
| **역할 마스터** | `RoleMasterManagement`, `/api/admin/roles` | |
| **RACI** | `RaciMatrix`, `/api/metadata/tasks/[nodeId]/raci`, migration 028 | role-only (조직 직접 매핑 제거) |

### 3.4 Phase 5 — 운영 지식그래프 ✅ (부분)

- `/analysis/operations-graph` — Explorer · Canvas · Inspector
- `operations-graph.service.ts` — BFS 탐색, centerKind=E2E|L3|SYSTEM
- GraphNodeKind: E2E, L3, TASK, APPLICATION, TABLE, INTERFACE
- GraphEdgeKind: CONTAINS, PRECEDES, USES_SCREEN, READS_TABLE, WRITES_TABLE, INTERFACE
- E2E BPMN Viewer, Call Activity drill-down 연동
- 레이아웃 고도화 (`useGraphLayout` — hierarchical/radial)
- Task 스코프 APPLICATION/TABLE 노드 분리

### 3.5 Phase 7 — E2E 프로세스 카탈로그 ✅

- DB: `e2e_process`, `bpmn_model.model_kind` / `e2e_process_id` (migration 025)
- API: `/api/e2e-process`, `/by-l3/[nodeId]`, `/api/bpmn/l3/[nodeId]/l4-slice`
- UI: `/e2e-process`, `E2eProcessDetail`, `E2eProcessFlowSteps`, `E2eBpmnViewerSheet`, `BpmnDrilldownViewer`
- 운영지식그래프 `centerKind=E2E` 탐색

### 3.6 공통 UI·디자인 시스템 (6/19~)

- **PAMS EditableDataGrid** — 클립보드·Fill Handle·컨텍스트 메뉴·컬럼 리사이즈·정렬/필터
- **PlaceholderPage** — 미구현 화면 공통 패턴
- **design-system.mdc** — 시맨틱 토큰·타이포·반경·공용 컴포넌트 규약
- **PAMS-FIDELITY-MOCKUP** — 화면 피델리티 목업 (docs/mockup/)

### 3.7 최근 개발 (2026-06-18 ~ 06-25)

#### 6/18 — Task 매핑 UX 개선
- `TaskMappingSideLayout`, `TaskAttributeProcessTree` — 좌측 트리 + 우측 그리드 패턴
- Task 속성·시스템·데이터 연결 화면 레이아웃 통일

#### 6/19 — 필터 패널·Task 속성 고도화
- FilterPanelSideBody, 접기/펼치기 토글
- TaskAttributeList EditableDataGrid 전환
- EditableDataGrid 컴포넌트 본격 도입

#### 6/19~21 — 조직·역할·RACI·운영그래프
- 조직 마스터 + HR ERP 부서 동기화 (`hr-erp.client.ts`)
- 역할 마스터 CRUD
- RACI 매트릭스 UI·API 전면 구현
- 운영 지식그래프 캔버스·레이아웃·스타일 대폭 개선
- E2E 프로세스 상세·FlowSteps UI

#### 6/22 — BPMN Task 유형 확장
- Send Task, Receive Task (migration 027)
- 팔레트·컨텍스트 패드 Provider 개선

#### 6/25 — BPMN 선행 동기화 고도화 ⭐ (최신 커밋 2606251413)
- **`bpmn-predecessor-sync.service.ts`** — L3 BPMN → `task_predecessor` 동기화 서비스
- **`bpmn-auto-predecessor.ts`** — 에디터에서 L4 선행 자동 도출
- API: `/api/bpmn/[modelId]/sync-predecessors`, `/api/metadata/task-attribute/[nodeId]/sync-bpmn-predecessors`
- `TaskAttributeForm` — BPMN 기반 선행 자동 반영·수동 동기화
- `process-l4-order.ts` — L4 순서·선행 관계 정렬 로직 리팩터
- `ProcessScopeFilter` — Scope/Variant 필터 개선
- BPMN 에디터 UX 개선 (패널 리사이즈, Inner 컴포넌트)

#### 6/25 — RACI role-only 정리 (2606250911)
- migration 028: `task_role_mapping`에서 `org_id` 제거, 역할 기반 RACI만 지원
- migration 029: 시스템 카탈로그 성능 인덱스
- Process L4 ordering, Scope/Variant 필드·비교 UI 개선

---

## 4. 남은 과제

### 4.1 Phase 4 — Layer C 잔여

| 과제 | 현재 상태 | 우선순위 | 비고 |
|------|----------|:--------:|------|
| **KPI 마스터·연결** | Placeholder (`/metadata/kpi-risk`) | 중 | migration 007 DDL 존재, UI/API 미구현 |
| **리스크 마스터·연결** | Placeholder | 중 | |
| **통제(Control) 마스터·연결** | Placeholder | 중 | |
| **문서 연결** | Placeholder | 중 | migration 008 DDL 존재, Supabase Storage 연동 필요 |
| **L3/L4 ↔ 조직 매핑 구조 변경** | 백로그 (PLAN) | 낮 | 조직코드 직접 → 역할마스터 경유 구조로 전환 예정 |

### 4.2 Phase 5 — 분석·검색·대시보드

| 과제 | 현재 상태 | 우선순위 | 비고 |
|------|----------|:--------:|------|
| **시스템 영향도 분석** | Placeholder (`/analysis/impact`) | **높음** | 온톨로지 UC-01과 직결 |
| **데이터 영향도 분석** | Placeholder (`/data/impact`) | **높음** | 테이블 변경 → Task→L3→E2E→조직 경로 |
| **통합 검색 (다국어)** | Placeholder (`/analysis/search`) | **높음** | Full-Text 또는 LIKE, locale fallback |
| **Heat Map** | Placeholder (`/analysis/heatmap`) | 중 | 프로세스·조직 시각화 |
| **대시보드 실데이터** | UI 골격만 (`DashboardClient` — 카운트 `—`) | 중 | 프로세스 현황·승인 대기·시스템 분포 |
| **최근 활동** | Placeholder (`/dashboard/activity`) | 중 | |
| **데이터 내보내기** | 미구현 | 중 | Excel·PDF·BPMN XML·SVG/PNG |
| **L2 오케스트레이션 뷰** | 미구현 | 중 | Call Activity 기반 L2 흐름 시각화 |

### 4.3 Phase 6 — 통합·마무리

| 과제 | 현재 상태 | 우선순위 |
|------|----------|:--------:|
| **Supabase Auth** | ⏸️ stub | 높음 (운영 전) |
| **사용자/권한 관리** | Placeholder (`/admin/users`) | 높음 |
| **E2E 테스트 (Playwright/Cypress)** | 미구현 | 중 |
| **다국어 검수** | 미완 | 중 |
| **성능 최적화** | 부분 (migration 029 인덱스) | 중 |
| **배포·CI/CD** | 미구현 | 중 |
| **변경 이력·감사** | Placeholder (`/governance/history`) | 낮 |
| **개선과제** | Placeholder (`/governance/improvements`) | 낮 |

### 4.4 백로그 (PLAN.md 향후 계획)

- **L3/L4 ↔ 조직 매핑**: 조직코드 직접 매핑 → **역할마스터(역할코드) 경유** 구조 전환
  - `role` · `organization` · `task_role_mapping` 스키마 정리
  - 기존 Scope/Variant·조직 필터 마이그레이션
  - 운영 지식그래프 `PERFORMED_BY` 등 엣지 정합

---

## 5. 온톨로지 관련 과제

> **참조:** `docs/ontology_v1.md` — Domain Ontology v1 검토안 (구현 전)  
> **핵심 결론:** PAMS는 이미 관계형 DB + 운영 지식그래프 형태의 **경량 시맨틱 모델(60~70%)** 을 갖춤. OWL/RDF 전환보다 **기존 3-Layer + 지식그래프를 온톨로지 관점으로 정식화·확장** 권장.

### 5.1 현재 온톨로지 대응 상태 (As-Is)

| Ontology Class / Property | PAMS 구현 | 상태 |
|---------------------------|----------|:----:|
| Process (L1~L4), VariantProcess | `process_node`, Scope/Variant | ✅ |
| E2EProcess | `e2e_process` | ✅ |
| Task | L4 + `task_attribute` | ✅ |
| BpmnModel | `bpmn_model` | ✅ |
| ApplicationSystem, SystemScreen | 시스템 마스터 | ✅ |
| DataTable (참조) | `task_data_table_link` + 외부 API | ✅ |
| contains, precedes, variantOf | 운영그래프 + BPMN 동기화 | ✅ |
| usesScreen, readsTable, writesTable | 운영그래프 EdgeKind | ✅ |
| orchestrates (E2E→L3) | E2E BPMN Call Activity | ✅ |
| i18n (rdfs:label 대응) | `*_i18n` 테이블 | ✅ |
| **Organization** | 조직 마스터 (HR sync) | ✅ (그래프 미연동) |
| **Role, performs** | 역할 마스터 + RACI | ✅ (그래프 미연동) |
| **KPI, Control, Risk** | DDL만 | 📋 |
| **Document, documentedBy** | DDL만 | 📋 |
| **GlossaryTerm (SKOS)** | — | — |

### 5.2 공백 분석 (Gap) — 남은 온톨로지 과제

| 공백 | 설명 | 우선순위 |
|------|------|:--------:|
| **형식 스키마 부재** | OWL/RDF/SKOS 공개 정의 없음 | A |
| **관계 제약 미정의** | domain/range, inverseOf, transitive axiom 없음 | A |
| **용어·동의어 관리 없음** | skos:exactMatch, broader/narrower 미관리 | A |
| **그래프 확장 blocked** | ORG/ROLE/KPI 노드·PERFORMS/ACCOUNTABLE 엣지 미반영 | **필수** |
| **추론 엔진 없음** | SQL/BFS만 — semantic inference 미지원 | B |
| **Semantic Export Layer 없음** | RDF/JSON-LD export, Graph Sync | B |
| **외부 표준 연계 없음** | BPMN semantics, COBIT/ISO 매핑 | C |
| **Publish 정책 미정** | DRAFT vs PUBLISHED 그래프 포함 여부 | A |

### 5.3 온톨로지 적용 로드맵 (권장 순서)

```
Level A (개념 정식화, 4~8주)          ← ★ 1단계 권장
    → Layer C 완성 (KPI·문서 등)
    → Level B (Semantic Export Layer)
    → Level C (OWL + Reasoner, ROI 명확할 때만)
```

#### Phase 0 — 즉시 (워크숍·의사결정)

- [ ] 1차 Use Case 확정: **영향도 / 검색 / AI / 감사** 중 1~2개
- [ ] Level A/B/C **어디까지** 갈지 결정
- [ ] Ontology Owner · Data Steward **담당자** 지정
- [ ] Publish 정책 (DRAFT vs PUBLISHED in graph) 결정

#### Phase 1 — Level A (개념 정식화, 4주)

- [ ] `types/operations-graph.ts` → Domain Ontology v1 **공식 TS projection** 승격
- [ ] GraphEdgeKind 확장안 승인: `PERFORMS`, `ACCOUNTABLE`, `MEASURES`, `CONTROLS`, `DOCUMENTED_BY`
- [ ] GraphNodeKind 확장: `ORG`, `ROLE`, `KPI` (Layer C 완성 후)
- [ ] Glossary 핵심 50~200 용어 목록 초안 (ko/en/zh-TW)
- [ ] Class/Property 표 · 관계 카탈로그 · 데이터 품질 규칙 문서화
- [ ] URI 식별자 체계 확정 (`pams:process/{code}`, `pams:org/{orgCode}` 등)

#### Phase 2 — Layer C + 그래프 통합 (4~6주, PLAN Phase 4~5와 병행)

- [ ] RACI·조직 데이터 → 운영 지식그래프 **ORG/ROLE 노드·PERFORMS 엣지** 반영
- [ ] KPI/리스크/통제 Placeholder **구현** → `MEASURES`, `CONTROLS` 엣지
- [ ] **영향도 API** ↔ `operations-graph.service` 통합 설계·구현 (UC-01)
- [ ] 데이터 품질 규칙 자동 경고 (미연결 Task, 순환 선행 등)
- [ ] L4 100% task_attribute, L4 80% RACI 등 품질 목표 달성

#### Phase 3 — Level B Semantic Layer (4~8주)

- [ ] `lib/ontology/*` 신규 — Domain Ontology v1 정의
- [ ] `lib/services/impact-analysis.service.ts` — 다단계 경로 질의
- [ ] `lib/services/semantic-search.service.ts` — Glossary + Graph Query (UC-03)
- [ ] RDF/JSON-LD Export Pipeline (MSSQL SSOT 유지)
- [ ] Graph Sync PoC (MSSQL materialized graph 또는 Neo4j PoC)
- [ ] AI RAG context용 ontology-aware 응답 (UC-04)

#### Phase 4 — Level C (선택, 16주+)

- [ ] OWL 2 + Reasoner — 순환 선행·스키마 위반 자동 검출 (UC-05)
- [ ] PROV-O (변경 이력), SKOS formalize
- [ ] BPMN semantics, ERP 카탈로그 외부 표준 import

### 5.4 온톨로지 1차 Use Case (추천)

> **「ERP 테이블 변경 시 → 연결 Task → L3 프로세스 → E2E → 담당 조직」** 경로를 한 번의 그래프 질의로 제공

- PRD 6.2.4 데이터 영향도 분석과 동일
- 이미 구현된 운영 지식그래프(`/analysis/operations-graph`) + READS_TABLE/WRITES_TABLE 엣지 기반
- **남은 작업:** 영향도 분석 화면 구현 + ORG/ROLE 노드 연동 + Excel/알림

### 5.5 PAMS PLAN과 온톨로지 정렬

| PAMS PLAN | 온톨로지 | 관계 |
|-----------|---------|------|
| Phase 4 KPI/문서 미완 | Layer C Class 완성 | 그래프 확장 blocked 해소 |
| Phase 5 영향도·검색 미완 | Level A Phase 2 | **병행 가능** |
| Phase 5 운영 지식그래프 ✅ | Ontology TS projection | 확장 기반 확보 |
| Phase 3 AI (미래) | Level B Semantic Layer | RAG context |

---

## 6. 마이그레이션 현황

| 번호 | 내용 | Phase |
|------|------|-------|
| 001~011 | Layer A/B/C 기본, i18n, 에러코드 | 0~4 |
| 012~016 | 공통코드, 시스템 스코프 | 4 |
| 017 | organization HR sync, system type | 4 |
| 018~019 | Scope/Variant, hybrid scope | 2 |
| 020~021 | common code key, screen module | 4 |
| 022 | Call Activity | 3 |
| 023 | Task-System 2-tier | 4 |
| 024 | error E406 | 0 |
| 025 | E2E process | 7 |
| 026 | organization cost center | 4 |
| 027 | BPMN Send/Receive Task | 3 |
| 028 | RACI role-only | 4 |
| 029 | system catalog perf indexes | 4 |

---

## 7. 권장 다음 작업 (우선순위)

1. **데이터 영향도 분석** (`/data/impact`) — 온톨로지 UC-01, 운영그래프 활용
2. **운영 지식그래프 ORG/ROLE 노드 확장** — RACI·조직 데이터 그래프 반영
3. **KPI/리스크/통제·문서** Layer C Placeholder 구현
4. **통합 검색** — 다국어 + Glossary 기초
5. **대시보드 실데이터** 연동
6. **온톨로지 Level A** — GraphEdgeKind 확장안 워크숍·Glossary 초안
7. **Supabase Auth** — 운영 전 필수

---

## 8. 참고 문서

| 문서 | 용도 |
|------|------|
| `docs/PRD.md` | 제품 요구사항, §14.7 구현 현황 |
| `docs/PLAN.md` | Phase별 개발 계획 (2026-06-23 갱신) |
| `docs/ontology_v1.md` | Domain Ontology v1 검토·로드맵 |
| `docs/mockup/pams-fidelity-mockup.html` | UI 피델리티 목업 |
| `types/operations-graph.ts` | 현재 그래프 스키마 (온톨로지 projection 기준) |
| `.cursor/rules/project-rules.mdc` | 개발 규칙 |
| `.cursor/rules/design-system.mdc` | 디자인 시스템 |

---

*본 문서는 2026-06-25 시점 개발 현황 스냅샷입니다. PLAN.md·PRD §14.7은 6/16 기준이므로, 본 문서의 §3.7(최근 개발)이 그 이후 변경을 반영합니다.*
