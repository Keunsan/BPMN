# PAMS 개발 계획서 (PLAN.md)
## Cursor AI + Vibe Coding 방식 개발 가이드 문서

---

## 📋 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | PAMS (Process Architecture Management System) |
| **개발 방식** | Cursor AI + Vibe Coding |
| **기술 스택** | Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/ui, MSSQL 2017, Supabase, bpmn.js |
| **총 개발 기간** | MVP 3개월 (12주) + E2E/분석 확장 |
| **목표** | 전사 업무 아키텍처와 BPMN, 시스템 운영 메타데이터를 통합하는 플랫폼 구축 |
| **현재 위치** | **Phase 4~5** (2026-06-16) — Layer C 핵심·운영지식그래프·E2E 완료 |

---

## ✅ 구현 현황 요약 (2026-06-16)

| Phase | 완료 | 미완 |
|-------|------|------|
| **0** | Next.js·i18n·MSSQL(025)·Query/Service | Supabase Auth ⏸️ |
| **1** | 레이아웃·API·에러·공통 UI | |
| **2** | L1~L4·승인·버전·Scope/Variant·표준/변형 비교 | |
| **3** | BPMN·Call Activity·선행 동기화·버전비교 | |
| **4** | Task속성·선행·시스템(2-tier)·외부테이블·데이터연결·시스템/외부API/공통코드 마스터 | RACI·KPI/리스크·문서·조직/역할 |
| **5** | **운영 지식그래프** | 대시·영향도·검색·히트맵·내보내기 |
| **7** | **E2E 카탈로그·E2E BPMN·drill-down** | |
| **6** | — | E2E테스트·성능·배포 |

**마이그레이션**: `scripts/migrations/001`~`025` · **주요 추가**: `018` Scope/Variant · `022` Call Activity · `023` Task-System 2-tier · `025` E2E

---

## 🎯 Vibe Coding 원칙

### Cursor AI 활용 전략

1. **Composer 모드 활용**: 여러 파일 동시 생성/수정 시 사용
2. **Chat 모드 활용**: 코드 리뷰, 디버깅, 개념 설명 시 사용
3. **인라인 편집**: 간단한 수정 시 `Cmd/Ctrl + K` 활용
4. **컨텍스트 제공**: `@file`, `@folder`, `@codebase` 적극 활용

### 프롬프트 작성 원칙

```
1. 구체적인 요구사항 명시
2. 기존 코드 패턴 참조 지시
3. TypeScript strict 모드 준수 요청
4. 에러 핸들링 포함 요청 (PRD 섹션 9 참조) ⭐
5. 다국어 지원 포함 요청 (PRD 섹션 10 참조) ⭐
6. 한국어 주석 작성 요청
```

---

## 🗂️ 개발 Phase 구조

```
Phase 0: 환경 설정 (Week 1) ✅
    ↓
Phase 1: 기반 구조 (Week 2) ✅
    ↓
Phase 2: Layer A — 프로세스 계층 (Week 3-4) ✅ (+ Scope/Variant)
    ↓
Phase 3: Layer B — BPMN (Week 5-6) ✅ (+ Call Activity)
    ↓
Phase 4: Layer C — 메타데이터 (Week 7-9) 🔄 (핵심 완료, RACI/KPI/문서 잔여)
    ↓
Phase 5: 분석/검색 (Week 10-11) 🔄 (운영지식그래프 ✅, 나머지 📋)
    ↓
Phase 7: E2E 프로세스 카탈로그 (2026-06) ✅
    ↓
Phase 6: 통합 테스트·마무리 (Week 12) 📋
```

---

## 📅 상세 개발 계획

### Phase 0: 환경 설정 (Week 1)

#### Day 1-2: 프로젝트 초기화

**Cursor Prompt 1: 프로젝트 생성**
```
Next.js 16 App Router 프로젝트를 생성해줘.
- TypeScript strict 모드
- Tailwind CSS
- ESLint 설정
- 절대 경로 설정 (@/)
- 폴더 구조는 PRD의 8.3 프로젝트 구조 참조
- 다국어 라우팅 구조 ([locale] 폴더) 포함 ⭐

프로젝트명: pams
```

**Cursor Prompt 2: Shadcn/ui 설정**
```
Shadcn/ui를 설치하고 다음 컴포넌트들을 추가해줘:
- Button, Input, Select, Textarea
- Dialog, Sheet, Tabs
- Table, Card, Badge
- Form (react-hook-form + zod)
- Toast, Dropdown-menu
- Tree (커스텀 필요)
```

**Cursor Prompt 2-1: 다국어(i18n) 설정 ⭐ 신규**
```
next-intl을 설치하고 다국어 환경을 설정해줘.

지원 언어:
- ko (한국어) - 기본 언어
- en (영어)
- zh-TW (대만 번체)

설정 파일:
- lib/i18n/config.ts: 언어 설정, 기본 언어, 날짜/숫자 형식
- middleware.ts: 다국어 라우팅 미들웨어
- messages/ko.json, en.json, zh-TW.json: 정적 번역 파일

PRD 섹션 10.3 참조
```

**체크리스트:**
- [ ] Next.js 16 프로젝트 생성
- [ ] TypeScript strict 모드 설정
- [ ] Tailwind CSS 설정
- [ ] Shadcn/ui 설치 및 컴포넌트 추가
- [ ] ESLint 설정 (Next.js + TypeScript 규칙)
- [ ] 절대 경로 설정 확인
- [ ] **next-intl 설치 및 다국어 라우팅 설정** ⭐
- [ ] **번역 파일 기본 구조 생성** ⭐

#### Day 3-4: 데이터베이스 설정

**Cursor Prompt 3: MSSQL 연결 설정**
```
@lib/db 폴더에 MSSQL 2017 연결 설정을 만들어줘.
- mssql 패키지 사용
- 커넥션 풀 설정
- 환경변수 기반 설정 (.env.local)
- 타입 안전한 쿼리 헬퍼 함수
- 트랜잭션 지원
```

**Cursor Prompt 4: DDL 실행**
```
PRD 5.2 섹션의 DDL을 참조해서 데이터베이스 마이그레이션 스크립트를 만들어줘.
- scripts/migrations 폴더 생성
- 순서대로 실행 가능한 SQL 파일들
- Layer A → B → C 순서로 생성
- 다국어 테이블 (process_node_i18n, task_attribute_i18n 등) 포함 ⭐
- 에러 코드 테이블 (error_code, error_code_i18n) 포함 ⭐
```

