# PAMS (Process Architecture Management System)

Next.js 16 + TypeScript + Tailwind CSS + Shadcn/ui + next-intl

## Getting Started

```bash
cd pams
npm install
npm run dev
```

- 기본 URL: [http://localhost:3000/ko/dashboard](http://localhost:3000/ko/dashboard)
- 지원 locale: `ko` (기본), `en`, `zh-TW`

## 데이터베이스

`.env.local`에 MSSQL 연결 정보를 설정한 뒤:

```bash
npm run db:test      # 연결 테스트
npm run db:migrate   # DDL 마이그레이션 실행
```

- 헬스체크 API: `GET /api/health/db`
- 마이그레이션 SQL: `scripts/migrations/` (Layer A → B → C → i18n → error_code)

## Phase 0 진행 상태

- [x] Day 1-2: 프로젝트 초기화, Shadcn/ui, next-intl
- [x] Day 3-4: MSSQL 연결 및 DDL
- [ ] Day 5: 인증 (홀딩)
- [x] Day 5-6: TanStack Query, API 클라이언트, 서비스 레이어

## Phase 1 진행 상태

- [x] Day 1-2: 공통 레이아웃 (Header/Sidebar), 타입 정의
- [x] Day 3-4: API 기반 구조, 에러 핸들링, 공통 훅
- [x] Day 5: 공통 UI 컴포넌트

## Phase 2 진행 상태

- [x] Week 3: 프로세스 트리, API CRUD, 다국어, ProcessForm/Detail
- [x] Week 4: 버전 이력/비교, 승인 워크플로우

## Phase 3 진행 상태

- [x] Week 5: bpmn.js 에디터, XML/SVG 저장·로드, Task-L4 프로세스 연결
- [x] Week 6: BPMN 버전 비교, 모델 목록 CRUD

상세 계획은 [`../docs/PLAN.md`](../docs/PLAN.md), 요구사항은 [`../docs/PRD.md`](../docs/PRD.md) 참조.
