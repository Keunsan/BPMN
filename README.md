# PAMS (Process Architecture Management System)

전사 업무 아키텍처(L1~L4), BPMN, E2E 프로세스, 운영 메타데이터를 통합하는 엔터프라이즈 플랫폼.

| 항목 | 내용 |
|------|------|
| **기술 스택** | Next.js 16, TypeScript, Tailwind, Shadcn/ui, MSSQL 2017, bpmn.js, next-intl, TanStack Query |
| **문서** | [PRD](docs/PRD.md) · [개발 계획](docs/PLAN.md) |
| **locale** | `ko`(기본) · `en` · `zh-TW` |

---

## 시작하기

```bash
npm install
npm run dev          # http://localhost:3000/ko/dashboard
npm run db:test      # MSSQL 연결
npm run db:migrate   # DDL (scripts/migrations/, 25개)
```

`.env.local`에 MSSQL 연결 정보 필요. 헬스체크: `GET /api/health/db`

| 명령 | 설명 |
|------|------|
| `npm run dev` / `build` / `lint` | 개발·빌드·린트 |
| `npm run db:test` / `db:migrate` | DB 연결·마이그레이션 |

---

## 개발 진행 현황 (2026-06-16)

> **현재: Phase 4~5 진행** — Layer C 핵심·운영지식그래프·E2E 완료, 분석·거버넌스 잔여

| Phase | 영역 | 상태 |
|-------|------|------|
| **0** | Next.js·i18n·MSSQL·Query/Service/Zustand | ✅ |
| **0** | Supabase Auth | ⏸️ 쿠키 세션 stub (`lib/auth/`, `LoginForm`) |
| **1** | 레이아웃·API·에러·공통 UI·MultiLangInput | ✅ |
| **2** | L1~L4 트리·CRUD·승인·버전·다국어 | ✅ |
| **2+** | Scope/Variant·표준/변형 비교 (`018`~`019`) | ✅ |
| **3** | BPMN 에디터·버전비교·Task↔L4·Call Activity↔L3 (`022`) | ✅ |
| **3+** | BPMN→`task_predecessor` 동기화 | ✅ |
| **4** | Task 속성·선행 프로세스 | ✅ |
| **4** | 시스템 마스터·태스크-시스템(2-tier 화면)·외부API·공통코드 | ✅ |
| **4** | 외부 테이블 조회·태스크-데이터 연결 | ✅ |
| **4** | RACI / KPI·리스크·통제 / 문서 / 조직·역할 마스터 | 📋 Placeholder |
| **5** | **운영 지식그래프** (`/analysis/operations-graph`) | ✅ |
| **5** | 대시보드·영향도·통합검색·히트맵·내보내기 | 📋 |
| **7** | **E2E 프로세스 카탈로그**·E2E BPMN·L4 drill-down (`025`) | ✅ |
| **6** | E2E 테스트·성능·배포 | 📋 |

### 주요 구현물

| 도메인 | 컴포넌트·경로 |
|--------|--------------|
| 프로세스 | `ProcessTree`, `ProcessDetail`, `ProcessCompareClient` — `/process` |
| BPMN | `BpmnEditor`, `BpmnModelList`, `BpmnCompareView`, drill-down — `/bpmn` |
| E2E | `E2eProcessListClient`, `E2eBpmnViewerSheet` — `/e2e-process` |
| 메타데이터 | `TaskAttributeForm`, `TaskSystemMapping`, `PredecessorSelect` |
| 데이터 | `ExternalTableBrowser`, `DataTableLink` |
| 분석 | `OperationsGraphWorkspace` — Explorer·Canvas·Inspector |
| 관리 | `SystemMasterManagement`, `CommonCodeManagement`, `ExternalApiSettingsManagement` |
| 거버넌스 | `ApprovalInbox` — `/governance/approvals` |

### API (요약)

| 도메인 | 엔드포인트 |
|--------|-----------|
| 프로세스 | `/api/process`, `.../[nodeId]`, `.../move`, `.../history`, `.../approve`, `.../variant`, `.../variants` |
| BPMN | `/api/bpmn`, `.../[modelId]`, `.../task-link`, `.../duplicate`, `/api/bpmn/compare`, `/api/bpmn/l3/[nodeId]/l4-slice` |
| E2E | `/api/e2e-process`, `.../[id]`, `.../bpmn`, `/tree`, `/by-l3/[nodeId]` |
| 메타데이터 | `/api/metadata/task-attribute`, `/api/metadata/tasks/[nodeId]/systems`, `.../data-tables` |
| 외부·관리 | `/api/external/systems/...`, `/api/admin/systems`, `/api/admin/codes`, `/api/admin/external-api` |
| 분석 | `/api/analysis/operations-graph` |
| 거버넌스 | `/api/governance/approvals` |

---

## 프로젝트 구조

```
app/[locale]/(main)/     process · bpmn · e2e-process · metadata · data · analysis · governance · admin
app/api/                 REST (Route → Service → queries)
components/              common · process · bpmn · e2e-process · metadata · data · analysis · admin · governance
lib/                     db/queries · services · api · query · i18n · external
messages/                ko.json · en.json · zh-TW.json
scripts/migrations/      001~025 DDL
types/                   도메인 타입
```

레이어 규칙: Route → `lib/services/*` → `lib/db/queries/*` · 클라 fetch → `lib/api/client.ts`

---

## 다음 작업

1. **Phase 4 잔여** — RACI UI, KPI/리스크/통제, 문서 연결, 조직·역할 마스터
2. **Phase 5** — 대시보드 실데이터, 영향도·통합검색, Excel/PDF 내보내기
3. **Phase 6** — E2E 테스트, 다국어 검수, 배포
4. **Phase 0** — Supabase Auth 본격 연동

상세: [`docs/PLAN.md`](docs/PLAN.md) · 요구사항: [`docs/PRD.md`](docs/PRD.md)

---

## headroom (로컬 MCP)

pc 재부팅 후 터미널에서
```powershell
$env:HEADROOM_REQUIRE_RUST_CORE = "false"
headroom proxy --port 8787
```

집노트북: `$env:HEADROOM_REQUIRE_RUST_CORE='false'; headroom proxy --port 8787`

상태확인: `Invoke-WebRequest http://127.0.0.1:8787/health -UseBasicParsing`

8787 포트 종료:
```powershell
Get-NetTCPConnection -LocalPort 8787 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```