**체크리스트:**
- [ ] mssql 패키지 설치
- [ ] 데이터베이스 연결 설정
- [ ] 커넥션 풀 테스트
- [ ] DDL 스크립트 생성
- [ ] 테이블 생성 확인
- [ ] **다국어 테이블 생성 확인** ⭐
- [ ] **에러 코드 테이블 생성 및 초기 데이터 입력** ⭐

#### Day 5: Supabase 및 인증 설정

**Cursor Prompt 5: Supabase 인증**
```
Supabase Auth를 설정해줘.
- @supabase/supabase-js, @supabase/ssr 설치
- lib/supabase/client.ts (브라우저용)
- lib/supabase/server.ts (서버 컴포넌트용)
- middleware.ts (세션 관리) - 다국어 미들웨어와 통합 ⭐
- 이메일/비밀번호 로그인
```

**체크리스트:**
- [ ] Supabase 프로젝트 생성
- [ ] 클라이언트/서버 설정
- [ ] 미들웨어 설정
- [ ] 로그인/로그아웃 테스트

#### Day 5-6: 아키텍처 기반 설정 ⭐ 신규

**Cursor Prompt 5-1: 상태 관리 설정**
```
TanStack Query v5와 Zustand를 설치하고 기본 설정을 만들어줘.

1. lib/query/client.ts
   - QueryClient 인스턴스 생성
   - 기본 staleTime: 5분
   - retry: 1회
   - refetchOnWindowFocus: false (개발 중)

2. lib/query/keys.ts
   - 도메인별 쿼리 키 팩토리 (processKeys, bpmnKeys, metadataKeys)
   - PRD 8.1.1 쿼리 키 컨벤션 참조

3. lib/store/ui.store.ts
   - sidebarOpen: boolean
   - currentLocale: Locale

4. app/providers.tsx
   - QueryClientProvider 래핑
   - 에러 바운더리 설정
```

**Cursor Prompt 5-2: API 클라이언트 베이스**
```
@lib/api/client.ts 공통 API 클라이언트를 만들어줘.

요구사항:
- fetch 래퍼 함수 (apiClient)
- 요청 헤더에 Accept-Language 자동 추가 (현재 locale)
- 응답을 ApiResponse<T> 타입으로 변환
- 에러 응답을 ApiError 클래스로 변환
- 401 시 로그인 페이지로 리다이렉트
- 타임아웃 설정 (30초)

PRD 섹션 9.1 응답 형식 참조
```

**Cursor Prompt 5-3: 서비스 레이어 템플릿**
```
@lib/services 폴더에 비즈니스 로직 레이어 템플릿을 만들어줘.

예시: lib/services/process.service.ts
- 프로세스 생성 시 코드 중복 체크
- 상태 변경 시 권한 검증
- 삭제 시 하위 노드 존재 여부 체크
- 트랜잭션 처리

규칙:
- DB 쿼리는 lib/db/queries/*.ts 호출
- 외부 시스템 연동은 lib/external/*.ts 호출
- 순수 비즈니스 로직만 이 레이어에 작성
- 에러는 ApiError 클래스로 throw
```

**체크리스트:**
- [ ] TanStack Query 설치 및 QueryClient 설정
- [ ] Zustand 설치 및 스토어 설정
- [ ] API 클라이언트 베이스 생성
- [ ] 서비스 레이어 템플릿 생성
- [ ] Providers 컴포넌트 설정

---

### Phase 1: 기반 구조 (Week 2)

#### Day 1-2: 공통 레이아웃

**Cursor Prompt 6: 레이아웃 구조**
```
@app/[locale] 폴더에 다음 레이아웃 구조를 만들어줘.

1. (auth) 그룹: 로그인 페이지
2. (main) 그룹: 메인 애플리케이션
   - layout.tsx: Header + Sidebar + Main 구조
   - Header: 로고, 검색, 언어 선택, 사용자 메뉴 ⭐
   - Sidebar: PRD 6.1 메뉴 구조 참조 (다국어 메뉴명)

반응형 디자인 적용, 사이드바 토글 가능
언어 선택 드롭다운 (한국어/English/繁體中文) 포함 ⭐
```

**Cursor Prompt 6-1: 언어 선택 컴포넌트 ⭐ 신규**
```
@components/common/LanguageSelector.tsx를 만들어줘.

요구사항:
- 현재 선택된 언어 표시
- 드롭다운으로 언어 목록 표시 (한국어, English, 繁體中文)
- 언어 변경 시 URL 업데이트 및 페이지 새로고침 없이 전환
- next-intl의 useRouter, usePathname 활용
```

**Cursor Prompt 7: 타입 정의**
```
@types 폴더에 PRD 8.4의 TypeScript 타입을 모두 정의해줘.
- process.ts: ProcessNode, ProcessLevel, ProcessStatus
- bpmn.ts: BpmnModel, BpmnElement
- metadata.ts: TaskAttribute, TaskPredecessor, TaskDataTableLink
- external.ts: ExternalTable, ExternalColumn
- database.ts: 공통 DB 타입
- i18n.ts: 다국어 관련 타입 (Locale, I18nRecord 등) ⭐
- error.ts: 에러 관련 타입 (ApiError, ErrorCode 등) ⭐
```

**체크리스트:**
- [ ] 레이아웃 구조 완성
- [ ] Header 컴포넌트 (언어 선택 포함) ⭐
- [ ] Sidebar 컴포넌트 (다국어 메뉴명)
- [ ] 타입 정의 파일 생성
- [ ] 반응형 테스트
- [ ] **언어 전환 테스트** ⭐

#### Day 3-4: API 기반 구조 및 에러 핸들링 ⭐ 보강

**Cursor Prompt 8: API 라우트 구조 및 에러 핸들링**
```
@app/api 폴더에 RESTful API 라우트 기반 구조를 만들어줘.

각 도메인별로:
- route.ts (GET, POST)
- [id]/route.ts (GET, PUT, DELETE)

공통 패턴:
- 응답 형식 통일 (ApiResponse<T>) - PRD 섹션 9.1 참조 ⭐
- 에러 핸들링 유틸리티 - PRD 섹션 9.2~9.5 참조 ⭐
- 인증 체크 유틸리티
- 페이지네이션 지원
- 다국어 에러 메시지 반환 ⭐
```

