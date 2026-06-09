# PAMS (Process Architecture Management System)

전사 업무 아키텍처(L1~L4), BPMN, 운영 메타데이터를 통합하는 엔터프라이즈 플랫폼.

| 항목 | 내용 |
|------|------|
| **기술 스택** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/ui, MSSQL 2017, bpmn.js, next-intl |
| **개발 방식** | Cursor AI + Vibe Coding |
| **MVP 기간** | 12주 (Phase 0~6) |
| **문서** | [PRD](docs/PRD.md) · [개발 계획](docs/PLAN.md) |

---

## 시작하기

```bash
npm install
npm run dev
```

- 기본 URL: [http://localhost:3000/ko/dashboard](http://localhost:3000/ko/dashboard)
- 지원 locale: `ko` (기본), `en`, `zh-TW`

### 데이터베이스

`.env.local`에 MSSQL 연결 정보를 설정한 뒤:

```bash
npm run db:test      # 연결 테스트
npm run db:migrate   # DDL 마이그레이션 실행
```

- 헬스체크 API: `GET /api/health/db`
- 마이그레이션 SQL: `scripts/migrations/` (Layer A → B → C → i18n → error_code, 11개 파일)

### 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint 검사 |
| `npm run db:test` | DB 연결 테스트 |
| `npm run db:migrate` | 마이그레이션 실행 |

---

## 개발 진행 현황

> 기준: 소스 코드 및 [`docs/PLAN.md`](docs/PLAN.md) (2026-06-08)  
> **현재 위치: Phase 4 진행 중** (Layer C 메타데이터 — Task 속성·선행 프로세스 완료, 나머지 예정)

### Phase 0: 환경 설정 (Week 1)

| 항목 | 상태 | 비고 |
|------|------|------|
| Next.js 16, TypeScript strict, Tailwind, Shadcn/ui | ✅ | |
| next-intl 다국어 라우팅 (`app/[locale]/`) | ✅ | ko / en / zh-TW |
| MSSQL 연결·커넥션 풀·마이그레이션 | ✅ | `lib/db/`, `scripts/migrations/` |
| TanStack Query, Zustand, API 클라이언트, 서비스 레이어 | ✅ | `lib/query/`, `lib/api/`, `lib/services/` |
| Supabase Auth | ⏸️ | 홀딩 — `lib/api/auth.ts` stub, 로그인 UI 스켈레톤 |

### Phase 1: 기반 구조 (Week 2) — ✅ 완료

- 공통 레이아웃: `MainShell`, `Header`, `Sidebar`, `LanguageSelector`
- 타입 정의: `types/` (process, bpmn, metadata, external, database, i18n, error)
- API·에러 처리: `ApiResponse<T>`, `ApiError`, 다국어 에러 메시지 (`lib/api/error-handler.ts`)
- 공통 훅: `useApi`, `usePagination`, `useDebounce`, `useLocalStorage`, `useLocale`
- 공통 UI: `DataTable`, `SearchBar`, `StatusBadge`, `ConfirmDialog`, `LoadingSpinner`, `EmptyState`, `ErrorToast`, `MultiLangInput`

### Phase 2: Layer A — 프로세스 계층 (Week 3-4) — ✅ 완료

| 기능 | 구현 |
|------|------|
| L1~L4 프로세스 트리 (DnD, 검색, 컨텍스트 메뉴) | `ProcessTree` |
| 프로세스 CRUD·이동 API | `/api/process`, `/api/process/[nodeId]/move` |
| 다국어 프로세스명 입력·조회 | `ProcessForm`, `MultiLangInput` |
| 프로세스 상세 (기본정보·이력·버전 비교) | `ProcessDetail`, `VersionCompare` |
| 버전 이력 저장·비교 | `/api/process/[nodeId]/history` |
| 승인 워크플로우 (요청·승인/반려·대기함) | `/api/process/[nodeId]/approve`, `ApprovalInbox` |

> `/process/compare` 단독 페이지는 아직 Placeholder (상세 화면 내 버전 비교는 동작)

### Phase 3: Layer B — BPMN 모델링 (Week 5-6) — ✅ 완료

| 기능 | 구현 |
|------|------|
| bpmn.js 에디터 (속성 패널, 미니맵) | `BpmnEditor`, `BpmnEditorPage` |
| BPMN XML·SVG 저장·로드 | `bpmn.service.ts`, `/api/bpmn` |
| Task ↔ L4 프로세스 연결 | `ProcessLinkModal`, `/api/bpmn/[modelId]/task-link` |
| BPMN 버전 비교 | `BpmnCompareView`, `/api/bpmn/compare` |
| 모델 목록 CRUD·복제 | `BpmnModelList`, `/api/bpmn/[modelId]/duplicate` |

### Phase 4: Layer C — 운영 메타데이터 (Week 7-9) — 🔄 진행 중

| 항목 | 상태 | 비고 |
|------|------|------|
| Task 속성 폼 (다국어, 섹션 UI, 자동저장) | ✅ | `TaskAttributeForm`, `/metadata/task-attribute/[nodeId]` |
| Task 속성 API (다국어 CRUD) | ✅ | `/api/metadata/task-attribute` |
| 선행 프로세스 선택 (다중, 순환 참조 방지) | ✅ | `PredecessorSelect`, `metadata.service.ts` |
| 시스템 마스터·태스크-시스템 매핑 | 📋 | 라우트·Placeholder만 (`/admin/systems`, `/metadata/system`) |
| 외부 테이블 조회·데이터 테이블 연결 | 📋 | Placeholder, `lib/external/` 미구현 |
| RACI 매트릭스 | 📋 | Placeholder (`/metadata/raci`) |
| KPI·리스크·통제 연결 | 📋 | Placeholder (`/metadata/kpi-risk`) |
| 문서 연결 (Supabase Storage) | 📋 | 미착수 |

### Phase 5: 분석·검색 (Week 10-11) — 📋 예정

| 항목 | 상태 | 비고 |
|------|------|------|
| 대시보드 (현황 통계·차트) | 🔄 | 기본 레이아웃만 (`/dashboard`), 실데이터·차트 미연동 |
| 영향도 분석 | 📋 | Placeholder (`/analysis/impact`, `/data/impact`) |
| 통합 검색 (다국어) | 📋 | Placeholder (`/analysis/search`) |
| 히트맵 | 📋 | Placeholder (`/analysis/heatmap`) |
| Excel·PDF·이미지보내기 | 📋 | 미착수 |

### Phase 6: 통합 테스트·마무리 (Week 12) — 📋 예정

- E2E 테스트 (Playwright/Cypress)
- 다국어 검수·성능 최적화
- 배포 설정 (CI/CD, 환경변수 정리)

---

## 구현된 주요 API

| 도메인 | 엔드포인트 |
|--------|-----------|
| 헬스체크 | `GET /api/health/db` |
| 프로세스 | `GET/POST /api/process`, `GET/PUT/DELETE /api/process/[nodeId]`, `PUT .../move`, `.../history`, `.../approve` |
| BPMN | `GET/POST /api/bpmn`, `GET/PUT/DELETE /api/bpmn/[modelId]`, `.../task-link`, `.../duplicate`, `GET /api/bpmn/compare` |
| 메타데이터 | `GET/POST /api/metadata/task-attribute`, `GET/PUT /api/metadata/task-attribute/[nodeId]` |
| 거버넌스 | `GET/PUT /api/governance/approvals` |

---

## 프로젝트 구조 (요약)

```
app/
├── [locale]/(auth)/login/          # 로그인 (스켈레톤)
├── [locale]/(main)/                # 메인 앱 (process, bpmn, metadata, …)
└── api/                            # REST API
components/
├── common/                         # 공통 UI·레이아웃
├── process/                        # 프로세스 트리·폼·상세
├── bpmn/                           # BPMN 에디터·목록·비교
├── metadata/                       # Task 속성·선행 프로세스
└── governance/                     # 승인 대기함
lib/
├── db/queries/                     # MSSQL 쿼리
├── services/                       # 비즈니스 로직
├── api/                            # 클라이언트·에러 처리
├── query/                          # TanStack Query
└── i18n/                           # next-intl 설정
messages/                           # ko.json, en.json, zh-TW.json
scripts/migrations/                 # DB DDL
types/                              # 도메인 타입
```

---

## 다음 작업 (PLAN.md 기준)

1. **Phase 4 잔여** — 시스템 마스터, 외부 테이블 연동(`lib/external/`), RACI, KPI/리스크/통제, 문서 연결
2. **Phase 5** — 영향도 분석, 다국어 통합 검색, 대시보드 위젯·차트, 데이터보내기
3. **Phase 6** — E2E·다국어 검수·성능·배포
4. **Phase 0 보류** — Supabase Auth 연동 (인증 미들웨어·로그인)

상세 일정·Cursor 프롬프트는 [`docs/PLAN.md`](docs/PLAN.md), 기능 요구사항은 [`docs/PRD.md`](docs/PRD.md)를 참조하세요.


headroom 관련
pc 재부팅 후 터미널에서
  $env:HEADROOM_REQUIRE_RUST_CORE = "false"
  headroom proxy --port 8787
그리고 셋팅에서 headmroom mcp 서버 가동

mcp.json - headroom 경로
(집 노트북)
{
  "mcpServers": {
    "headroom": {
      "command": "C:\\Users\\dlzms\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\headroom.exe",
      "args": ["mcp", "serve"],
      "env": {
        "HEADROOM_REQUIRE_RUST_CORE": "false",
        "HEADROOM_PROXY_URL": "http://127.0.0.1:8787"
      }
    }
  }
}

(회사 서브노트북)
{
  "mcpServers": {
    "headroom": {
      "command": "C:\\hr\\venv\\Scripts\\headroom.exe",
      "args": ["mcp", "serve"],
      "env": {
        "HEADROOM_REQUIRE_RUST_CORE": "false",
        "HEADROOM_PROXY_URL": "http://127.0.0.1:8787"
      }
    }
  }
}