**Cursor Prompt 8-1: 에러 핸들링 유틸리티 ⭐ 신규**
```
@lib/api/error-handler.ts 에러 핸들링 유틸리티를 만들어줘.

PRD 섹션 9 참조:

1. ApiError 클래스
   - code, message, status, details, field, traceId 속성
   - isRetryable, isAuthError, isPermissionError 게터

2. createErrorResponse 함수
   - 에러 코드와 locale을 받아 다국어 에러 응답 생성
   - DB에서 에러 메시지 조회 또는 기본 메시지 사용

3. getErrorMessage 함수
   - 에러 코드와 locale로 다국어 메시지 조회

4. generateTraceId 함수
   - 고유 추적 ID 생성 (로그 연계용)
```

**Cursor Prompt 9: 공통 훅 생성**
```
@hooks 폴더에 데이터 fetching을 위한 커스텀 훅을 만들어줘.
- useApi: 기본 API 호출 훅 (에러 핸들링 포함) ⭐
- usePagination: 페이지네이션 훅
- useDebounce: 검색 디바운스
- useLocalStorage: 로컬 저장소
- useLocale: 현재 locale 및 번역 함수 ⭐

SWR 또는 TanStack Query 사용
에러 발생 시 Toast 자동 표시 ⭐
```

**체크리스트:**
- [ ] API 응답 타입 정의
- [ ] **에러 핸들링 유틸리티** ⭐
- [ ] **에러 코드별 다국어 메시지 조회** ⭐
- [ ] 인증 미들웨어
- [ ] 공통 훅 생성
- [ ] API 테스트 (Postman/Insomnia)

#### Day 5: 공통 컴포넌트

**Cursor Prompt 10: 공통 UI 컴포넌트**
```
@components/common 폴더에 공통 컴포넌트를 만들어줘.

1. DataTable: 정렬, 필터, 페이지네이션 지원
2. SearchBar: 통합 검색바
3. StatusBadge: 상태 표시 배지 (다국어 상태명) ⭐
4. ConfirmDialog: 확인 다이얼로그 (다국어 메시지) ⭐
5. LoadingSpinner: 로딩 인디케이터
6. EmptyState: 데이터 없음 상태 (다국어 메시지) ⭐
7. ErrorToast: 에러 Toast 컴포넌트 (재시도 버튼 포함) ⭐

Shadcn/ui 기반으로 확장
모든 텍스트는 useTranslations 훅 사용 ⭐
```

**체크리스트:**
- [ ] DataTable 컴포넌트
- [ ] SearchBar 컴포넌트
- [ ] StatusBadge 컴포넌트 (다국어)
- [ ] **ErrorToast 컴포넌트** ⭐
- [ ] 기타 공통 컴포넌트
- [ ] Storybook 설정 (선택)

---

### Phase 2: Layer A - 프로세스 계층 관리 (Week 3-4)

#### Week 3, Day 1-2: 프로세스 트리

**Cursor Prompt 11: 프로세스 트리 컴포넌트**
```
@components/process/ProcessTree.tsx를 만들어줘.

요구사항:
- L1~L4 계층 구조 표시
- 노드 확장/축소
- Drag & Drop 이동 지원
- 노드 선택 시 상세 정보 표시
- 컨텍스트 메뉴 (추가, 수정, 삭제)
- 레벨별 아이콘/색상 구분
- 검색 및 필터링
- 현재 locale에 맞는 프로세스명 표시 ⭐

react-arborist 또는 @dnd-kit 사용 고려
```

**Cursor Prompt 12: 프로세스 API (다국어 포함)**
```
@app/api/process/route.ts를 만들어줘.

엔드포인트:
- GET /api/process: 전체 트리 조회 (계층 구조, 다국어 지원) ⭐
- GET /api/process/[nodeId]: 노드 상세 (다국어 지원) ⭐
- POST /api/process: 노드 생성 (코드 자동생성, 다국어 데이터 저장) ⭐
- PUT /api/process/[nodeId]: 노드 수정 (다국어 데이터 수정) ⭐
- DELETE /api/process/[nodeId]: 노드 삭제 (하위 체크)
- PUT /api/process/[nodeId]/move: 노드 이동

코드 자동생성 로직: 상위코드 + 순번
요청 헤더의 Accept-Language로 locale 판단 ⭐
에러 발생 시 PRD 섹션 9.2 에러 코드 사용 ⭐
```

**체크리스트:**
- [ ] 트리 컴포넌트 구현
- [ ] Drag & Drop 기능
- [ ] 프로세스 API CRUD
- [ ] **다국어 프로세스명 조회/저장** ⭐
- [ ] 코드 자동생성 로직
- [ ] 상태 관리 (Draft → Published)
- [ ] **에러 핸들링 (E302, E304, E401 등)** ⭐

#### Week 3, Day 3-5: 프로세스 상세/등록 (다국어 입력)

**Cursor Prompt 13: 프로세스 폼 (다국어 입력)**
```
@components/process/ProcessForm.tsx를 만들어줘.

필드 (PRD 4.2.1 참조):
- 코드 (자동/수동)
- 명칭 (필수) - 다국어 탭 입력 UI ⭐
- 설명 (Rich Text Editor) - 다국어 탭 입력 UI ⭐
- 상태 (Select)
- 버전
- 유효기간 (시작/종료)
- 책임 조직 (조직 선택)
- 표준/변형 여부

다국어 입력 UI:
- [한국어] [English] [繁體中文] 탭으로 전환
- 한국어는 필수, 나머지는 선택
- 입력되지 않은 언어는 기본 언어(한국어) 값 사용

react-hook-form + zod 유효성 검증
```

**Cursor Prompt 13-1: 다국어 입력 컴포넌트 ⭐ 신규**
```
@components/common/MultiLangInput.tsx 다국어 입력 컴포넌트를 만들어줘.

Props:
- name: 필드명
- label: 라벨 (번역 키)
- required: 필수 여부
- multiline: 여러 줄 입력 여부
- onChange: 값 변경 콜백

기능:
- 탭으로 언어 전환 (한국어/English/繁體中文)
- 한국어 탭에 * 표시 (필수)
- 각 언어별 입력값 관리
- 유효성 검증 (한국어 필수)

사용 예:
<MultiLangInput 
  name="processName" 
  label="process.name"
  required 
/>
```

**Cursor Prompt 14: 프로세스 상세 화면**
```
@app/[locale]/(main)/process/[nodeId]/page.tsx를 만들어줘.

레이아웃 (PRD 6.2.1 참조):
- 좌측: 프로세스 트리
- 우측: 상세 정보 탭
  - 기본정보 탭 (다국어 표시)
  - Task 속성 탭
  - 시스템 연결 탭
  - 데이터 연결 탭
  - RACI 탭
  - 이력 탭

서버 컴포넌트 + 클라이언트 컴포넌트 분리
현재 locale에 맞는 데이터 표시 ⭐
```

**체크리스트:**
- [ ] 프로세스 폼 컴포넌트
- [ ] **다국어 입력 UI (MultiLangInput)** ⭐
- [ ] 유효성 검증 (한국어 필수)
- [ ] 프로세스 상세 페이지
- [ ] 탭 구조 구현
- [ ] 버전 이력 조회

#### Week 4, Day 1-3: 버전 관리

**Cursor Prompt 15: 버전 관리 기능**
```
버전 관리 기능을 구현해줘.

요구사항:
- 버전 형식: Major.Minor.Patch
- 변경 시 자동 버전업 (Minor++)
- 상태 변경 시 버전업 규칙 적용
- 버전 이력 테이블 저장
- 이전 버전 조회 기능
- 버전 간 비교 UI

process_node_history 테이블 활용
```

**체크리스트:**
- [ ] 버전 자동 부여 로직
- [ ] 버전 이력 저장
- [ ] 이전 버전 조회
- [ ] 버전 비교 UI

#### Week 4, Day 4-5: 승인 워크플로우

**Cursor Prompt 16: 승인 워크플로우**
```
승인 워크플로우 기능을 구현해줘.

상태 전이: DRAFT → IN_REVIEW → APPROVED → PUBLISHED

요구사항:
- 승인 요청 API
- 승인/반려 처리 API  
- 승인 대기 목록 화면
- 알림 기능 (선택)
- Level별 승인 권한 (L1/L2는 Architect 필수)
- 승인 거부 시 사유 입력 (다국어 가능) ⭐
- 필수 속성 미입력 시 E405 에러 반환 ⭐

approval_request, approval_history 테이블 활용
```

**체크리스트:**
- [ ] 승인 요청 기능
- [ ] 승인/반려 처리
- [ ] 승인 대기함 화면
- [ ] 권한 체크 로직
- [ ] **필수 속성 검증 (E405)** ⭐

#### Week 4, Day 5 (추가): 중간 리팩토링 ⭐ 신규

**Cursor Prompt: Phase 2 코드 정리**
```
@app @components @lib Phase 2에서 생성된 코드를 점검하고 리팩토링해줘.

점검 항목:
1. 상태 관리 패턴 통일
   - useState로 서버 데이터 관리하는 코드 → TanStack Query로 변환
   - 중복 상태 → 공유 상태로 통합

2. API 호출 패턴 통일
   - 직접 fetch 호출 → apiClient 함수 사용
   - 에러 처리 누락 → try-catch + ApiError

3. 코드 중복 제거
   - 유사한 컴포넌트 → 공통 컴포넌트 추출
   - 반복 로직 → 커스텀 훅 추출

4. 타입 안전성
   - any 사용 제거
   - 타입 단언(as) 최소화
```

**체크리스트:**
- [ ] 모든 서버 데이터가 TanStack Query로 관리되는가?
- [ ] 모든 API 호출이 apiClient를 사용하는가?
- [ ] 중복 컴포넌트가 통합되었는가?
- [ ] TypeScript any가 제거되었는가?

---

### Phase 3: Layer B - BPMN 모델링 (Week 5-6)

#### Week 5, Day 1-3: BPMN 에디터 통합

**Cursor Prompt 17: BPMN 에디터**
```
@components/bpmn/BpmnEditor.tsx를 만들어줘.

bpmn.js 라이브러리 사용:
- bpmn-js (모델러)
- bpmn-js-properties-panel (속성 패널)

기능:
- BPMN 2.0 요소 추가/편집
- Pool, Lane, Task, Gateway, Event
- 속성 패널 (우측)
- 확대/축소, 미니맵
- Undo/Redo
- 단축키 지원
```

**Cursor Prompt 18: BPMN 저장/로드**
```
BPMN 저장/로드 기능을 구현해줘.

저장 시:
- BPMN XML 추출 및 저장
- SVG 이미지 생성 및 저장
- 썸네일 생성
- bpmn_model 테이블 저장

로드 시:
- XML에서 다이어그램 복원
- 이전 버전 로드 기능
```

**체크리스트:**
- [ ] bpmn.js 설치 및 설정
- [ ] 에디터 기본 기능
- [ ] 속성 패널 통합
- [ ] XML 저장/로드
- [ ] SVG 내보내기

#### Week 5, Day 4-5: BPMN 요소 연결

**Cursor Prompt 19: BPMN 요소 - 프로세스 연결**
```
BPMN 다이어그램의 Task 요소를 L4 프로세스와 연결하는 기능을 만들어줘.

요구사항:
- Task 클릭 시 연결할 프로세스 선택 모달
- 연결된 프로세스 시각적 표시
- 연결 정보 bpmn_element 테이블 저장
- 연결된 프로세스로 바로 이동 기능
```

**체크리스트:**
- [ ] 요소-프로세스 연결 UI
- [ ] 연결 정보 저장
- [ ] 시각적 표시
- [ ] 네비게이션 기능

#### Week 6, Day 1-3: BPMN 버전 비교

**Cursor Prompt 20: BPMN 버전 비교**
```
BPMN 다이어그램 버전 비교 기능을 만들어줘.

요구사항:
- 버전 목록에서 2개 선택
- 좌우 분할 화면으로 비교 표시
- 변경된 요소 하이라이트
- 추가/삭제/수정 구분 색상
- diff 알고리즘 적용
```

**체크리스트:**
- [ ] 버전 선택 UI
- [ ] 분할 화면 비교
- [ ] 변경 요소 하이라이트
- [ ] Diff 로직 구현

#### Week 6, Day 4-5: BPMN 목록 및 관리

**Cursor Prompt 21: BPMN 목록 화면**
```
@app/(main)/bpmn/page.tsx BPMN 모델 목록 화면을 만들어줘.

기능:
- 카드/그리드 뷰 (썸네일 표시)
- 검색, 필터 (상태, 프로세스)
- 정렬 (최신순, 이름순)
- 새 모델 생성
- 기존 모델 편집/복제/삭제
```

**체크리스트:**
- [ ] 목록 화면 구현
- [ ] 썸네일 표시
- [ ] 검색/필터/정렬
- [ ] CRUD 기능

---

### Phase 4: Layer C - 운영 메타데이터 (Week 7-9)

#### Week 7, Day 1-3: Task 속성 관리 (다국어)

**Cursor Prompt 22: Task 속성 폼 (다국어)**
```
@components/metadata/TaskAttributeForm.tsx를 만들어줘.

PRD 6.2.2 화면 설계 참조:
- Task 정의 (정의, 목적) - 다국어 입력 ⭐
- Input 정보 (산출물, 데이터, 조건) - 다국어 입력 ⭐
- 선행 프로세스 (프로세스 선택)
- Output 정보 (산출물, 데이터, 조건) - 다국어 입력 ⭐
- 수행주체 (조직, 역할, RACI)
- 수행주기 (주기, 시작조건, 소요시간)
- 시스템/메뉴명
- 비고 (이슈, 예외, 참고사항) - 다국어 입력 ⭐

각 섹션 접기/펼치기, 자동저장 기능
다국어 입력 필드에 MultiLangInput 컴포넌트 사용 ⭐
```

**Cursor Prompt 23: Task 속성 API (다국어)**
```
@app/api/metadata/task-attribute/route.ts를 만들어줘.

엔드포인트:
- GET /api/metadata/task-attribute/[nodeId]: 조회 (다국어 지원) ⭐
- POST /api/metadata/task-attribute: 생성 (다국어 데이터 저장) ⭐
- PUT /api/metadata/task-attribute/[nodeId]: 수정 (다국어 데이터 수정) ⭐

task_attribute 테이블 + task_attribute_i18n 테이블 CRUD ⭐
요청 헤더의 Accept-Language로 locale 판단
```

**체크리스트:**
- [ ] Task 속성 폼 구현
- [ ] **다국어 입력 UI** ⭐
- [ ] 섹션별 UI
- [ ] API CRUD
- [ ] **다국어 데이터 저장/조회** ⭐
- [ ] 자동저장 기능

#### Week 7, Day 4-5: 선행 프로세스 연결

**Cursor Prompt 24: 선행 프로세스 선택**
```
@components/metadata/PredecessorSelect.tsx를 만들어줘.

기능:
- 프로세스 트리에서 선택
- 다중 선택 지원
- 선행 조건 설명 입력
- 필수/선택 구분
- 순환 참조 방지 로직

task_predecessor 테이블 활용
```

**체크리스트:**
- [ ] 선행 프로세스 선택 UI
- [ ] 다중 선택
- [ ] 순환 참조 체크
- [ ] API 구현

#### Week 7, Day 5 — BPMN Call Activity (크로스-L2 L3) ⭐

**목표:** L3 BPMN에서 Call Activity로 **전사 L3** 호출 + `task_predecessor` 동기화

```
구현:
- migration 022: bpmn_element CALL_ACTIVITY 타입
- ProcessLinkSidebar: 로컬 L4 / 전사 L3 탭
- ProcessLinkModal: Task→L4, Call Activity→L3
- bpmn.service: 연결 검증 + sequenceFlow → task_predecessor 병합
- lib/utils/bpmn-predecessor-sync.ts
```

**체크리스트:**
- [x] CALL_ACTIVITY DB·타입·XML 매핑
- [x] 전사 L3 선택 UI (L2 형제 제한 없음)
- [x] BPMN 저장 시 선행 관계 병합
- [ ] L2 오케스트레이션 뷰 (Phase 5)

#### Week 8, Day 1-2: 시스템 연계 매핑

**Cursor Prompt 25: 시스템 마스터 관리**
```
시스템/모듈/화면 마스터 관리 기능을 만들어줘.

1. 시스템 목록/등록/수정
   - 코드, 이름, 유형, 설명
   - 테이블 API URL 설정 (외부 연동용)

2. 모듈 관리 (시스템 하위)
3. 화면/메뉴 관리 (모듈 하위)
   - 트랜잭션 코드 (T-Code)
   - 메뉴 경로

application_system, system_module, system_screen 테이블
```

**Cursor Prompt 26: 태스크-시스템 연결**
```
태스크-시스템 매핑 기능을 만들어줘.

- 시스템/모듈/화면 계층 선택
- 용도 구분 (실행, 조회, 승인, 리포트, 인터페이스)
- 주요 시스템 표시
- 연결된 시스템 목록 조회

task_system_mapping 테이블 활용
```

**체크리스트:**
- [x] 시스템 마스터 CRUD — `SystemMasterManagement`, `/api/admin/systems`
- [x] 모듈/화면 관리 — hierarchy API, screen catalog
- [x] 태스크-시스템 연결 UI — `TaskSystemMapping` (시스템→화면 2-tier, migration 023)
- [x] API 구현 — `/api/metadata/tasks/[nodeId]/systems`

#### Week 8, Day 3-5: 외부 테이블 연결

**Cursor Prompt 27: 외부 테이블 조회**
```
@components/data/ExternalTableBrowser.tsx를 만들어줘.

PRD 6.2.3 화면 설계 참조:
- 시스템 선택 드롭다운
- 테이블명 검색 (외부 API 호출)
- 조회 결과 테이블 (스키마, 테이블명, 한글명, 유형)
- 컬럼 정보 조회 (실시간)
- 테이블 선택 기능

외부 시스템 API 연동 또는 Mock 데이터 지원
```

**Cursor Prompt 28: 외부 연동 클라이언트**
```
@lib/external/client.ts 외부 시스템 API 클라이언트를 만들어줘.

기능:
- 시스템별 API 설정 조회
- 테이블 목록 조회 API 호출
- 컬럼 메타정보 조회 API 호출
- 인증 처리 (None, Basic, OAuth, API Key)
- 에러 핸들링
- 캐싱 지원 (선택적)

application_system.table_api_url 설정 활용
```

**Cursor Prompt 29: 데이터 테이블 연결**
```
@components/data/DataTableLink.tsx를 만들어줘.

기능:
- ExternalTableBrowser에서 테이블 선택
- 연결 유형 선택 (INPUT/OUTPUT/REFERENCE)
- CRUD 유형 선택
- 주요 컬럼 입력
- 연결 저장/삭제
- 연결된 테이블 목록 표시

task_data_table_link 테이블 활용
```

**체크리스트:**
- [x] 외부 테이블 조회 UI — `ExternalTableBrowser`
- [x] 외부 API 클라이언트 — `lib/external/`, `/api/external/systems`
- [x] 테이블 연결 UI — `DataTableLink`
- [x] API 구현 — `/api/metadata/tasks/[nodeId]/data-tables`
- [x] 외부 API 설정 — `ExternalApiSettingsManagement`, migration 013

#### Week 9, Day 1-2: RACI 매트릭스

**Cursor Prompt 30: RACI 매트릭스**
```
@components/metadata/RaciMatrix.tsx를 만들어줘.

기능:
- 조직/역할 마스터에서 선택
- R/A/C/I 유형 지정
- 매트릭스 형태 표시
- 다중 역할 지원
- 프로세스별 RACI 조회

task_role_mapping 테이블 활용
```

**체크리스트:**
- [ ] 조직/역할 마스터 관리 — Placeholder
- [ ] RACI 매핑 UI — `/metadata/raci` → Task 속성 리다이렉트
- [ ] 매트릭스 뷰
- [ ] API 구현

#### Week 9, Day 3-4: KPI/리스크/통제 (기본)

**Cursor Prompt 31: KPI/리스크/통제 연결**
```
KPI, 리스크, 통제 마스터 및 연결 기능을 만들어줘.

MVP 범위:
- 각 마스터 CRUD
- 프로세스와 연결/해제
- 연결된 항목 목록 조회

kpi, risk, control 및 매핑 테이블 활용
```

**체크리스트:**
- [ ] KPI 마스터/연결
- [ ] 리스크 마스터/연결
- [ ] 통제 마스터/연결
- [ ] API 구현

#### Week 9, Day 5: 문서 연결

**Cursor Prompt 32: 문서 연결**
```
문서 연결 기능을 만들어줘.

기능:
- 문서 유형 관리
- 문서 등록 (파일 업로드 - Supabase Storage)
- 프로세스-문서 연결
- 연결 유형 (참조, 산출물, 템플릿, 체크리스트)

document, task_document_mapping 테이블 활용
```

**체크리스트:**
- [ ] 문서 유형 관리
- [ ] 문서 등록 (파일 업로드)
- [ ] 문서 연결 UI
- [ ] API 구현

#### Week 9, Day 5 (추가): 중간 리팩토링 ⭐ 신규

**Cursor Prompt: Phase 4 코드 정리**
```
@app @components @lib Phase 4에서 생성된 코드를 점검하고 리팩토링해줘.

점검 항목:
1. 상태 관리 패턴 통일
   - useState로 서버 데이터 관리하는 코드 → TanStack Query로 변환
   - 중복 상태 → 공유 상태로 통합

2. API 호출 패턴 통일
   - 직접 fetch 호출 → apiClient 함수 사용
   - 에러 처리 누락 → try-catch + ApiError

3. 코드 중복 제거
   - 유사한 컴포넌트 → 공통 컴포넌트 추출
   - 반복 로직 → 커스텀 훅 추출

4. 타입 안전성
   - any 사용 제거
   - 타입 단언(as) 최소화
```

**체크리스트:**
- [ ] 모든 서버 데이터가 TanStack Query로 관리되는가?
- [ ] 모든 API 호출이 apiClient를 사용하는가?
- [ ] 중복 컴포넌트가 통합되었는가?
- [ ] TypeScript any가 제거되었는가?

---

### Phase 5: 분석/검색 기능 (Week 10-11)

#### Week 10, Day 1-3: 영향도 분석

**Cursor Prompt 33: 시스템 영향도 분석**
```
시스템 기준 영향도 분석 기능을 만들어줘.

기능:
- 시스템 선택
- 연관 프로세스 목록 조회
- 담당 조직별 집계
- 시각화 (트리맵, 막대 차트)
- 결과 다운로드 (Excel)

관련 테이블 조인 쿼리 최적화 필요
```

**Cursor Prompt 34: 데이터 영향도 분석**
```
@app/(main)/data/impact/page.tsx 데이터 영향도 분석 화면을 만들어줘.

PRD 6.2.4 참조:
- 시스템/테이블 선택
- 변경 유형 선택 (컬럼 추가/삭제 등)
- 영향받는 프로세스 목록
- 담당 조직 요약 차트
- 결과 다운로드, 담당자 메일 발송 (선택)
```

**체크리스트:**
- [ ] 시스템 영향도 분석
- [ ] 데이터 영향도 분석
- [ ] 시각화 차트
- [ ] Excel 다운로드

#### Week 10, Day 4-5: 운영 지식그래프 ⭐ (선행 구현)

```
구현:
- /analysis/operations-graph — Explorer·Canvas·Inspector
- operations-graph.service.ts — BFS 탐색, centerKind=E2E|L3|SYSTEM
- E2E BPMN Viewer, Call Activity drill-down 연동
- i18n: operationsGraph.*
```

**체크리스트:**
- [x] 그래프 API — `/api/analysis/operations-graph`
- [x] 캔버스·노드카드·레이아웃 훅
- [x] E2E 중심 탐색·Inspector BPMN 링크
- [ ] L2 오케스트레이션 뷰

#### Week 10, Day 4-5: 통합 검색 (다국어)

**Cursor Prompt 35: 통합 검색 (다국어)**
```
통합 검색 기능을 만들어줘.

검색 대상:
- 프로세스명, 코드, 설명 (다국어 검색) ⭐
- 조직명, 역할명 (다국어 검색) ⭐
- 시스템명, 화면명
- 테이블명
- 문서명

기능:
- 키워드 검색
- 검색 대상 필터
- 결과 그룹핑
- 검색어 하이라이트
- 최근 검색어
- 현재 locale 기준 검색 + 기본 언어 Fallback ⭐

MSSQL Full-Text Search 또는 LIKE 쿼리 활용
```

**체크리스트:**
- [ ] 통합 검색 API
- [ ] **다국어 검색 지원** ⭐
- [ ] 검색 결과 UI
- [ ] 필터/그룹핑
- [ ] 하이라이트

#### Week 11, Day 1-3: 대시보드

**Cursor Prompt 36: 대시보드**
```
@app/(main)/dashboard/page.tsx 운영 대시보드를 만들어줘.

위젯:
- 프로세스 현황 (레벨별, 상태별 카운트)
- 최근 변경 프로세스
- 승인 대기 목록
- 내 담당 프로세스
- 시스템별 프로세스 분포

차트: recharts 또는 Chart.js 사용
```

**체크리스트:**
- [ ] 현황 통계 위젯
- [ ] 최근 활동
- [ ] 승인 대기
- [ ] 차트 시각화

#### Week 11, Day 4-5: 데이터 내보내기

**Cursor Prompt 37: 내보내기 기능**
```
다양한 형식의 데이터 내보내기 기능을 만들어줘.

형식:
- Excel (프로세스 목록, 메타데이터)
- PDF (프로세스 상세, BPMN 포함)
- BPMN XML 내보내기
- SVG/PNG 이미지 내보내기

xlsx, jspdf 라이브러리 활용
```

**체크리스트:**
- [ ] Excel 내보내기
- [ ] PDF 내보내기
- [ ] 이미지 내보내기
- [ ] BPMN XML 내보내기

---

### Phase 6: 통합 테스트 및 마무리 (Week 12)

#### Day 1-2: 통합 테스트

**Cursor Prompt 38: E2E 테스트**
```
Playwright 또는 Cypress로 E2E 테스트를 작성해줘.

테스트 시나리오:
1. 로그인 → 프로세스 등록 → 저장
2. BPMN 에디터에서 다이어그램 생성
3. Task 속성 입력 → 시스템 연결 → 데이터 연결
4. 승인 요청 → 승인 처리
5. 영향도 분석 실행
6. 통합 검색
7. **언어 전환 테스트 (한국어 → English → 繁體中文)** ⭐
8. **다국어 데이터 입력/조회 테스트** ⭐
9. **에러 발생 시 다국어 메시지 표시 테스트** ⭐
```


**Cursor Prompt 38-1: 다국어 검수 체크리스트 ⭐ 신규**
```
다국어 검수를 위한 체크리스트를 작성해줘.

UI 검수:
- [ ] 모든 메뉴명이 3개 언어로 표시되는지
- [ ] 모든 버튼/라벨이 번역되었는지
- [ ] 상태값이 번역되었는지
- [ ] 에러 메시지가 번역되었는지
- [ ] 날짜/숫자 형식이 locale에 맞는지

데이터 검수:
- [ ] 프로세스명 다국어 입력/표시
- [ ] Task 속성 다국어 입력/표시
- [ ] 검색 시 다국어 데이터 검색 가능
- [ ] 번역 없는 경우 기본 언어(한국어) Fallback

레이아웃 검수:
- [ ] 영어/번체 텍스트 길이에 따른 UI 깨짐 없음
- [ ] RTL(Right-to-Left) 불필요 (지원 언어에 해당 없음)
```

**체크리스트:**
- [ ] 테스트 환경 구축
- [ ] 핵심 시나리오 테스트
- [ ] **다국어 전환 테스트** ⭐
- [ ] **다국어 검수 완료** ⭐
- [ ] 버그 수정

#### Day 3-4: 성능 최적화

**Cursor Prompt 39: 성능 최적화**
```
성능 최적화를 진행해줘.

확인 사항:
- 프로세스 트리 로딩 속도
- BPMN 에디터 렌더링
- 검색 응답 시간
- 영향도 분석 쿼리

최적화:
- DB 인덱스 확인/추가
- React 메모이제이션
- 코드 스플리팅
- 이미지 최적화
```

**체크리스트:**
- [ ] 성능 측정
- [ ] DB 쿼리 최적화
- [ ] 프론트엔드 최적화
- [ ] Lighthouse 점수 확인

#### Day 5: 배포 준비

**Cursor Prompt 40: 배포 설정**
```
배포 환경을 설정해줘.

- 환경변수 정리 (.env.production)
- 빌드 최적화 설정
- Docker 설정 (선택)
- CI/CD 파이프라인 (GitHub Actions)
- 에러 모니터링 (Sentry - 선택) - 다국어 에러 추적 ⭐
- 번역 파일 빌드 시 검증 ⭐
```

**체크리스트:**
- [ ] 환경변수 정리
- [ ] 빌드 테스트
- [ ] 배포 스크립트
- [ ] **번역 파일 완성도 검증** ⭐
- [ ] 문서 정리
---

## 📁 파일 구조 요약 (다국어 포함)

```
pams/
├── app/
│   ├── [locale]/                      # 다국어 라우팅 ⭐
│   │   ├── (auth)/login/page.tsx
│   │   ├── (main)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── process/
│   │   │   ├── e2e-process/           # E2E 카탈로그 ⭐
│   │   │   ├── bpmn/
│   │   │   ├── metadata/
│   │   │   ├── data/
│   │   │   ├── analysis/
│   │   │   │   └── operations-graph/  # 운영 지식그래프 ⭐
│   │   │   └── admin/
│   │   │       └── i18n/page.tsx      # 다국어 관리 ⭐
│   │   └── layout.tsx
│   └── api/
│       ├── process/route.ts
│       ├── bpmn/route.ts
│       ├── metadata/
│       ├── external/
│       ├── analysis/route.ts
│       └── i18n/                       # 다국어 API ⭐
│           ├── messages/route.ts
│           └── translations/route.ts
├── components/
│   ├── ui/ (Shadcn)
│   ├── common/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── LanguageSelector.tsx        # 언어 선택 ⭐
│   │   ├── MultiLangInput.tsx          # 다국어 입력 ⭐
│   │   ├── ErrorToast.tsx              # 에러 Toast ⭐
│   │   └── ...
│   ├── process/
│   ├── e2e-process/                   # E2E ⭐
│   ├── bpmn/
│   ├── metadata/
│   ├── data/
│   └── analysis/operations-graph/     # 운영 지식그래프 ⭐
├── lib/
│   ├── db/
│   │   └── queries/
│   ├── services/                        # 비즈니스 로직 ⭐ 신규
│   │   ├── process.service.ts
│   │   ├── bpmn.service.ts
│   │   ├── e2e-process.service.ts     # ⭐
│   │   ├── operations-graph.service.ts # ⭐
│   │   └── metadata.service.ts
│   ├── external/
│   ├── supabase/
│   ├── api/
│   │   └── error-handler.ts            # 에러 핸들링 ⭐
│   │   ├── client.ts                    # API 클라이언트 ⭐ 신규
│   │   └── response.ts                  # 응답 포맷팅 ⭐ 신규
│   ├── store/                           # Zustand ⭐ 신규
│   │   ├── ui.store.ts
│   │   └── index.ts
│   ├── query/                           # TanStack Query ⭐ 신규
│   │   ├── client.ts
│   │   ├── keys.ts
│   │   └── hooks/
│   ├── i18n/                            # 다국어 설정 ⭐
│   │   ├── config.ts
│   │   ├── request.ts
│   │   └── navigation.ts
│   └── utils/
├── messages/                            # 정적 번역 파일 ⭐
│   ├── ko.json
│   ├── en.json
│   └── zh-TW.json
├── types/
│   ├── process.ts
│   ├── bpmn.ts
│   ├── metadata.ts
│   ├── external.ts
│   ├── database.ts
│   ├── i18n.ts                          # 다국어 타입 ⭐
│   └── error.ts                         # 에러 타입 ⭐
├── hooks/
│   ├── useProcess.ts
│   ├── useBpmn.ts
│   ├── useMetadata.ts
│   ├── useExternalTables.ts
│   └── useLocale.ts                     # 다국어 훅 ⭐
├── middleware.ts                        # 인증 + 다국어 미들웨어 ⭐
└── scripts/
    └── migrations/
```

---


## 🔑 핵심 Cursor 프롬프트 템플릿 (업데이트)

### 새 기능 개발 시 (다국어/에러 핸들링 포함) ⭐
```
@codebase 기존 패턴을 참조하여 [기능명]을 구현해줘.

요구사항:
- [상세 요구사항 1]
- [상세 요구사항 2]

관련 테이블: [테이블명], [테이블명_i18n] (다국어 테이블 있는 경우)
참고 화면: PRD [섹션 번호]

⭐ 필수 참조 파일 (반드시 동일 패턴 사용):
- API 호출: @lib/api/client.ts의 apiClient 함수
- 상태 관리: @lib/query/hooks/의 useQuery/useMutation 패턴
- 쿼리 키: @lib/query/keys.ts의 키 팩토리
- 에러 처리: @lib/api/error-handler.ts의 ApiError
- 폼 처리: @components/common/Form의 useForm 패턴
- 비즈니스 로직: @lib/services/[domain].service.ts

다국어 지원:
- 다국어 입력이 필요한 필드에 MultiLangInput 컴포넌트 사용
- API 응답은 요청 locale에 맞는 데이터 반환
- 번역 없는 경우 기본 언어(ko) Fallback

에러 핸들링:
- PRD 섹션 9.2 에러 코드 참조
- 발생 가능한 에러 상황 정의 및 적절한 에러 코드 사용
- 에러 메시지는 다국어로 반환

⭐ 생성 후 자가 점검:
- [ ] useState로 서버 데이터 관리하지 않았는가?
- [ ] 쿼리 키가 keys.ts 팩토리를 사용하는가?
- [ ] 에러가 ApiError로 통일되었는가?
- [ ] 비즈니스 로직이 service 레이어에 있는가?


TypeScript strict 모드 준수, 한국어 주석 포함
```

### 버그 수정 시
```
@file 이 파일에서 [에러 내용] 문제가 발생해.

에러 메시지:
[에러 메시지 붙여넣기]

원인을 분석하고 수정해줘.
```

### 리팩토링 시
```
@folder 이 폴더의 코드를 리팩토링해줘.

개선 사항:
- 중복 코드 제거
- 공통 유틸리티 추출
- 타입 안전성 강화
- 성능 최적화
```

### 에러 핸들링 추가 시 ⭐ 신규
```
@file 이 API/컴포넌트에 에러 핸들링을 추가해줘.

PRD 섹션 9 참조:

발생 가능한 에러:
- 유효성 검증 실패: E001~E005
- 권한 부족: E201~E203
- 리소스 없음: E301~E304
- 비즈니스 로직 오류: E401~E405
- 시스템 오류: E501~E503
- 외부 연동 오류: E601~E604

각 에러 상황에 맞는 에러 코드 사용
다국어 메시지 반환
클라이언트에서 Toast 표시
```

---

## ✅ 전체 체크리스트 (2026-06-16)

### Phase 0 — ✅ (Auth ⏸️)
- [x] 프로젝트·i18n·DB(025)·에러코드·Query/Service

### Phase 1 — ✅
- [x] 레이아웃·언어선택·API·에러·공통 UI

### Phase 2 — ✅
- [x] 프로세스 트리·CRUD·다국어·버전·승인·Scope/Variant·표준/변형 비교

### Phase 3 — ✅
- [x] BPMN 에디터·저장·Task↔L4·Call Activity↔L3·선행 동기화·버전비교

### Phase 4 — 🔄
- [x] Task 속성·선행·시스템(2-tier)·외부테이블·데이터연결·시스템/외부API/공통코드
- [ ] RACI·KPI/리스크/통제·문서·조직/역할

### Phase 5 — 🔄
- [x] 운영 지식그래프
- [ ] 영향도·통합검색·대시보드 실데이터·내보내기·히트맵

### Phase 7 — ✅
- [x] E2E 카탈로그·E2E BPMN·L4 drill-down·프로세스맵 E2E 섹션

### Phase 6 — 📋
- [ ] E2E테스트·다국어 검수·성능·배포

---

## Phase 7: E2E 프로세스 카탈로그 (2026-06) ✅

전사 cross-domain E2E 흐름을 L1~L4 트리와 분리 관리.

| 항목 | 구현 |
|------|------|
| DB | `e2e_process`, `bpmn_model.model_kind` / `e2e_process_id` (025) |
| API | `/api/e2e-process`, `/by-l3/[nodeId]`, `/api/bpmn/l3/[nodeId]/l4-slice` |
| UI | `/e2e-process`, 프로세스맵 E2E 섹션, BPMN E2E 모드, `E2eBpmnViewerSheet`, `BpmnDrilldownViewer` |
| 분석 | 운영지식그래프 `centerKind=E2E`, Inspector E2E BPMN·drill-down |
| i18n | `e2eProcess`, `operationsGraph.inspector.*` |

**체크리스트:** [x] 전항목

---

## 📝 참고 사항

1. **PRD 문서 참조**: 상세 요구사항은 항상 PRD 문서 확인
2. **Cursor 컨텍스트**: `@PRD.md` 파일을 프로젝트에 포함하여 참조
3. **점진적 개발**: 각 Phase 완료 후 리뷰 및 피드백 반영
4. **문서화**: 주요 결정사항 및 변경사항 기록
5. **다국어 번역**: UI 번역은 개발과 병행, 비즈니스 데이터 번역은 운영팀 협조 ⭐

---

*본 문서는 PAMS 개발을 위한 Cursor AI 기반 개발 계획서입니다.*
*최종 수정일: 2026-06-16*
*버전: 1.3 — Layer C·운영지식그래프·Scope/Variant 구현 현황 반영*

