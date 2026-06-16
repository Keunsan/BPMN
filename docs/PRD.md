# Process Architecture Management System (PAMS)
# Product Requirements Document (PRD)

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| **문서명** | PAMS PRD (Product Requirements Document) |
| **버전** | 1.6 |
| **최종 수정일** | 2026-06-16 |
| **작성자** | - |
| **승인자** | - |
| **보안등급** | 대외비 |

---

## 목차

1. [제품 개요](#1-제품-개요-executive-summary)
2. [배경 및 필요성](#2-배경-및-필요성)
3. [시스템 아키텍처 설계](#3-시스템-아키텍처-설계)
4. [기능 요구사항](#4-기능-요구사항)
5. [데이터 모델](#5-데이터-모델-erd)
6. [화면 설계](#6-화면-설계-uiux)
7. [비기능 요구사항](#7-비기능-요구사항)
8. [기술 아키텍처](#8-기술-아키텍처)
9. [에러 핸들링 표준](#9-에러-핸들링-표준) ⭐ 신규
10. [국제화 (i18n)](#10-국제화-i18n) ⭐ 신규
11. [프로젝트 로드맵](#11-프로젝트-로드맵)
12. [거버넌스 체계](#12-거버넌스-체계)
13. [리스크 및 대응 방안](#13-리스크-및-대응-방안)
14. [부록](#14-부록) — [14.7 구현 현황](#147-구현-현황-2026-06-16)

---

## 1. 제품 개요 (Executive Summary)

### 1.1 제품명

**PAMS (Process Architecture Management System)**
- 국문: 프로세스 아키텍처 관리 시스템

### 1.2 제품 정의

전사 업무 아키텍처와 BPMN, 시스템 운영 메타데이터를 통합하여 **E2E 프로세스 표준화, 변경영향도 분석, 운영 거버넌스**를 지원하는 엔터프라이즈 플랫폼

### 1.3 핵심 차별점

| 구분 | 기존 BPMN 도구 | PAMS |
|------|---------------|------|
| **목적** | 다이어그램 작성/저장 | 전사 운영관리 플랫폼 |
| **범위** | 개별 프로세스 | L1~L4 계층 + E2E 흐름 |
| **연계** | 독립 운영 | ERP/MES/SCM/SRM 메타데이터 통합 |
| **활용** | 문서 아카이브 | 영향도 분석, 변경관리, 감사 대응 |
| **태스크 관리** | 단순 도형 | Task 속성 + 데이터 테이블 연결 |
| **다국어** | 제한적 | 한국어/영어/대만(번체) 지원 ⭐ |

### 1.4 제품 비전

> "전사 업무 아키텍처와 BPMN, 시스템 운영 메타데이터를 통합하여 E2E 프로세스 표준화, 변경영향도 분석, 운영 거버넌스를 지원하는 플랫폼"

---

## 2. 배경 및 필요성

### 2.1 현황 및 문제점

#### 조직적 문제
- 사업부/공장/법인별 업무 수행 방식 상이
- "표준 프로세스"의 정의 부재
- 프로세스 변경 시 영향 범위 파악 어려움
- **해외 법인과의 커뮤니케이션 언어 장벽** ⭐

#### 시스템적 문제
- ERP/MES/SCM 변경 시 연관 업무 추적 불가
- 장애 발생 시 영향받는 업무 흐름 파악 지연
- 시스템-프로세스-조직 간 매핑 정보 부재
- **태스크별 상세 정의 및 데이터 연관관계 미관리**

#### 거버넌스 문제
- 프로세스 문서의 최신성 미보장
- 변경 이력 및 승인 체계 부재
- 내부통제/감사 대응 자료 분산

### 2.2 기대 효과

| 영역 | 기대 효과 | 측정 지표 |
|------|----------|----------|
| **표준화** | 전사 프로세스 일관성 확보 | 표준 준수율 90% 이상 |
| **운영효율** | 변경 영향도 분석 시간 단축 | 분석 소요시간 70% 감소 |
| **리스크 관리** | 장애 영향 범위 즉시 파악 | 초기 대응시간 50% 단축 |
| **감사 대응** | 통제 증적 자료 즉시 제공 | 자료 준비시간 80% 감소 |
| **데이터 거버넌스** | 프로세스-데이터 연관관계 명확화 | 데이터 영향도 즉시 파악 |
| **글로벌 협업** | 다국어 지원으로 해외법인 협업 강화 ⭐ | 해외법인 사용률 80% 이상 |

---

## 3. 시스템 아키텍처 설계

### 3.1 3-Layer 구조

PAMS는 3개의 논리적 계층으로 구성됩니다.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PAMS 3-Layer Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Layer A: Process Architecture Layer                                │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  • 전사 업무 계층 구조 관리 (L1~L4 트리)                             │   │
│  │  • 프로세스 분류체계 및 코드 관리                                    │   │
│  │  • 프로세스 기본 정보 (명칭, 설명, 상태, 버전)                        │   │
│  │  • 상위-하위 프로세스 관계                                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Layer B: BPMN Modeling Layer                                       │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  • BPMN 2.0 기반 프로세스 시각화                                     │   │
│  │  • 다이어그램 편집/저장 (XML, SVG)                                   │   │
│  │  • Pool, Lane, Event, Task, Gateway 모델링                          │   │
│  │  • 버전별 다이어그램 비교                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Layer C: Operation Metadata Layer  ⭐ 핵심 운영 정보               │   │
│  │  ─────────────────────────────────────────                          │   │
│  │  • Task 속성 관리 ⭐ 변경                                            │   │
│  │    - Task 정의 / Input 정보 / Output 정보                            │   │
│  │    - 선행 프로세스 / 수행주체 / 수행주기                              │   │
│  │    - 시스템 / 메뉴명 / 비고(이슈관리 등)                              │   │
│  │  • 담당 조직/역할 (RACI 매트릭스)                                    │   │
│  │  • 관련 시스템 연결 (ERP, MES, SCM, SRM)                             │   │
│  │  • 화면/트랜잭션/메뉴 매핑                                           │   │
│  │  • 관련 데이터 테이블 연결 (외부 시스템 조회 방식) ⭐ 변경            │   │
│  │  • 인터페이스/API 연결                                               │   │
│  │  • KPI, 리스크, 통제 포인트                                          │   │
│  │  • 관련 문서/SOP                                                     │   │
│  │  • 변경 이력                                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Layer 간 관계

```
ProcessNode (Layer A)
       │
       │ 1:N
       ▼
BPMNModel (Layer B)
       │
       │ 1:N (각 BPMN Element별)
       ▼
Operation Metadata (Layer C)
  ├── TaskAttribute (Task 속성) ⭐ 변경
  ├── TaskSystemMapping (시스템 연결)
  ├── TaskDataTableLink (데이터 테이블 연결 - 외부 조회) ⭐ 변경
  ├── TaskRoleMapping (RACI)
  ├── TaskKPIMapping (KPI)
  ├── TaskControlMapping (통제)
  └── TaskDocumentMapping (문서)
```

### 3.3 L1~L4 계층 정의

| Level | 정의 | 관리 포인트 | Layer A 관리 | Layer C 관리 |
|-------|------|-------------|--------------|--------------|
| **L1** | 가치사슬/E2E 흐름 | 전사 공통 표준 | 코드, 명칭, 설명 | 책임 조직 |
| **L2** | 프로세스 그룹 | 영역별 표준 정의 | 코드, 명칭, 설명 | 책임 조직, KPI |
| **L3** | 세부 프로세스 | 프로세스 오너 지정 | 코드, 명칭, 설명, BPMN 연결 | 시스템, KPI, 통제 |
| **L4** | Task/Activity | 상세 업무 정의 | 코드, 명칭, 설명 | **Task 속성, 시스템, 데이터 테이블, RACI** |

### 3.4 권장 L1 체계 (E2E 가치흐름 중심)

```
┌─────────────────────────────────────────────────────────────────┐
│                    E2E Value Chain (L1)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ Source  │─▶│  Plan   │─▶│ Produce │─▶│ Deliver │            │
│  │ to Pay  │  │   to    │  │   to    │  │   to    │            │
│  │  (STP)  │  │ Produce │  │ Deliver │  │  Cash   │            │
│  └─────────┘  │  (PTP)  │  │  (PTD)  │  │  (OTC)  │            │
│               └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ Record  │  │  Hire   │  │ Issue   │                         │
│  │   to    │  │   to    │  │   to    │                         │
│  │ Report  │  │ Retire  │  │Recovery │                         │
│  │  (RTR)  │  │  (HTR)  │  │  (ITR)  │                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 L1~L4 예시 (Source to Pay)

```
L1: Source to Pay (STP)
│
├── L2: STP-01 구매계획
│   ├── L3: STP-01-01 구매예산 수립
│   └── L3: STP-01-02 구매계획 확정
│
├── L2: STP-02 발주관리
│   ├── L3: STP-02-01 구매요청
│   │   ├── L4: STP-02-01-01 구매요청 등록      ← Task 속성, 시스템, 데이터 테이블 연결
│   │   ├── L4: STP-02-01-02 구매요청 검토      ← Task 속성, 시스템, 데이터 테이블 연결
│   │   └── L4: STP-02-01-03 구매요청 승인      ← Task 속성, 시스템, 데이터 테이블 연결
│   ├── L3: STP-02-02 견적관리
│   └── L3: STP-02-03 발주승인
│       ├── L4: STP-02-03-01 발주서 작성
│       ├── L4: STP-02-03-02 발주 승인 요청
│       └── L4: STP-02-03-03 ERP 발주 생성      ← Task 속성, 시스템, 데이터 테이블 연결
│
├── L2: STP-03 입고관리
└── L2: STP-04 대금지급
```

---

## 4. 기능 요구사항

### 4.1 핵심 기능 매트릭스

| 기능 영역 | MVP | Phase 2 | Phase 3 | 우선순위 |
|----------|:---:|:-------:|:-------:|:--------:|
| **프로세스 계층 관리** | ● | ● | ● | 필수 |
| **BPMN 모델링** | ● | ● | ● | 필수 |
| **조직/역할 매핑** | ● | ● | ● | 필수 |
| **시스템 연계 매핑** | ● | ● | ● | 필수 |
| **Task 속성 관리** | ● | ● | ● | 필수 |
| **데이터 테이블 연결** | ● | ● | ● | 필수 |
| **버전 관리** | ● | ● | ● | 필수 |
| **승인 워크플로우** | | | ● | 선택 |
| **통합 검색** | | ● | ● | 중요 |
| **영향도 분석** | ● | ● | ● | 필수 |
| **KPI 연결** | | ● | ● | 중요 |
| **리스크/통제 관리** | | ● | ● | 중요 |
| **표준/변형 비교** | | ● | ● | 중요 |
| **Heat Map** | | | ● | 선택 |
| **성숙도 진단** | | | ● | 선택 |
| **AI 기반 분석** | | | ● | 선택 |

### 4.2 MVP 필수 기능 상세

#### 4.2.1 L1~L4 프로세스 체계 관리 (Layer A)

| 기능 | 상세 요구사항 |
|------|--------------|
| 트리 구조 관리 | L1~L4 계층 CRUD, Drag & Drop 이동 |
| 코드 자동생성 | 상위 코드 기반 순번 자동 부여 |
| 상태 관리 | Draft → In Review → Approved → Published → Obsolete |
| 기본 정보 | 코드, 명칭, 설명, 상태, 버전, 유효기간 |

#### 4.2.2 BPMN 다이어그램 관리 (Layer B)

| 기능 | 상세 요구사항 |
|------|--------------|
| 웹 에디터 | bpmn.js 기반 BPMN 2.0 편집기 |
| XML Import/Export | BPMN 2.0 XML 표준 형식 |
| 이미지 저장 | SVG, PNG 형식 다이어그램 이미지 |
| 버전 비교 | 버전 간 변경점 시각적 비교 |
| **Task ↔ L4 연결** | User Task 등에 동일 L3 하위 L4 프로세스 연결 |
| **Call Activity ↔ L3** ⭐ | Call Activity에 **전사 L3** 연결 (L2 형제·타 L2 크로스 허용) |
| **선행 동기화** ⭐ | BPMN `sequenceFlow` 저장 시 `task_predecessor` 자동 병합 |

**계층 vs 실행 흐름:**

- **Layer A (트리)**: L1→L2→L3→L4 분류·코드 체계. L3 아래는 L4만.
- **Layer B (BPMN)**: L3 BPMN에서 L4 Task + **외부 L3 Call Activity**로 E2E 실행 순서 표현.
- **Layer C**: Call Activity/L4 연결 노드 간 선행 관계는 BPMN 저장 시 `task_predecessor`에 병합.

**Call Activity 예시 (크로스-L2):**

```
L3-수요관리 BPMN:
  [Call: L3-계획수립(생산)] → L4-수요입력 → [Call: L3-발주등록(구매)] → L4-수요확정
```

| BPMN 요소 | linked_node_id | properties.linkKind |
|-----------|----------------|---------------------|
| User Task | L4 | `L4_TASK` |
| Call Activity | L3 (전사, 자기 L3 제외) | `L3_CALL`, completionScope=`FULL` |

#### 4.2.3 Task 속성 관리 (Layer C) ⭐ 변경

L3/L4 레벨의 각 태스크에 대해 운영에 필요한 핵심 속성을 관리합니다.

| 속성 | 관리 내용 | 입력 유형 | 필수 여부 |
|------|----------|----------|----------|
| **Task 정의** | 수행 업무 정의, 업무 목적 | 텍스트 | 필수 |
| **Input 정보** | 입력 산출물, 주요 Data, 입력 조건 | 텍스트 + 테이블 연결 | 필수 |
| **선행 프로세스** | 선행 Task/프로세스 연결 | 프로세스 선택 | 권장 |
| **Output 정보** | 출력 산출물, 주요 Data, 산출 조건 | 텍스트 + 테이블 연결 | 필수 |
| **수행주체** | 담당 조직, 담당 역할 (RACI) | 조직/역할 선택 | 필수 |
| **수행주기** | 수행 시점, 주기 (수시/일/주/월/분기/연) | 선택 + 텍스트 | 필수 |
| **시스템** | 수행 시스템 | 시스템 선택 | 필수 |
| **메뉴명** | 화면, 메뉴 경로, 트랜잭션 코드 | 화면 선택 | 필수 |
| **비고** | 이슈관리, 특이사항, 기타 참고사항 | 텍스트 (Rich Text) | 선택 |

**Task 속성 상세 필드 정의:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Task Attribute (태스크 속성)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Task 정의] ─────────────────────────────────────────────────  │
│  ├── definition: 업무 정의 (필수)                               │
│  └── purpose: 업무 목적                                         │
│                                                                 │
│  [Input 정보] ────────────────────────────────────────────────  │
│  ├── input_deliverable: 입력 산출물 (문서, 데이터 등)           │
│  ├── input_data: 주요 입력 Data (테이블 연결)                   │
│  └── input_condition: 입력 조건/전제조건                        │
│                                                                 │
│  [선행 프로세스] ─────────────────────────────────────────────  │
│  ├── predecessor_ids: 선행 태스크 ID 목록                       │
│  └── predecessor_condition: 선행 조건 설명                      │
│                                                                 │
│  [Output 정보] ───────────────────────────────────────────────  │
│  ├── output_deliverable: 출력 산출물 (문서, 데이터 등)          │
│  ├── output_data: 주요 출력 Data (테이블 연결)                  │
│  └── output_condition: 출력 조건/완료 조건                      │
│                                                                 │
│  [수행주체] ──────────────────────────────────────────────────  │
│  ├── responsible_org: 담당 조직                                 │
│  ├── responsible_role: 담당 역할                                │
│  ├── accountable: 책임자 (A)                                    │
│  ├── consulted: 협의 대상 (C)                                   │
│  └── informed: 통보 대상 (I)                                    │
│                                                                 │
│  [수행주기] ──────────────────────────────────────────────────  │
│  ├── frequency: 수행 주기 (수시/일/주/월/분기/연/이벤트)        │
│  ├── trigger_event: 시작 이벤트/조건                            │
│  └── duration: 예상 소요시간                                    │
│                                                                 │
│  [시스템] ────────────────────────────────────────────────────  │
│  └── system_id: 수행 시스템                                     │
│                                                                 │
│  [메뉴명] ────────────────────────────────────────────────────  │
│  ├── screen_id: 화면/메뉴                                       │
│  ├── menu_path: 메뉴 경로                                       │
│  └── transaction_code: 트랜잭션 코드 (ERP T-Code 등)            │
│                                                                 │
│  [비고] ──────────────────────────────────────────────────────  │
│  ├── issues: 이슈관리 (관련 이슈, 개선사항)                     │
│  ├── exceptions: 예외 처리 방법                                 │
│  └── remarks: 기타 참고사항                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.4 데이터 테이블 연결 관리 (Layer C) ⭐ 변경

> **핵심 변경사항:** PAMS에서 데이터 테이블을 직접 관리하지 않고, 각 시스템(ERP, MES, SCM 등)의 테이블 목록을 조회하여 프로세스/Task와 연결만 수행합니다. 컬럼 정보는 연결된 테이블을 기반으로 각 시스템에서 메타정보를 실시간 조회합니다.

| 기능 | 상세 요구사항 |
|------|--------------|
| **외부 테이블 조회** | 각 시스템(ERP, MES, SCM 등)의 테이블 목록을 API로 조회 |
| **테이블 검색/선택** | 시스템별 테이블 검색 및 선택 UI 제공 |
| **태스크-테이블 연결** | 태스크별 관련 테이블 연결 (INPUT/OUTPUT/REFERENCE) |
| **연결 유형 구분** | INPUT(입력), OUTPUT(출력), REFERENCE(참조) |
| **CRUD 구분** | Create, Read, Update, Delete 작업 유형 |
| **컬럼 정보 조회** | 연결된 테이블의 컬럼 정보를 원본 시스템에서 실시간 조회 |
| **데이터 영향도 분석** | 테이블 기준 연관 프로세스/Task 조회 |

**데이터 테이블 연결 방식:**

```
┌─────────────────────────────────────────────────────────────────┐
│  데이터 테이블 연결 아키텍처 (외부 시스템 조회 방식)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                            │
│  │     PAMS        │                                            │
│  │                 │                                            │
│  │  ┌───────────┐  │      API 조회          ┌─────────────────┐ │
│  │  │ Task      │  │ ◀───────────────────── │  External       │ │
│  │  │ Attribute │  │                        │  Systems        │ │
│  │  └───────────┘  │                        │                 │ │
│  │       │        │                        │  ┌───────────┐  │ │
│  │       │ 연결    │  1. 테이블 목록 조회    │  │    ERP    │  │ │
│  │       ▼        │  ──────────────────▶   │  │ (Tables)  │  │ │
│  │  ┌───────────┐  │                        │  └───────────┘  │ │
│  │  │ Task-     │  │  2. 컬럼 메타정보 조회  │                 │ │
│  │  │ DataTable │  │  ──────────────────▶   │  ┌───────────┐  │ │
│  │  │ Link      │  │                        │  │    MES    │  │ │
│  │  │           │  │                        │  │ (Tables)  │  │ │
│  │  │ • 시스템ID │  │                        │  └───────────┘  │ │
│  │  │ • 테이블명 │  │                        │                 │ │
│  │  │ • 연결유형 │  │                        │  ┌───────────┐  │ │
│  │  │ • CRUD    │  │                        │  │    SCM    │  │ │
│  │  └───────────┘  │                        │  │ (Tables)  │  │ │
│  │                 │                        │  └───────────┘  │ │
│  └─────────────────┘                        └─────────────────┘ │
│                                                                 │
│  ※ PAMS는 연결 정보만 관리                                      │
│  ※ 테이블/컬럼 메타정보는 원본 시스템에서 실시간 조회            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**데이터 연결 유형:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Task-DataTable Link Types                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [INPUT] 입력 데이터                                            │
│  └── 태스크 수행을 위해 읽어오는 데이터                          │
│      예: 구매요청 등록 시 자재마스터(MM_MATERIAL) 조회           │
│                                                                 │
│  [OUTPUT] 출력 데이터                                           │
│  └── 태스크 수행 결과 생성/수정되는 데이터                       │
│      예: 구매요청 등록 시 구매요청(PR_REQUEST) 생성              │
│                                                                 │
│  [REFERENCE] 참조 데이터                                        │
│  └── 태스크 수행 중 참조하는 데이터 (변경 없음)                  │
│      예: 구매요청 등록 시 공급업체마스터(MM_VENDOR) 참조         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.2.5 시스템 연계 매핑 (Layer C)

| 기능 | 상세 요구사항 |
|------|--------------|
| 시스템 마스터 | ERP, MES, SCM, SRM 등 시스템 등록 |
| 모듈 관리 | 시스템별 모듈/서브시스템 등록 |
| 화면/메뉴 관리 | 모듈별 화면, 트랜잭션 코드 등록 |
| 태스크-시스템 매핑 | L3/L4 태스크와 시스템/화면 연결 |
| 인터페이스 관리 | 시스템 간 인터페이스/API 등록 |
| **테이블 목록 API 연동** | 시스템별 테이블 목록 조회 API 설정 ⭐ |

#### 4.2.6 기타 MVP 기능

| 기능 | 상세 요구사항 |
|------|--------------|
| 버전 관리 | Major/Minor/Patch, 변경이력 자동기록 |
| 승인 워크플로우 | Draft → In Review → Approved → Published |
| 통합 검색 | 프로세스명/조직/시스템/테이블/문서 키워드 검색 |
| 영향도 분석 | 시스템/테이블 기준 연관 프로세스/조직 조회 |

---

## 5. 데이터 모델 (ERD)

### 5.1 핵심 엔터티 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PAMS Entity Relationship                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │  ProcessNode    │ 1     N │  BPMNModel      │                           │
│  │  (Layer A)      │────────▶│  (Layer B)      │                           │
│  │─────────────────│         │─────────────────│                           │
│  │ node_id (PK)    │         │ model_id (PK)   │                           │
│  │ parent_node_id  │         │ node_id (FK)    │                           │
│  │ level           │         │ bpmn_xml        │                           │
│  │ code            │         │ svg_content     │                           │
│  │ name            │         │ version         │                           │
│  │ status          │         └─────────────────┘                           │
│  └────────┬────────┘                                                       │
│           │                                                                 │
│           │ 1:1 (L3/L4)                                                     │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Layer C: Operation Metadata                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │   │
│  │  │  TaskAttribute  │    │  Organization   │    │ ApplicationSystem│  │   │
│  │  │  (Task 속성)    │    │                 │    │                 │  │   │
│  │  │─────────────────│    │─────────────────│    │─────────────────│  │   │
│  │  │ attr_id (PK)    │    │ org_id (PK)     │    │ system_id (PK)  │  │   │
│  │  │ node_id (FK)    │    │ org_code        │    │ system_code     │  │   │
│  │  │ definition      │    │ org_name        │    │ system_name     │  │   │
│  │  │ input_info      │    │ parent_org_id   │    │ system_type     │  │   │
│  │  │ output_info     │    └────────┬────────┘    │ table_api_url   │  │   │
│  │  │ frequency       │             │             └────────┬────────┘  │   │
│  │  │ remarks         │             │                      │           │   │
│  │  └─────────────────┘             │                      │           │   │
│  │                                  ▼                      ▼           │   │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │   │
│  │  │ TaskRoleMapping │    │      Role       │    │  SystemModule   │  │   │
│  │  │ (RACI)          │    │                 │    │                 │  │   │
│  │  │─────────────────│    │─────────────────│    │─────────────────│  │   │
│  │  │ mapping_id (PK) │    │ role_id (PK)    │    │ module_id (PK)  │  │   │
│  │  │ node_id (FK)    │    │ role_code       │    │ system_id (FK)  │  │   │
│  │  │ role_id (FK)    │    │ role_name       │    │ module_code     │  │   │
│  │  │ raci_type       │    └─────────────────┘    │ module_name     │  │   │
│  │  └─────────────────┘                           └────────┬────────┘  │   │
│  │                                                         │           │   │
│  │  ┌─────────────────┐                           ┌────────▼────────┐  │   │
│  │  │TaskSystemMapping│                           │  SystemScreen   │  │   │
│  │  │─────────────────│                           │─────────────────│  │   │
│  │  │ mapping_id (PK) │                           │ screen_id (PK)  │  │   │
│  │  │ node_id (FK)    │                           │ module_id (FK)  │  │   │
│  │  │ screen_id (FK)  │                           │ screen_code     │  │   │
│  │  │ usage_type      │                           │ screen_name     │  │   │
│  │  └─────────────────┘                           │ transaction_code│  │   │
│  │                                                └─────────────────┘  │   │
│  │  ┌─────────────────┐   ※ 테이블 메타정보는 외부 시스템에서 조회     │   │
│  │  │TaskDataTable    │   ※ PAMS는 연결 정보만 저장                    │   │
│  │  │Link ⭐ 변경     │                                                │   │
│  │  │─────────────────│                                                │   │
│  │  │ link_id (PK)    │                                                │   │
│  │  │ node_id (FK)    │                                                │   │
│  │  │ system_id (FK)  │   ◀── 어떤 시스템의 테이블인지                 │   │
│  │  │ table_name      │   ◀── 테이블명 (외부 시스템 참조)              │   │
│  │  │ link_type       │   ◀── INPUT/OUTPUT/REFERENCE                  │   │
│  │  │ crud_type       │   ◀── C/R/U/D                                 │   │
│  │  │ description     │                                                │   │
│  │  └─────────────────┘                                                │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 DDL - MSSQL 2017 호환

#### 5.2.1 Layer A: 프로세스 아키텍처

```sql
-- ============================================
-- PAMS Database Schema for MSSQL 2017
-- Layer A: Process Architecture
-- ============================================

-- 프로세스 노드 (L1~L4 통합 트리 구조)
CREATE TABLE process_node (
    node_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    parent_node_id      BIGINT NULL,
    level               VARCHAR(10) NOT NULL,
    code                VARCHAR(30) NOT NULL UNIQUE,
    name                NVARCHAR(200) NOT NULL,
    description         NVARCHAR(MAX) NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    owner_org_id        BIGINT NULL,
    version             VARCHAR(20) NULL,
    valid_from          DATE NULL,
    valid_to            DATE NULL,
    is_standard         BIT DEFAULT 1,
    variant_of          BIGINT NULL,
    sort_order          INT DEFAULT 0,
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_by          BIGINT NULL,
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_process_node_level CHECK (level IN ('L1', 'L2', 'L3', 'L4')),
    CONSTRAINT CHK_process_node_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
);

-- 인덱스
CREATE INDEX IX_process_node_parent ON process_node(parent_node_id);
CREATE INDEX IX_process_node_level ON process_node(level);
CREATE INDEX IX_process_node_status ON process_node(status);
CREATE INDEX IX_process_node_code ON process_node(code);

-- 외래키 (자기참조)
ALTER TABLE process_node 
ADD CONSTRAINT FK_process_node_parent 
FOREIGN KEY (parent_node_id) REFERENCES process_node(node_id);

ALTER TABLE process_node 
ADD CONSTRAINT FK_process_node_variant 
FOREIGN KEY (variant_of) REFERENCES process_node(node_id);


-- 프로세스 버전 이력
CREATE TABLE process_node_history (
    history_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    version             VARCHAR(20) NOT NULL,
    change_type         VARCHAR(20) NOT NULL,
    change_reason       NVARCHAR(500) NULL,
    snapshot_data       NVARCHAR(MAX) NULL,  -- JSON 형식 스냅샷
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_history_change_type CHECK (change_type IN ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'VERSION_UP'))
);

ALTER TABLE process_node_history 
ADD CONSTRAINT FK_history_node 
FOREIGN KEY (node_id) REFERENCES process_node(node_id);

CREATE INDEX IX_process_history_node ON process_node_history(node_id);
```

#### 5.2.2 Layer B: BPMN 모델링

```sql
-- ============================================
-- Layer B: BPMN Modeling
-- ============================================

-- BPMN 모델
CREATE TABLE bpmn_model (
    model_id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    model_name          NVARCHAR(200) NOT NULL,
    version             VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    bpmn_xml            NVARCHAR(MAX) NULL,
    svg_content         NVARCHAR(MAX) NULL,
    thumbnail_path      NVARCHAR(500) NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_current          BIT DEFAULT 1,
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_by          BIGINT NULL,
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_bpmn_model_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
);

ALTER TABLE bpmn_model 
ADD CONSTRAINT FK_bpmn_model_node 
FOREIGN KEY (node_id) REFERENCES process_node(node_id);

CREATE INDEX IX_bpmn_model_node ON bpmn_model(node_id);
CREATE INDEX IX_bpmn_model_current ON bpmn_model(is_current) WHERE is_current = 1;


-- BPMN 요소 (다이어그램 내 개별 요소)
CREATE TABLE bpmn_element (
    element_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    model_id            BIGINT NOT NULL,
    element_type        VARCHAR(50) NOT NULL,
    element_bpmn_id     VARCHAR(100) NOT NULL,
    element_name        NVARCHAR(200) NULL,
    linked_node_id      BIGINT NULL,
    properties          NVARCHAR(MAX) NULL,  -- JSON 형식
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_element_type CHECK (element_type IN (
        'START_EVENT', 'END_EVENT', 'INTERMEDIATE_EVENT',
        'USER_TASK', 'SERVICE_TASK', 'MANUAL_TASK', 'SCRIPT_TASK',
        'EXCLUSIVE_GATEWAY', 'PARALLEL_GATEWAY', 'INCLUSIVE_GATEWAY',
        'POOL', 'LANE', 'SEQUENCE_FLOW', 'MESSAGE_FLOW', 'SUBPROCESS', 'CALL_ACTIVITY'
    ))
);

ALTER TABLE bpmn_element 
ADD CONSTRAINT FK_bpmn_element_model 
FOREIGN KEY (model_id) REFERENCES bpmn_model(model_id);

ALTER TABLE bpmn_element 
ADD CONSTRAINT FK_bpmn_element_node 
FOREIGN KEY (linked_node_id) REFERENCES process_node(node_id);

CREATE INDEX IX_bpmn_element_model ON bpmn_element(model_id);
```

#### 5.2.3 Layer C: 운영 메타데이터 - 조직/역할

```sql
-- ============================================
-- Layer C: Operation Metadata - Organization/Role
-- ============================================

-- 조직
CREATE TABLE organization (
    org_id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    parent_org_id       BIGINT NULL,
    org_code            VARCHAR(30) NOT NULL UNIQUE,
    org_name            NVARCHAR(200) NOT NULL,
    org_type            VARCHAR(20) NOT NULL,
    org_level           INT NULL,
    is_active           BIT DEFAULT 1,
    valid_from          DATE NULL,
    valid_to            DATE NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_org_type CHECK (org_type IN ('COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'PLANT', 'SUBSIDIARY'))
);

ALTER TABLE organization 
ADD CONSTRAINT FK_org_parent 
FOREIGN KEY (parent_org_id) REFERENCES organization(org_id);

CREATE INDEX IX_org_parent ON organization(parent_org_id);
CREATE INDEX IX_org_code ON organization(org_code);


-- 역할
CREATE TABLE role (
    role_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_code           VARCHAR(30) NOT NULL UNIQUE,
    role_name           NVARCHAR(100) NOT NULL,
    role_description    NVARCHAR(500) NULL,
    role_category       VARCHAR(20) NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_role_category CHECK (role_category IN ('BUSINESS', 'IT', 'MANAGEMENT', 'AUDIT', 'EXTERNAL'))
);


-- 사용자
CREATE TABLE users (
    user_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_account        VARCHAR(50) NOT NULL UNIQUE,
    user_name           NVARCHAR(100) NOT NULL,
    email               VARCHAR(200) NULL,
    org_id              BIGINT NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_at          DATETIME NULL
);

ALTER TABLE users 
ADD CONSTRAINT FK_user_org 
FOREIGN KEY (org_id) REFERENCES organization(org_id);


-- 사용자-역할 매핑
CREATE TABLE user_role_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    role_id             BIGINT NOT NULL,
    valid_from          DATE NULL,
    valid_to            DATE NULL,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT UQ_user_role UNIQUE (user_id, role_id)
);

ALTER TABLE user_role_mapping 
ADD CONSTRAINT FK_urm_user FOREIGN KEY (user_id) REFERENCES users(user_id);

ALTER TABLE user_role_mapping 
ADD CONSTRAINT FK_urm_role FOREIGN KEY (role_id) REFERENCES role(role_id);


-- 프로세스-역할 매핑 (RACI)
CREATE TABLE task_role_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    org_id              BIGINT NULL,
    role_id             BIGINT NULL,
    raci_type           VARCHAR(20) NOT NULL,
    description         NVARCHAR(500) NULL,
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_by          BIGINT NULL,
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_raci_type CHECK (raci_type IN ('RESPONSIBLE', 'ACCOUNTABLE', 'CONSULTED', 'INFORMED'))
);

ALTER TABLE task_role_mapping 
ADD CONSTRAINT FK_trm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_role_mapping 
ADD CONSTRAINT FK_trm_org FOREIGN KEY (org_id) REFERENCES organization(org_id);

ALTER TABLE task_role_mapping 
ADD CONSTRAINT FK_trm_role FOREIGN KEY (role_id) REFERENCES role(role_id);

CREATE INDEX IX_task_role_node ON task_role_mapping(node_id);
```

#### 5.2.4 Layer C: 운영 메타데이터 - Task 속성 ⭐ 변경

```sql
-- ============================================
-- Layer C: Operation Metadata - Task Attributes (변경)
-- ============================================

-- 태스크 속성 (기존 5W1H → Task 중심 속성으로 변경)
CREATE TABLE task_attribute (
    attr_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL UNIQUE,  -- L3/L4 노드와 1:1

    -- Task 정의
    definition          NVARCHAR(MAX) NULL,      -- 업무 정의 (필수)
    purpose             NVARCHAR(1000) NULL,     -- 업무 목적

    -- Input 정보
    input_deliverable   NVARCHAR(MAX) NULL,      -- 입력 산출물
    input_data_desc     NVARCHAR(MAX) NULL,      -- 주요 입력 Data 설명
    input_condition     NVARCHAR(1000) NULL,     -- 입력 조건/전제조건

    -- Output 정보
    output_deliverable  NVARCHAR(MAX) NULL,      -- 출력 산출물
    output_data_desc    NVARCHAR(MAX) NULL,      -- 주요 출력 Data 설명
    output_condition    NVARCHAR(1000) NULL,     -- 출력 조건/완료 조건

    -- 수행주기
    frequency           VARCHAR(20) NULL,        -- 수행 주기
    trigger_event       NVARCHAR(500) NULL,      -- 시작 이벤트/조건
    duration            NVARCHAR(100) NULL,      -- 예상 소요시간

    -- 비고
    issues              NVARCHAR(MAX) NULL,      -- 이슈관리 (관련 이슈, 개선사항)
    exceptions          NVARCHAR(MAX) NULL,      -- 예외 처리 방법
    remarks             NVARCHAR(MAX) NULL,      -- 기타 참고사항 (Rich Text/HTML)

    -- 메타 정보
    version             VARCHAR(20) NULL,
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_by          BIGINT NULL,
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_frequency CHECK (frequency IN ('AD_HOC', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'EVENT_DRIVEN'))
);

ALTER TABLE task_attribute 
ADD CONSTRAINT FK_task_attr_node 
FOREIGN KEY (node_id) REFERENCES process_node(node_id);

CREATE INDEX IX_task_attr_node ON task_attribute(node_id);


-- 선행 프로세스 연결 (M:N 관계)
CREATE TABLE task_predecessor (
    predecessor_id      BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,          -- 현재 Task
    predecessor_node_id BIGINT NOT NULL,          -- 선행 Task
    condition_desc      NVARCHAR(500) NULL,       -- 선행 조건 설명
    is_mandatory        BIT DEFAULT 1,            -- 필수 선행 여부
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT UQ_task_predecessor UNIQUE (node_id, predecessor_node_id)
);

ALTER TABLE task_predecessor 
ADD CONSTRAINT FK_tp_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_predecessor 
ADD CONSTRAINT FK_tp_predecessor FOREIGN KEY (predecessor_node_id) REFERENCES process_node(node_id);

CREATE INDEX IX_task_predecessor_node ON task_predecessor(node_id);
CREATE INDEX IX_task_predecessor_pred ON task_predecessor(predecessor_node_id);
```

#### 5.2.5 Layer C: 운영 메타데이터 - 시스템 연계

```sql
-- ============================================
-- Layer C: Operation Metadata - System Integration
-- ============================================

-- 애플리케이션 시스템
CREATE TABLE application_system (
    system_id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    system_code         VARCHAR(30) NOT NULL UNIQUE,
    system_name         NVARCHAR(200) NOT NULL,
    system_type         VARCHAR(30) NOT NULL,
    vendor              NVARCHAR(100) NULL,
    version             VARCHAR(50) NULL,
    description         NVARCHAR(MAX) NULL,
    system_owner_id     BIGINT NULL,
    is_active           BIT DEFAULT 1,

    -- 테이블 메타정보 API 연동 설정 ⭐ 추가
    table_api_url       NVARCHAR(500) NULL,       -- 테이블 목록 조회 API URL
    table_api_auth_type VARCHAR(20) NULL,         -- 인증 방식 (NONE, BASIC, OAUTH, API_KEY)
    table_api_config    NVARCHAR(MAX) NULL,       -- API 설정 (JSON)
    column_api_url      NVARCHAR(500) NULL,       -- 컬럼 정보 조회 API URL

    created_at          DATETIME DEFAULT GETDATE(),
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_system_type CHECK (system_type IN ('ERP', 'MES', 'SCM', 'SRM', 'WMS', 'QMS', 'PLM', 'CRM', 'HR', 'FI', 'BI', 'PORTAL', 'LEGACY', 'OTHER')),
    CONSTRAINT CHK_api_auth_type CHECK (table_api_auth_type IN ('NONE', 'BASIC', 'OAUTH', 'API_KEY'))
);


-- 시스템 모듈
CREATE TABLE system_module (
    module_id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    system_id           BIGINT NOT NULL,
    module_code         VARCHAR(30) NOT NULL,
    module_name         NVARCHAR(200) NOT NULL,
    description         NVARCHAR(500) NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT UQ_system_module UNIQUE (system_id, module_code)
);

ALTER TABLE system_module 
ADD CONSTRAINT FK_module_system 
FOREIGN KEY (system_id) REFERENCES application_system(system_id);


-- 시스템 화면/메뉴
CREATE TABLE system_screen (
    screen_id           BIGINT IDENTITY(1,1) PRIMARY KEY,
    module_id           BIGINT NOT NULL,
    screen_code         VARCHAR(50) NOT NULL,
    screen_name         NVARCHAR(200) NOT NULL,
    transaction_code    VARCHAR(50) NULL,        -- ERP T-Code 등
    menu_path           NVARCHAR(500) NULL,
    screen_type         VARCHAR(20) NULL,
    url                 NVARCHAR(500) NULL,
    description         NVARCHAR(500) NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_screen_type CHECK (screen_type IN ('INPUT', 'INQUIRY', 'REPORT', 'MASTER', 'BATCH', 'APPROVAL', 'DASHBOARD'))
);

ALTER TABLE system_screen 
ADD CONSTRAINT FK_screen_module 
FOREIGN KEY (module_id) REFERENCES system_module(module_id);

CREATE INDEX IX_screen_module ON system_screen(module_id);
CREATE INDEX IX_screen_tcode ON system_screen(transaction_code);


-- 태스크-시스템 매핑
CREATE TABLE task_system_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    screen_id           BIGINT NOT NULL,
    usage_type          VARCHAR(20) NOT NULL,
    usage_description   NVARCHAR(500) NULL,
    is_primary          BIT DEFAULT 0,           -- 주요 시스템 여부
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_usage_type CHECK (usage_type IN ('EXECUTE', 'INQUIRY', 'APPROVAL', 'REPORT', 'INTERFACE'))
);

ALTER TABLE task_system_mapping 
ADD CONSTRAINT FK_tsm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_system_mapping 
ADD CONSTRAINT FK_tsm_screen FOREIGN KEY (screen_id) REFERENCES system_screen(screen_id);

CREATE INDEX IX_task_system_node ON task_system_mapping(node_id);
CREATE INDEX IX_task_system_screen ON task_system_mapping(screen_id);


-- 시스템 인터페이스
CREATE TABLE system_interface (
    interface_id        BIGINT IDENTITY(1,1) PRIMARY KEY,
    interface_code      VARCHAR(50) NOT NULL UNIQUE,
    interface_name      NVARCHAR(200) NOT NULL,
    source_system_id    BIGINT NOT NULL,
    target_system_id    BIGINT NOT NULL,
    interface_type      VARCHAR(20) NOT NULL,
    protocol            VARCHAR(30) NULL,
    frequency           VARCHAR(20) NULL,
    description         NVARCHAR(MAX) NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_interface_type CHECK (interface_type IN ('REALTIME', 'BATCH', 'EVENT', 'FILE', 'API', 'RFC')),
    CONSTRAINT CHK_if_frequency CHECK (frequency IN ('REALTIME', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'ON_DEMAND'))
);

ALTER TABLE system_interface 
ADD CONSTRAINT FK_if_source FOREIGN KEY (source_system_id) REFERENCES application_system(system_id);

ALTER TABLE system_interface 
ADD CONSTRAINT FK_if_target FOREIGN KEY (target_system_id) REFERENCES application_system(system_id);


-- 태스크-인터페이스 매핑
CREATE TABLE task_interface_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    interface_id        BIGINT NOT NULL,
    direction           VARCHAR(10) NOT NULL,
    description         NVARCHAR(500) NULL,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_if_direction CHECK (direction IN ('SEND', 'RECEIVE', 'BOTH'))
);

ALTER TABLE task_interface_mapping 
ADD CONSTRAINT FK_tim_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_interface_mapping 
ADD CONSTRAINT FK_tim_interface FOREIGN KEY (interface_id) REFERENCES system_interface(interface_id);
```

#### 5.2.6 Layer C: 운영 메타데이터 - 데이터 테이블 연결 ⭐ 변경

```sql
-- ============================================
-- Layer C: Operation Metadata - Data Table Link (변경)
-- ※ 테이블 메타정보는 외부 시스템에서 조회
-- ※ PAMS는 연결 정보만 저장
-- ============================================

-- 태스크-데이터테이블 연결 (외부 시스템 참조 방식)
CREATE TABLE task_data_table_link (
    link_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    system_id           BIGINT NOT NULL,          -- 어떤 시스템의 테이블인지
    schema_name         VARCHAR(50) NULL,         -- 스키마/데이터베이스명
    table_name          VARCHAR(128) NOT NULL,    -- 테이블명 (외부 시스템 참조)
    table_name_kor      NVARCHAR(200) NULL,       -- 한글명 (사용자 입력 또는 API 조회)
    link_type           VARCHAR(20) NOT NULL,     -- INPUT/OUTPUT/REFERENCE
    crud_type           VARCHAR(20) NULL,         -- C/R/U/D 조합
    key_columns         NVARCHAR(500) NULL,       -- 주요 사용 컬럼 (사용자 입력)
    filter_condition    NVARCHAR(500) NULL,       -- 조회 조건 (있는 경우)
    description         NVARCHAR(500) NULL,
    data_volume         VARCHAR(20) NULL,         -- 처리 데이터량
    is_critical         BIT DEFAULT 0,            -- 핵심 데이터 여부
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_by          BIGINT NULL,
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_link_type CHECK (link_type IN ('INPUT', 'OUTPUT', 'REFERENCE')),
    CONSTRAINT CHK_link_crud_type CHECK (crud_type IN ('C', 'R', 'U', 'D', 'CR', 'CU', 'CRU', 'CRUD', 'RU', 'RD', 'CRD', 'RUD')),
    CONSTRAINT CHK_link_data_volume CHECK (data_volume IN ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'))
);

ALTER TABLE task_data_table_link 
ADD CONSTRAINT FK_tdtl_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_data_table_link 
ADD CONSTRAINT FK_tdtl_system FOREIGN KEY (system_id) REFERENCES application_system(system_id);

CREATE INDEX IX_task_data_link_node ON task_data_table_link(node_id);
CREATE INDEX IX_task_data_link_system ON task_data_table_link(system_id);
CREATE INDEX IX_task_data_link_table ON task_data_table_link(table_name);
CREATE INDEX IX_task_data_link_type ON task_data_table_link(link_type);


-- 외부 테이블 조회 캐시 (선택적 - 성능 최적화용)
-- 외부 시스템에서 조회한 테이블 목록을 임시 캐싱
CREATE TABLE external_table_cache (
    cache_id            BIGINT IDENTITY(1,1) PRIMARY KEY,
    system_id           BIGINT NOT NULL,
    schema_name         VARCHAR(50) NULL,
    table_name          VARCHAR(128) NOT NULL,
    table_name_kor      NVARCHAR(200) NULL,
    table_type          VARCHAR(20) NULL,
    description         NVARCHAR(MAX) NULL,
    record_count        BIGINT NULL,
    cached_at           DATETIME DEFAULT GETDATE(),
    expires_at          DATETIME NULL,            -- 캐시 만료 시간

    CONSTRAINT UQ_external_table UNIQUE (system_id, schema_name, table_name)
);

ALTER TABLE external_table_cache 
ADD CONSTRAINT FK_etc_system 
FOREIGN KEY (system_id) REFERENCES application_system(system_id);

CREATE INDEX IX_ext_table_system ON external_table_cache(system_id);
CREATE INDEX IX_ext_table_expires ON external_table_cache(expires_at);
```

#### 5.2.7 Layer C: 운영 메타데이터 - KPI/리스크/통제

```sql
-- ============================================
-- Layer C: Operation Metadata - KPI/Risk/Control
-- ============================================

-- KPI 정의
CREATE TABLE kpi (
    kpi_id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    kpi_code            VARCHAR(30) NOT NULL UNIQUE,
    kpi_name            NVARCHAR(200) NOT NULL,
    kpi_category        VARCHAR(30) NULL,
    description         NVARCHAR(MAX) NULL,
    formula             NVARCHAR(500) NULL,
    unit                VARCHAR(30) NULL,
    target_value        NVARCHAR(100) NULL,
    measurement_cycle   VARCHAR(20) NULL,
    owner_org_id        BIGINT NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_kpi_category CHECK (kpi_category IN ('EFFICIENCY', 'QUALITY', 'COST', 'DELIVERY', 'SAFETY', 'COMPLIANCE')),
    CONSTRAINT CHK_kpi_cycle CHECK (measurement_cycle IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'))
);


-- 태스크-KPI 매핑
CREATE TABLE task_kpi_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    kpi_id              BIGINT NOT NULL,
    contribution_type   VARCHAR(20) NULL,
    weight              DECIMAL(5,2) NULL,
    description         NVARCHAR(500) NULL,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_contribution_type CHECK (contribution_type IN ('DIRECT', 'INDIRECT', 'SUPPORTING'))
);

ALTER TABLE task_kpi_mapping 
ADD CONSTRAINT FK_tkm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_kpi_mapping 
ADD CONSTRAINT FK_tkm_kpi FOREIGN KEY (kpi_id) REFERENCES kpi(kpi_id);


-- 리스크 정의
CREATE TABLE risk (
    risk_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    risk_code           VARCHAR(30) NOT NULL UNIQUE,
    risk_name           NVARCHAR(200) NOT NULL,
    risk_category       VARCHAR(30) NULL,
    description         NVARCHAR(MAX) NULL,
    likelihood          VARCHAR(10) NULL,
    impact              VARCHAR(10) NULL,
    risk_level          VARCHAR(10) NULL,
    mitigation          NVARCHAR(MAX) NULL,
    owner_org_id        BIGINT NULL,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_risk_category CHECK (risk_category IN ('OPERATIONAL', 'FINANCIAL', 'COMPLIANCE', 'IT', 'STRATEGIC')),
    CONSTRAINT CHK_likelihood CHECK (likelihood IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT CHK_impact CHECK (impact IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT CHK_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);


-- 통제 정의
CREATE TABLE control (
    control_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    control_code        VARCHAR(30) NOT NULL UNIQUE,
    control_name        NVARCHAR(200) NOT NULL,
    control_type        VARCHAR(30) NOT NULL,
    control_category    VARCHAR(30) NULL,
    description         NVARCHAR(MAX) NULL,
    frequency           VARCHAR(20) NULL,
    evidence            NVARCHAR(500) NULL,
    owner_org_id        BIGINT NULL,
    is_key_control      BIT DEFAULT 0,
    is_active           BIT DEFAULT 1,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_control_type CHECK (control_type IN ('PREVENTIVE', 'DETECTIVE', 'CORRECTIVE')),
    CONSTRAINT CHK_control_category CHECK (control_category IN ('MANUAL', 'IT_DEPENDENT', 'AUTOMATED', 'HYBRID'))
);


-- 태스크-리스크 매핑
CREATE TABLE task_risk_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    risk_id             BIGINT NOT NULL,
    description         NVARCHAR(500) NULL,
    created_at          DATETIME DEFAULT GETDATE()
);

ALTER TABLE task_risk_mapping 
ADD CONSTRAINT FK_trisk_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_risk_mapping 
ADD CONSTRAINT FK_trisk_risk FOREIGN KEY (risk_id) REFERENCES risk(risk_id);


-- 태스크-통제 매핑
CREATE TABLE task_control_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    control_id          BIGINT NOT NULL,
    linked_risk_id      BIGINT NULL,
    description         NVARCHAR(500) NULL,
    created_at          DATETIME DEFAULT GETDATE()
);

ALTER TABLE task_control_mapping 
ADD CONSTRAINT FK_tctrl_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_control_mapping 
ADD CONSTRAINT FK_tctrl_control FOREIGN KEY (control_id) REFERENCES control(control_id);

ALTER TABLE task_control_mapping 
ADD CONSTRAINT FK_tctrl_risk FOREIGN KEY (linked_risk_id) REFERENCES risk(risk_id);
```

#### 5.2.8 Layer C: 운영 메타데이터 - 문서/워크플로우

```sql
-- ============================================
-- Layer C: Operation Metadata - Document/Workflow
-- ============================================

-- 문서 유형
CREATE TABLE document_type (
    type_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    type_code           VARCHAR(30) NOT NULL UNIQUE,
    type_name           NVARCHAR(100) NOT NULL,
    description         NVARCHAR(500) NULL,
    retention_years     INT NULL
);

-- 초기 데이터
INSERT INTO document_type (type_code, type_name) VALUES
('SOP', '표준운영절차서'),
('WI', '작업지시서'),
('POLICY', '정책/규정'),
('MANUAL', '매뉴얼'),
('FORM', '양식/서식'),
('CHECKLIST', '체크리스트'),
('GUIDE', '가이드'),
('SPEC', '사양서');


-- 문서
CREATE TABLE document (
    doc_id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    doc_code            VARCHAR(50) NOT NULL UNIQUE,
    doc_name            NVARCHAR(300) NOT NULL,
    type_id             BIGINT NOT NULL,
    version             VARCHAR(20) NULL,
    file_path           NVARCHAR(500) NULL,
    file_size           BIGINT NULL,
    description         NVARCHAR(MAX) NULL,
    effective_date      DATE NULL,
    expiry_date         DATE NULL,
    owner_org_id        BIGINT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by          BIGINT NULL,
    created_at          DATETIME DEFAULT GETDATE(),
    updated_by          BIGINT NULL,
    updated_at          DATETIME NULL,

    CONSTRAINT CHK_doc_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'OBSOLETE'))
);

ALTER TABLE document 
ADD CONSTRAINT FK_doc_type FOREIGN KEY (type_id) REFERENCES document_type(type_id);


-- 태스크-문서 매핑
CREATE TABLE task_document_mapping (
    mapping_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    doc_id              BIGINT NOT NULL,
    relation_type       VARCHAR(20) NOT NULL,
    description         NVARCHAR(500) NULL,
    created_at          DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_doc_relation CHECK (relation_type IN ('REFERENCE', 'OUTPUT', 'TEMPLATE', 'CHECKLIST'))
);

ALTER TABLE task_document_mapping 
ADD CONSTRAINT FK_tdm_node FOREIGN KEY (node_id) REFERENCES process_node(node_id);

ALTER TABLE task_document_mapping 
ADD CONSTRAINT FK_tdm_doc FOREIGN KEY (doc_id) REFERENCES document(doc_id);


-- 승인 워크플로우
CREATE TABLE approval_request (
    request_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    entity_type         VARCHAR(30) NOT NULL,
    entity_id           BIGINT NOT NULL,
    request_type        VARCHAR(30) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requester_id        BIGINT NOT NULL,
    request_comment     NVARCHAR(MAX) NULL,
    requested_at        DATETIME DEFAULT GETDATE(),
    completed_at        DATETIME NULL,

    CONSTRAINT CHK_entity_type CHECK (entity_type IN ('PROCESS_NODE', 'BPMN_MODEL', 'DOCUMENT')),
    CONSTRAINT CHK_request_type CHECK (request_type IN ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'OBSOLETE')),
    CONSTRAINT CHK_request_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
);


-- 승인 이력
CREATE TABLE approval_history (
    history_id          BIGINT IDENTITY(1,1) PRIMARY KEY,
    request_id          BIGINT NOT NULL,
    approver_id         BIGINT NOT NULL,
    action              VARCHAR(20) NOT NULL,
    comment             NVARCHAR(MAX) NULL,
    action_at           DATETIME DEFAULT GETDATE(),

    CONSTRAINT CHK_approval_action CHECK (action IN ('APPROVE', 'REJECT', 'RETURN', 'FORWARD'))
);

ALTER TABLE approval_history 
ADD CONSTRAINT FK_ah_request FOREIGN KEY (request_id) REFERENCES approval_request(request_id);
```

### 5.3 엔터티 요약

| Layer | 엔터티 | 설명 |
|-------|--------|------|
| **A** | process_node | 프로세스 계층 구조 (L1~L4) |
| **A** | process_node_history | 버전/변경 이력 |
| **B** | bpmn_model | BPMN 다이어그램 |
| **B** | bpmn_element | BPMN 개별 요소 |
| **C** | task_attribute | Task 속성 (Task 정의, Input/Output, 수행주기 등) ⭐ |
| **C** | task_predecessor | 선행 프로세스 연결 ⭐ |
| **C** | organization, role | 조직/역할 마스터 |
| **C** | task_role_mapping | RACI 매핑 |
| **C** | application_system | 시스템 마스터 (테이블 API 설정 포함) ⭐ |
| **C** | system_module, system_screen | 모듈/화면 |
| **C** | task_system_mapping | 태스크-시스템 연결 |
| **C** | task_data_table_link | 태스크-데이터 테이블 연결 (외부 참조) ⭐ |
| **C** | external_table_cache | 외부 테이블 조회 캐시 ⭐ |
| **C** | kpi, risk, control | KPI/리스크/통제 마스터 |
| **C** | document | 문서 관리 |
| **C** | approval_request | 승인 워크플로우 |

---

## 6. 화면 설계 (UI/UX)

### 6.1 메뉴 구조

```
PAMS
├── 대시보드
│   ├── 운영 현황
│   └── 최근 활동
│
├── 프로세스 관리
│   ├── 전사 프로세스 맵 (L1~L4 + E2E 가상 섹션)
│   ├── E2E 프로세스 카탈로그  ⭐
│   ├── 프로세스 등록/수정
│   ├── 프로세스 상세 (포함 E2E 탭)
│   └── 표준/변형 비교
│
├── BPMN 모델링
│   ├── BPMN 에디터 (L3 / E2E 모드)
│   ├── 모델 목록 (`model_kind` 필터)
│   ├── 버전 비교
│   └── Call Activity L4 drill-down  ⭐
│
├── 메타데이터 (Layer C)
│   ├── Task 속성 (정의·I/O·선행·수행주체/주기)
│   ├── 시스템 연계 (시스템→화면 2-tier)
│   ├── RACI → Task 속성 통합 예정
│   └── KPI/리스크/통제
│
├── 데이터 연결
│   ├── 외부 테이블 조회
│   ├── 태스크-테이블 연결
│   └── 데이터 영향도 분석
│
├── 분석
│   ├── 운영 지식그래프 (E2E·L3·시스템·테이블)  ⭐
│   ├── 영향도 분석
│   ├── 통합 검색
│   └── Heat Map
│
├── 거버넌스
│   ├── 승인 대기함
│   ├── 변경 이력
│   └── 개선과제
│
└── 시스템 관리
    ├── 사용자/권한
    ├── 시스템 마스터 · 외부 API 설정 · 공통코드
    └── 조직/역할 마스터
```

### 6.2 핵심 화면 레이아웃

#### 6.2.1 전사 프로세스 맵 화면

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PAMS > 프로세스 관리 > 전사 프로세스 맵                          [사용자명] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────────┐  │
│  │ 프로세스 트리    │  │ 프로세스 상세                                   │  │
│  │                 │  │                                                 │  │
│  │ [검색]          │  │ ┌─────────────────────────────────────────────┐│  │
│  │                 │  │ │ STP-02-03-01 발주서 작성                    ││  │
│  │ ▼ L1 STP       │  │ │ Status: Published  Version: 1.2.0          ││  │
│  │   ▼ L2 발주관리 │  │ └─────────────────────────────────────────────┘│  │
│  │     ▼ L3 발주승인│  │                                                 │  │
│  │       ● L4 발주서│  │ [기본정보] [Task속성] [시스템] [데이터] [RACI]   │  │
│  │       ○ L4 승인 │  │ ─────────────────────────────────────────────── │  │
│  │       ○ L4 ERP생│  │                                                 │  │
│  │     ○ L3 견적관리│  │ ┌─ Task 정의 ────────────────────────────────┐ │  │
│  │   ○ L2 입고관리 │  │ │ 정의: 공급업체에 발송할 발주서를 작성한다   │ │  │
│  │ ○ L1 OTC       │  │ │ 목적: 구매 주문 내용을 공식 문서화          │ │  │
│  │ ○ L1 PTP       │  │ └───────────────────────────────────────────┘ │  │
│  │                 │  │                                                 │  │
│  │                 │  │ ┌─ Input/Output 정보 ────────────────────────┐ │  │
│  │ [+ 프로세스 추가]│  │ │ [Input]                                    │ │  │
│  │                 │  │ │  • 산출물: 승인된 구매요청서               │ │  │
│  │                 │  │ │  • 주요 Data: MM_PR_REQUEST, MM_MATERIAL   │ │  │
│  │                 │  │ │ [Output]                                   │ │  │
│  │                 │  │ │  • 산출물: 발주서 (PO Document)            │ │  │
│  │                 │  │ │  • 주요 Data: MM_PO_HEADER, MM_PO_DETAIL   │ │  │
│  │                 │  │ └───────────────────────────────────────────┘ │  │
│  │                 │  │                                                 │  │
│  └─────────────────┘  └─────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.2 Task 속성 입력 화면 ⭐ 변경

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PAMS > 메타데이터 관리 > Task 속성 관리                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  프로세스: STP-02-03-01 발주서 작성                     [저장] [승인요청]   │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ┌─ Task 정의 ──────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  업무 정의 *                                                          │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 승인된 구매요청을 기반으로 공급업체에 발송할 발주서를 작성한다   │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  업무 목적                                                            │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 구매 주문 내용을 공식 문서로 작성하여 공급업체에 정확한 주문 전달│   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Input 정보 ─────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  입력 산출물                                                          │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ • 승인된 구매요청서                                             │   │  │
│  │  │ • 공급업체 단가 계약서                                          │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  주요 입력 Data                              [+ 테이블 연결]         │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 시스템 │ 테이블명          │ 한글명       │ CRUD │              │ │  │
│  │  ├─────────────────────────────────────────────────────────────────┤ │  │
│  │  │ ERP   │ MM_PR_REQUEST     │ 구매요청     │  R   │  [삭제]      │ │  │
│  │  │ ERP   │ MM_MATERIAL       │ 자재마스터   │  R   │  [삭제]      │ │  │
│  │  │ ERP   │ MM_VENDOR         │ 공급업체     │  R   │  [삭제]      │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  입력 조건/전제조건                                                   │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 구매요청이 최종 승인 완료되어야 함                              │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 선행 프로세스 ──────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 순서 │ 프로세스 코드    │ 프로세스명        │ 필수 │            │ │  │
│  │  ├─────────────────────────────────────────────────────────────────┤ │  │
│  │  │  1  │ STP-02-01-03    │ 구매요청 승인     │  ✓  │  [삭제]     │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                     [+ 선행 추가]     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ Output 정보 ────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  출력 산출물                                                          │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ • 발주서 (PO Document)                                         │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  주요 출력 Data                              [+ 테이블 연결]         │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 시스템 │ 테이블명          │ 한글명       │ CRUD │              │ │  │
│  │  ├─────────────────────────────────────────────────────────────────┤ │  │
│  │  │ ERP   │ MM_PO_HEADER      │ 발주헤더     │  CR  │  [삭제]      │ │  │
│  │  │ ERP   │ MM_PO_DETAIL      │ 발주상세     │  CR  │  [삭제]      │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  출력 조건/완료 조건                                                  │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 발주서 저장 및 발주번호 채번 완료                               │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 수행주체 ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  담당 조직           담당 역할            RACI                        │  │
│  │  ┌────────────┐     ┌────────────┐       ┌─────────────────────┐    │  │
│  │  │ 구매팀    ▼│     │ 구매담당 ▼│       │ R: 구매담당         │    │  │
│  │  └────────────┘     └────────────┘       │ A: 구매팀장         │    │  │
│  │                                          │ C: 요청부서 담당자   │    │  │
│  │                                          │ I: 공급업체          │    │  │
│  │                                          └─────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 수행주기 ───────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  수행 주기             시작 조건                예상 소요시간         │  │
│  │  ┌──────────┐         ┌──────────────┐        ┌──────────────┐       │  │
│  │  │ 수시    ▼│         │구매요청 승인 │        │ 30분         │       │  │
│  │  │(이벤트)  │         │완료 시       │        └──────────────┘       │  │
│  │  └──────────┘         └──────────────┘                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 시스템 / 메뉴명 ────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  시스템              메뉴 경로                   트랜잭션코드          │  │
│  │  ┌────────────┐     ┌──────────────────────┐   ┌──────────────┐      │  │
│  │  │ ERP       ▼│     │ 구매관리 > 발주 >    │   │ ME21N        │      │  │
│  │  └────────────┘     │ 발주서 생성          │   └──────────────┘      │  │
│  │                     └──────────────────────┘                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 비고 (이슈관리 등) ─────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  이슈관리                                                             │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ • [ISSUE-001] 100만원 이상 발주 시 2인 견적 비교 규정 적용 필요│   │  │
│  │  │ • [IMPROVE-003] 발주서 자동 이메일 발송 기능 개선 예정         │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  예외 처리 방법                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ • 긴급 발주 시: 사유 기재 후 팀장 사전 구두 승인 필요          │   │  │
│  │  │ • 해외 발주 시: L/C 조건 확인 필수                             │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  기타 참고사항                                                        │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ • 발주서 작성 매뉴얼 참조: DOC-PUR-001                         │   │  │
│  │  │ • 관련 SOP: SOP-PUR-003 발주 프로세스                          │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 외부 테이블 연결 화면 ⭐ 변경

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PAMS > 데이터 연결 > 외부 테이블 조회                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 시스템 선택 및 테이블 검색 ─────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  시스템 선택          테이블명 검색                                   │  │
│  │  ┌────────────┐       ┌─────────────────────────────┐               │  │
│  │  │ ERP       ▼│       │ MM_                          │  [조회]      │  │
│  │  └────────────┘       └─────────────────────────────┘               │  │
│  │                                                                       │  │
│  │  ※ 테이블 목록은 ERP 시스템에서 실시간으로 조회됩니다.               │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 조회 결과 (ERP 시스템 테이블) ──────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 선택 │ 스키마    │ 테이블명        │ 한글명        │ 유형      │ │  │
│  │  ├─────────────────────────────────────────────────────────────────┤ │  │
│  │  │  □  │ dbo      │ MM_MATERIAL     │ 자재마스터    │ MASTER    │ │  │
│  │  │  □  │ dbo      │ MM_VENDOR       │ 공급업체      │ MASTER    │ │  │
│  │  │  □  │ dbo      │ MM_PR_REQUEST   │ 구매요청      │ TRANS     │ │  │
│  │  │  □  │ dbo      │ MM_PR_DETAIL    │ 구매요청상세  │ TRANS     │ │  │
│  │  │  □  │ dbo      │ MM_PO_HEADER    │ 발주헤더      │ TRANS     │ │  │
│  │  │  □  │ dbo      │ MM_PO_DETAIL    │ 발주상세      │ TRANS     │ │  │
│  │  │  □  │ dbo      │ MM_GR_HEADER    │ 입고헤더      │ TRANS     │ │  │
│  │  │  ...│ ...      │ ...             │ ...           │ ...       │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  조회 결과: 42건                              [컬럼 정보 보기]        │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 컬럼 정보 (MM_PO_HEADER) ───────────────────────────────────────────┐  │
│  │  ※ 컬럼 정보는 ERP 시스템 메타데이터에서 실시간 조회됩니다.          │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │ 컬럼명         │ 한글명       │ 타입         │ PK  │ NULL      │ │  │
│  │  ├─────────────────────────────────────────────────────────────────┤ │  │
│  │  │ PO_NO         │ 발주번호     │ VARCHAR(20)  │  ✓  │  N        │ │  │
│  │  │ PO_DATE       │ 발주일자     │ DATE         │     │  N        │ │  │
│  │  │ VENDOR_CD     │ 공급업체코드 │ VARCHAR(10)  │     │  N        │ │  │
│  │  │ PLANT_CD      │ 플랜트코드   │ VARCHAR(4)   │     │  N        │ │  │
│  │  │ TOTAL_AMT     │ 총금액       │ DECIMAL(18,2)│     │  Y        │ │  │
│  │  │ CURRENCY      │ 통화         │ VARCHAR(3)   │     │  Y        │ │  │
│  │  │ STATUS        │ 상태         │ VARCHAR(2)   │     │  N        │ │  │
│  │  │ CREATED_BY    │ 생성자       │ VARCHAR(20)  │     │  N        │ │  │
│  │  │ CREATED_AT    │ 생성일시     │ DATETIME     │     │  N        │ │  │
│  │  │ ...           │ ...          │ ...          │     │           │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │                                  [닫기]                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.2.4 데이터 영향도 분석 화면

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PAMS > 데이터 연결 > 데이터 영향도 분석                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ 검색 조건 ──────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  시스템        테이블명              변경 유형                        │  │
│  │  ┌──────────┐ ┌─────────────────┐   ┌──────────────────┐            │  │
│  │  │ ERP     ▼│ │ MM_VENDOR       │   │ 컬럼 추가/삭제  ▼│  [분석]    │  │
│  │  └──────────┘ └─────────────────┘   └──────────────────┘            │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 분석 결과: MM_VENDOR (공급업체마스터) 테이블 영향도 ────────────────┐  │
│  │                                                                       │  │
│  │  영향받는 프로세스: 12건                                              │  │
│  │                                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────┐   │  │
│  │  │ 프로세스 코드   │ 프로세스명        │ 연결유형 │ 담당조직      │   │  │
│  │  ├───────────────────────────────────────────────────────────────┤   │  │
│  │  │ STP-02-01-01   │ 구매요청 등록     │ REF     │ 구매팀        │   │  │
│  │  │ STP-02-03-01   │ 발주서 작성       │ REF     │ 구매팀        │   │  │
│  │  │ STP-02-03-03   │ ERP 발주 생성     │ REF     │ 구매팀        │   │  │
│  │  │ STP-03-01-02   │ 입고 예정 등록    │ REF     │ 자재팀        │   │  │
│  │  │ STP-04-01-01   │ 세금계산서 처리   │ REF     │ 재무팀        │   │  │
│  │  │ ...            │ ...              │ ...     │ ...           │   │  │
│  │  └───────────────────────────────────────────────────────────────┘   │  │
│  │                                                                       │  │
│  │  ┌─ 영향 조직 요약 ────────────────────────────────────────────────┐ │  │
│  │  │                                                                  │ │  │
│  │  │   구매팀 (6건)  ████████████████████                            │ │  │
│  │  │   자재팀 (3건)  ██████████                                      │ │  │
│  │  │   재무팀 (2건)  ██████                                          │ │  │
│  │  │   품질팀 (1건)  ███                                             │ │  │
│  │  │                                                                  │ │  │
│  │  └──────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                       │  │
│  │  [영향 프로세스 목록 다운로드]  [담당자 일괄 메일 발송]               │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 요구사항 | 측정 기준 |
|------|----------|----------|
| **응답시간** | 일반 화면 2초 이내, 검색 3초 이내 | P95 기준 |
| **동시접속** | 최소 30명 동시 접속 | 피크타임 기준 |
| **BPMN 렌더링** | 100개 요소 다이어그램 3초 이내 | 초기 로딩 |
| **검색 성능** | 10만 건 프로세스 중 1초 이내 검색 | Full-text 검색 |
| **데이터 조회** | 영향도 분석 5초 이내 | 복합 조인 쿼리 |
| **외부 API 조회** | 테이블 목록 조회 5초 이내 | 외부 시스템 연동 ⭐ |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|----------|
| **인증** | Supabase Auth 기반 SSO 연동 |
| **권한** | 역할 기반 접근제어 (RBAC) |
| **데이터 보호** | 전송 구간 암호화 (TLS 1.3), 민감정보 마스킹 |
| **감사 로그** | 모든 생성/수정/삭제/조회 이력 기록 |
| **세션 관리** | 30분 미사용 시 자동 로그아웃 |
| **외부 API 보안** | API Key/OAuth 기반 인증, 연결 정보 암호화 ⭐ |

### 7.3 가용성 및 운영

| 항목 | 요구사항 |
|------|----------|
| **가용성** | 99.5% (월간 다운타임 3.6시간 이내) |
| **백업** | 일 1회 전체 백업, 시간별 증분 백업 |
| **복구** | RPO 1시간, RTO 4시간 |
| **모니터링** | 시스템 리소스, 애플리케이션 로그, 에러 알림 |
| **외부 연동 모니터링** | API 연결 상태, 응답시간 모니터링 ⭐ |

### 7.4 확장성

| 항목 | 요구사항 |
|------|----------|
| **수평 확장** | 컨테이너 기반 Auto-scaling 지원 |
| **데이터 증가** | 연간 100만 건 트랜잭션 처리 가능 |
| **모듈 확장** | 플러그인 방식의 기능 확장 구조 |
| **외부 시스템 추가** | 신규 시스템 API 연동 용이 ⭐ |

---

## 8. 기술 아키텍처

### 8.1 기술 스택

| 영역 | 기술 | 버전 | 선정 사유 |
|------|------|------|----------|
| **프레임워크** | Next.js (App Router) | 16.x | 서버 컴포넌트, 최신 React 기능 활용 |
| **언어** | TypeScript | 5.x | 타입 안정성, strict 모드 적용 |
| **스타일링** | Tailwind CSS | 3.x | 유틸리티 기반 빠른 개발 |
| **UI 컴포넌트** | Shadcn/ui | latest | 커스터마이징 용이, 접근성 지원 |
| **인증/실시간** | Supabase | latest | Auth, Realtime, Storage 통합 |
| **AI 연동** | AI SDK | latest | 프로세스 분석/추천 기능 |
| **린팅** | ESLint | latest | Next/TS 규칙 기반 코드 품질 관리 |
| **데이터베이스** | MSSQL | 2017 | 기업 표준 RDBMS |
| **BPMN 에디터** | bpmn.js | latest | BPMN 2.0 표준 준수 |

### 8.1.1 상태 관리 전략 ⭐ 신규

| 상태 유형 | 도구 | 용도 | 패턴 |
|----------|------|------|------|
| 서버 상태 | TanStack Query v5 | API 데이터 캐싱, 동기화, 무효화 | useQuery, useMutation |
| 전역 클라이언트 상태 | Zustand | 사이드바 상태, 사용자 설정, UI 상태 | create store |
| 폼 상태 | react-hook-form + zod | 폼 입력값, 유효성 검증 | useForm |
| URL 상태 | nuqs | 필터, 정렬, 페이지네이션 | useQueryState |

#### 상태 관리 원칙
1. 서버 데이터는 반드시 TanStack Query 사용 - useState로 API 데이터 관리 금지
2. 전역 상태 최소화 - 꼭 필요한 경우만 Zustand 사용
3. URL 기반 상태 우선 - 필터/정렬은 URL 파라미터로 관리
4. 컴포넌트 로컬 상태 - UI 토글 등은 useState 허용

#### TanStack Query 키 컨벤션
```typescript
// 도메인별 키 팩토리 패턴 사용
export const processKeys = {
  all: ['process'] as const,
  lists: () => [...processKeys.all, 'list'] as const,
  list: (filters: ProcessFilters) => [...processKeys.lists(), filters] as const,
  details: () => [...processKeys.all, 'detail'] as const,
  detail: (id: number) => [...processKeys.details(), id] as const,
};
```

### 8.2 시스템 구성도

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAMS System Architecture                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Client Layer                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐    │   │
│  │  │                   Next.js 16 (App Router)                    │    │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │    │   │
│  │  │  │ React Server│ │   Shadcn    │ │   bpmn.js          │    │    │   │
│  │  │  │ Components  │ │     UI      │ │   Editor           │    │    │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────────────┘    │    │   │
│  │  │                                                              │    │   │
│  │  │  ┌─────────────────────────────────────────────────────┐    │    │   │
│  │  │  │              Tailwind CSS + TypeScript               │    │    │   │
│  │  │  └─────────────────────────────────────────────────────┘    │    │   │
│  │  └─────────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Service Layer                                 │   │
│  │  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────┐  │   │
│  │  │   Supabase Auth   │  │  Supabase Storage │  │    AI SDK       │  │   │
│  │  │   (인증/세션)      │  │  (파일/이미지)    │  │  (분석/추천)    │  │   │
│  │  └───────────────────┘  └───────────────────┘  └─────────────────┘  │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Next.js API Routes                         │  │   │
│  │  │  /api/process  /api/bpmn  /api/metadata  /api/analysis       │  │   │
│  │  │  /api/external-tables ⭐ 외부 테이블 조회 API                  │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Data Layer                                    │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                     MSSQL 2017                                 │  │   │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐  │  │   │
│  │  │  │  Layer A    │ │  Layer B    │ │       Layer C           │  │  │   │
│  │  │  │  Process    │ │  BPMN       │ │  Operation Metadata     │  │  │   │
│  │  │  │  Structure  │ │  Models     │ │  Task속성, System, Link │  │  │   │
│  │  │  └─────────────┘ └─────────────┘ └─────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  External System Integration ⭐ 변경                 │   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │    ERP      │ │    MES      │ │    SCM      │ │    SRM      │   │   │
│  │  │  (SAP 등)   │ │             │ │             │ │             │   │   │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘   │   │
│  │         │               │               │               │           │   │
│  │         ▼               ▼               ▼               ▼           │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              External Metadata API Layer                    │   │   │
│  │  │  • 테이블 목록 조회 API                                      │   │   │
│  │  │  • 컬럼 메타정보 조회 API                                    │   │   │
│  │  │  ※ PAMS는 연결 정보만 저장, 메타정보는 실시간 조회           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 프로젝트 구조 (Next.js App Router)

```
pams/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (main)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── process/
│   │   │   ├── page.tsx              # 프로세스 목록
│   │   │   ├── [nodeId]/
│   │   │   │   └── page.tsx          # 프로세스 상세
│   │   │   └── new/
│   │   │       └── page.tsx          # 프로세스 등록
│   │   ├── bpmn/
│   │   │   ├── page.tsx              # BPMN 목록
│   │   │   └── [modelId]/
│   │   │       └── page.tsx          # BPMN 에디터
│   │   ├── metadata/
│   │   │   ├── task-attribute/       # Task 속성 관리 ⭐ 변경
│   │   │   │   └── [nodeId]/
│   │   │   │       └── page.tsx
│   │   │   ├── raci/
│   │   │   │   └── page.tsx
│   │   │   └── system/
│   │   │       └── page.tsx
│   │   ├── data/                     # 데이터 연결 ⭐ 변경
│   │   │   ├── external-tables/      # 외부 테이블 조회
│   │   │   │   └── page.tsx
│   │   │   ├── link/                 # 태스크-테이블 연결
│   │   │   │   └── page.tsx
│   │   │   └── impact/               # 데이터 영향도 분석
│   │   │       └── page.tsx
│   │   ├── analysis/
│   │   │   ├── impact/
│   │   │   │   └── page.tsx
│   │   │   └── search/
│   │   │       └── page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── process/
│   │   │   └── route.ts
│   │   ├── bpmn/
│   │   │   └── route.ts
│   │   ├── metadata/
│   │   │   ├── task-attribute/       # Task 속성 API ⭐ 변경
│   │   │   │   └── route.ts
│   │   │   └── data-link/            # 데이터 연결 API ⭐ 변경
│   │   │       └── route.ts
│   │   ├── external/                  # 외부 시스템 연동 ⭐ 추가
│   │   │   ├── tables/               # 테이블 목록 조회
│   │   │   │   └── route.ts
│   │   │   └── columns/              # 컬럼 정보 조회
│   │   │       └── route.ts
│   │   └── analysis/
│   │       └── route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                           # Shadcn/ui 컴포넌트
│   ├── process/
│   │   ├── ProcessTree.tsx
│   │   ├── ProcessDetail.tsx
│   │   └── ProcessForm.tsx
│   ├── bpmn/
│   │   ├── BpmnEditor.tsx
│   │   └── BpmnViewer.tsx
│   ├── metadata/
│   │   ├── TaskAttributeForm.tsx     # Task 속성 입력 폼 ⭐ 변경
│   │   ├── PredecessorSelect.tsx     # 선행 프로세스 선택 ⭐ 추가
│   │   ├── RaciMatrix.tsx
│   │   └── SystemMapping.tsx
│   ├── data/
│   │   ├── ExternalTableBrowser.tsx  # 외부 테이블 조회 ⭐ 변경
│   │   ├── DataTableLink.tsx         # 데이터 테이블 연결 ⭐ 변경
│   │   ├── ColumnInfoViewer.tsx      # 컬럼 정보 조회 ⭐ 추가
│   │   └── DataImpactChart.tsx
│   └── common/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── SearchBar.tsx
├── lib/
│   ├── db/
│   │   ├── mssql.ts                  # MSSQL 연결
│   │   └── queries/
│   │       ├── process.ts
│   │       ├── bpmn.ts
│   │       └── metadata.ts
│   ├── services/                      # 비즈니스 로직 레이어 ⭐ 신규
│   │   ├── process.service.ts         # 프로세스 도메인 로직
│   │   ├── bpmn.service.ts            # BPMN 도메인 로직
│   │   ├── metadata.service.ts        # 메타데이터 도메인 로직
│   │   ├── external.service.ts        # 외부 시스템 연동 로직
│   │   └── index.ts                   # 서비스 export
│   ├── external/                      # 외부 시스템 연동 ⭐ 추가
│   │   ├── client.ts                 # 외부 API 클라이언트
│   │   ├── table-fetcher.ts          # 테이블 목록 조회
│   │   └── column-fetcher.ts         # 컬럼 정보 조회
│   ├── api/                           # API 유틸리티 ⭐ 신규
│   │   ├── client.ts                  # 공통 API 클라이언트
│   │   ├── error-handler.ts           # 에러 핸들링
│   │   └── response.ts                # 응답 포맷팅
│   ├── store/                         # Zustand 스토어 ⭐ 신규
│   │   ├── ui.store.ts                # UI 상태 (사이드바 등)
│   │   ├── user.store.ts              # 사용자 설정
│   │   └── index.ts
│   ├── query/                         # TanStack Query ⭐ 신규
│   │   ├── client.ts                  # QueryClient 설정
│   │   ├── keys.ts                    # 쿼리 키 팩토리
│   │   └── hooks/                     # 도메인별 쿼리 훅
│   │       ├── useProcess.ts
│   │       ├── useBpmn.ts
│   │       └── useMetadata.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── ai/
│   │   └── analysis.ts               # AI SDK 연동
│   └── utils/
│       ├── validators.ts
│       └── formatters.ts
├── types/
│   ├── process.ts
│   ├── bpmn.ts
│   ├── metadata.ts
│   ├── external.ts                    # 외부 시스템 타입 ⭐ 추가
│   └── database.ts
├── hooks/
│   ├── useProcess.ts
│   ├── useBpmn.ts
│   ├── useMetadata.ts
│   └── useExternalTables.ts          # 외부 테이블 조회 ⭐ 추가
├── .env.local
├── .eslintrc.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 8.4 TypeScript 타입 정의 예시

```typescript
// types/process.ts

export type ProcessLevel = 'L1' | 'L2' | 'L3' | 'L4';

export type ProcessStatus = 
  | 'DRAFT' 
  | 'IN_REVIEW' 
  | 'APPROVED' 
  | 'PUBLISHED' 
  | 'OBSOLETE';

export interface ProcessNode {
  nodeId: number;
  parentNodeId: number | null;
  level: ProcessLevel;
  code: string;
  name: string;
  description: string | null;
  status: ProcessStatus;
  ownerOrgId: number | null;
  version: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  isStandard: boolean;
  variantOf: number | null;
  sortOrder: number;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

// types/metadata.ts ⭐ 변경

export type FrequencyType = 
  | 'AD_HOC' 
  | 'DAILY' 
  | 'WEEKLY' 
  | 'MONTHLY' 
  | 'QUARTERLY' 
  | 'YEARLY' 
  | 'EVENT_DRIVEN';

export type RaciType = 
  | 'RESPONSIBLE' 
  | 'ACCOUNTABLE' 
  | 'CONSULTED' 
  | 'INFORMED';

export type DataLinkType = 'INPUT' | 'OUTPUT' | 'REFERENCE';

export type CrudType = 
  | 'C' | 'R' | 'U' | 'D' 
  | 'CR' | 'CU' | 'CRU' | 'CRUD' 
  | 'RU' | 'RD' | 'CRD' | 'RUD';

// Task 속성 (기존 5W1H 대체) ⭐ 변경
export interface TaskAttribute {
  attrId: number;
  nodeId: number;

  // Task 정의
  definition: string | null;
  purpose: string | null;

  // Input 정보
  inputDeliverable: string | null;
  inputDataDesc: string | null;
  inputCondition: string | null;

  // Output 정보
  outputDeliverable: string | null;
  outputDataDesc: string | null;
  outputCondition: string | null;

  // 수행주기
  frequency: FrequencyType | null;
  triggerEvent: string | null;
  duration: string | null;

  // 비고
  issues: string | null;
  exceptions: string | null;
  remarks: string | null;

  version: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

// 선행 프로세스 연결 ⭐ 추가
export interface TaskPredecessor {
  predecessorId: number;
  nodeId: number;
  predecessorNodeId: number;
  conditionDesc: string | null;
  isMandatory: boolean;
  createdAt: Date;
}

// 태스크-데이터 테이블 연결 (외부 참조 방식) ⭐ 변경
export interface TaskDataTableLink {
  linkId: number;
  nodeId: number;
  systemId: number;
  schemaName: string | null;
  tableName: string;
  tableNameKor: string | null;
  linkType: DataLinkType;
  crudType: CrudType | null;
  keyColumns: string | null;
  filterCondition: string | null;
  description: string | null;
  dataVolume: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' | null;
  isCritical: boolean;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

// types/external.ts ⭐ 추가

// 외부 시스템 테이블 정보 (API 조회 결과)
export interface ExternalTable {
  schemaName: string | null;
  tableName: string;
  tableNameKor: string | null;
  tableType: string | null;
  description: string | null;
  recordCount: number | null;
}

// 외부 시스템 컬럼 정보 (API 조회 결과)
export interface ExternalColumn {
  columnName: string;
  columnNameKor: string | null;
  dataType: string;
  dataLength: number | null;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  defaultValue: string | null;
  description: string | null;
}

// 시스템 API 설정
export interface SystemApiConfig {
  tableApiUrl: string | null;
  tableApiAuthType: 'NONE' | 'BASIC' | 'OAUTH' | 'API_KEY' | null;
  tableApiConfig: Record<string, unknown> | null;
  columnApiUrl: string | null;
}
```

### 8.5 외부 시스템 연계 ⭐ 변경

| 연계 대상 | 연계 방식 | 데이터 | 주기 |
|----------|----------|--------|------|
| **ERP** | REST API / RFC | 조직, 사용자, 시스템 메타데이터 | 일 1회 |
| **ERP** | REST API | **테이블 목록, 컬럼 메타정보** ⭐ | 실시간 |
| **MES** | REST API | 시스템/화면 정보, **테이블 목록** ⭐ | 실시간 |
| **SCM** | REST API | **테이블 목록, 컬럼 메타정보** ⭐ | 실시간 |
| **AD/LDAP** | Supabase Auth 연동 | 사용자 인증 | 실시간 |
| **장애관리** | Webhook | 장애 티켓 연동 | 실시간 |

**외부 테이블 조회 API 연동 방식:**

```
┌─────────────────────────────────────────────────────────────────┐
│  외부 시스템 테이블/컬럼 메타정보 조회 흐름                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 테이블 목록 조회                                            │
│  ───────────────────────────────────────────────────            │
│  PAMS  ──▶  GET /api/external/tables?systemId={id}             │
│         ◀──  { tables: [{ tableName, tableNameKor, ... }] }    │
│                                                                 │
│  2. 컬럼 정보 조회                                              │
│  ───────────────────────────────────────────────────            │
│  PAMS  ──▶  GET /api/external/columns?systemId={id}&table={nm} │
│         ◀──  { columns: [{ columnName, dataType, ... }] }      │
│                                                                 │
│  3. 내부 처리 흐름                                              │
│  ───────────────────────────────────────────────────            │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐   │
│  │ PAMS API    │────▶│ External Client │────▶│ ERP/MES/SCM │   │
│  │ Route       │     │ (lib/external)  │     │ System API  │   │
│  └─────────────┘     └─────────────────┘     └─────────────┘   │
│        │                                            │           │
│        │              캐시 (선택적)                  │           │
│        ▼                                            │           │
│  ┌─────────────────┐                               │           │
│  │ external_table_ │◀──────────────────────────────┘           │
│  │ cache (옵션)    │  TTL 기반 캐싱                             │
│  └─────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. 에러 핸들링 표준 ⭐ 신규

### 9.1 에러 응답 형식

모든 API 응답은 아래 형식을 따릅니다.

```typescript
// 성공 응답
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// 에러 응답
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;           // 에러 코드 (E001, E002, ...)
    message: string;        // 사용자 표시 메시지 (다국어)
    details?: string;       // 상세 설명 (개발자용)
    field?: string;         // 유효성 검증 실패 시 필드명
    timestamp: string;      // ISO 8601 형식
    traceId?: string;       // 추적 ID (로그 연계)
  };
}
```

### 9.2 에러 코드 체계

#### 9.2.1 에러 코드 분류

| 범위 | 카테고리 | 설명 |
|------|----------|------|
| E001-E099 | VALIDATION | 입력값 유효성 검증 실패 |
| E100-E199 | AUTH | 인증 관련 오류 |
| E200-E299 | PERMISSION | 권한 관련 오류 |
| E300-E399 | RESOURCE | 리소스 관련 오류 |
| E400-E499 | BUSINESS | 비즈니스 로직 오류 |
| E500-E599 | SYSTEM | 시스템 오류 |
| E600-E699 | EXTERNAL | 외부 시스템 연동 오류 |

#### 9.2.2 상세 에러 코드 정의

| 코드 | HTTP | 카테고리 | 한국어 메시지 | English | 繁體中文 | 재시도 |
|------|------|----------|--------------|---------|----------|--------|
| **E001** | 400 | VALIDATION | 필수 입력값이 누락되었습니다. | Required field is missing. | 必填欄位缺失。 | N |
| **E002** | 400 | VALIDATION | 입력값 형식이 올바르지 않습니다. | Invalid input format. | 輸入格式無效。 | N |
| **E003** | 400 | VALIDATION | 입력값이 허용 범위를 초과했습니다. | Input value exceeds allowed range. | 輸入值超出允許範圍。 | N |
| **E004** | 400 | VALIDATION | 중복된 값이 존재합니다. | Duplicate value exists. | 存在重複值。 | N |
| **E005** | 400 | VALIDATION | 입력값 길이가 초과되었습니다. | Input length exceeds limit. | 輸入長度超過限制。 | N |
| **E101** | 401 | AUTH | 인증이 필요합니다. 로그인해주세요. | Authentication required. Please login. | 需要認證。請登入。 | N |
| **E102** | 401 | AUTH | 인증 토큰이 만료되었습니다. | Authentication token has expired. | 認證令牌已過期。 | N |
| **E103** | 401 | AUTH | 인증 토큰이 유효하지 않습니다. | Invalid authentication token. | 認證令牌無效。 | N |
| **E104** | 401 | AUTH | 계정이 비활성화되었습니다. | Account has been deactivated. | 帳戶已被停用。 | N |
| **E201** | 403 | PERMISSION | 접근 권한이 없습니다. | Access denied. | 拒絕訪問。 | N |
| **E202** | 403 | PERMISSION | 해당 작업을 수행할 권한이 없습니다. | Not authorized to perform this action. | 無權執行此操作。 | N |
| **E203** | 403 | PERMISSION | 승인 권한이 없습니다. | Not authorized to approve. | 無批准權限。 | N |
| **E301** | 404 | RESOURCE | 요청한 데이터를 찾을 수 없습니다. | Requested data not found. | 找不到請求的數據。 | N |
| **E302** | 404 | RESOURCE | 프로세스를 찾을 수 없습니다. | Process not found. | 找不到流程。 | N |
| **E303** | 404 | RESOURCE | BPMN 모델을 찾을 수 없습니다. | BPMN model not found. | 找不到BPMN模型。 | N |
| **E304** | 409 | RESOURCE | 이미 존재하는 코드입니다. | Code already exists. | 代碼已存在。 | N |
| **E305** | 409 | RESOURCE | 다른 사용자가 수정 중입니다. | Being edited by another user. | 另一位用戶正在編輯。 | Y |
| **E401** | 400 | BUSINESS | 하위 프로세스가 존재하여 삭제할 수 없습니다. | Cannot delete: child processes exist. | 無法刪除：存在子流程。 | N |
| **E402** | 400 | BUSINESS | 승인 대기 중인 항목은 수정할 수 없습니다. | Cannot modify item pending approval. | 無法修改待批准項目。 | N |
| **E403** | 400 | BUSINESS | Published 상태는 직접 수정할 수 없습니다. | Cannot directly modify Published status. | 無法直接修改已發布狀態。 | N |
| **E404** | 400 | BUSINESS | 순환 참조가 감지되었습니다. | Circular reference detected. | 檢測到循環引用。 | N |
| **E405** | 400 | BUSINESS | 필수 속성이 입력되지 않아 승인 요청할 수 없습니다. | Required attributes missing for approval. | 缺少必要屬性，無法申請批准。 | N |
| **E501** | 500 | SYSTEM | 시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요. | System error occurred. Please try again later. | 發生系統錯誤。請稍後再試。 | Y |
| **E502** | 500 | SYSTEM | 데이터베이스 오류가 발생했습니다. | Database error occurred. | 發生數據庫錯誤。 | Y |
| **E503** | 503 | SYSTEM | 서비스를 일시적으로 사용할 수 없습니다. | Service temporarily unavailable. | 服務暫時不可用。 | Y |
| **E601** | 502 | EXTERNAL | 외부 시스템 연결에 실패했습니다. | External system connection failed. | 外部系統連接失敗。 | Y |
| **E602** | 504 | EXTERNAL | 외부 시스템 응답 시간이 초과되었습니다. | External system response timeout. | 外部系統響應超時。 | Y |
| **E603** | 502 | EXTERNAL | 외부 시스템에서 오류가 반환되었습니다. | External system returned an error. | 外部系統返回錯誤。 | Y |
| **E604** | 503 | EXTERNAL | 외부 시스템이 일시적으로 사용 불가합니다. | External system temporarily unavailable. | 外部系統暫時不可用。 | Y |

### 9.3 에러 처리 흐름

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         에러 핸들링 흐름                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │  API 호출   │────▶│  에러 발생  │────▶│ 에러 분류   │────▶│ 응답 생성 │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └───────────┘ │
│                             │                   │                   │       │
│                             │                   │                   │       │
│                             ▼                   ▼                   ▼       │
│                      ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│                      │ 로그 기록   │     │ 다국어 메시지│     │클라이언트 │ │
│                      │ (traceId)  │     │ 조회        │     │ 표시      │ │
│                      └─────────────┘     └─────────────┘     └───────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.4 클라이언트 에러 처리

```typescript
// lib/api/error-handler.ts

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details?: string,
    public field?: string,
    public traceId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  // 재시도 가능 여부 확인
  get isRetryable(): boolean {
    return ['E305', 'E501', 'E502', 'E503', 'E601', 'E602', 'E603', 'E604'].includes(this.code);
  }

  // 인증 오류 여부 확인
  get isAuthError(): boolean {
    return this.code.startsWith('E1');
  }

  // 권한 오류 여부 확인
  get isPermissionError(): boolean {
    return this.code.startsWith('E2');
  }
}
```

### 9.5 Toast/알림 표시 가이드

| 에러 유형 | 표시 방식 | 지속 시간 | 액션 |
|----------|----------|----------|------|
| VALIDATION | Toast (Warning) | 5초 | 해당 필드로 포커스 이동 |
| AUTH | Modal (Error) | - | 로그인 페이지로 이동 버튼 |
| PERMISSION | Toast (Error) | 5초 | 없음 |
| RESOURCE (404) | Toast (Warning) | 5초 | 목록으로 이동 버튼 |
| BUSINESS | Toast (Warning) | 5초 | 상황에 따라 다름 |
| SYSTEM | Toast (Error) | 10초 | 재시도 버튼 (retryable인 경우) |
| EXTERNAL | Toast (Error) | 10초 | 재시도 버튼 |

---

## 10. 국제화 (i18n) ⭐ 신규

### 10.1 지원 언어

| 언어 | Locale 코드 | 표시명 | 기본 여부 |
|------|-------------|--------|----------|
| 한국어 | ko | 한국어 | ● (기본) |
| 영어 | en | English | |
| 대만 (번체) | zh-TW | 繁體中文 | |

### 10.2 다국어 적용 범위

#### 10.2.1 UI 요소 (정적 번역)

| 대상 | 번역 방식 | 예시 |
|------|----------|------|
| 메뉴명 | JSON 파일 | "프로세스 관리" / "Process Management" / "流程管理" |
| 버튼 라벨 | JSON 파일 | "저장" / "Save" / "保存" |
| 폼 라벨 | JSON 파일 | "프로세스명" / "Process Name" / "流程名稱" |
| 테이블 헤더 | JSON 파일 | "상태" / "Status" / "狀態" |
| 에러 메시지 | DB + JSON | 에러 코드별 다국어 메시지 |
| 상태값 | JSON 파일 | "승인됨" / "Approved" / "已批准" |

#### 10.2.2 비즈니스 데이터 (동적 번역)

| 대상 | 번역 방식 | 필수 여부 |
|------|----------|----------|
| 프로세스명 | DB (i18n 테이블) | 한국어 필수, 기타 선택 |
| 프로세스 설명 | DB (i18n 테이블) | 한국어 필수, 기타 선택 |
| Task 정의 | DB (i18n 테이블) | 한국어 필수, 기타 선택 |
| 조직명 | DB (i18n 테이블) | 한국어 필수, 기타 선택 |

#### 10.2.3 번역 제외 대상

| 대상 | 사유 |
|------|------|
| 프로세스 코드 | 전사 공통 식별자 |
| 시스템 코드 | 기술 식별자 |
| 트랜잭션 코드 | ERP T-Code 등 표준 코드 |
| 에러 코드 | 기술 식별자 |

### 10.3 기술 구현

#### 10.3.1 정적 번역 파일 구조

```
messages/
├── ko.json          # 한국어 (기본)
├── en.json          # 영어
└── zh-TW.json       # 대만 번체
```

**messages/ko.json 예시:**
```json
{
  "common": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정",
    "search": "검색"
  },
  "menu": {
    "dashboard": "대시보드",
    "process": "프로세스 관리",
    "bpmn": "BPMN 모델링"
  },
  "status": {
    "DRAFT": "초안",
    "IN_REVIEW": "검토 중",
    "APPROVED": "승인됨",
    "PUBLISHED": "배포됨",
    "OBSOLETE": "폐기됨"
  }
}
```

**messages/en.json 예시:**
```json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search"
  },
  "menu": {
    "dashboard": "Dashboard",
    "process": "Process Management",
    "bpmn": "BPMN Modeling"
  },
  "status": {
    "DRAFT": "Draft",
    "IN_REVIEW": "In Review",
    "APPROVED": "Approved",
    "PUBLISHED": "Published",
    "OBSOLETE": "Obsolete"
  }
}
```

**messages/zh-TW.json 예시:**
```json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "刪除",
    "edit": "編輯",
    "search": "搜尋"
  },
  "menu": {
    "dashboard": "儀表板",
    "process": "流程管理",
    "bpmn": "BPMN建模"
  },
  "status": {
    "DRAFT": "草稿",
    "IN_REVIEW": "審核中",
    "APPROVED": "已批准",
    "PUBLISHED": "已發布",
    "OBSOLETE": "已廢棄"
  }
}
```

#### 10.3.2 다국어 DB 테이블

```sql
-- 프로세스 노드 다국어 테이블
CREATE TABLE process_node_i18n (
    i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    node_id             BIGINT NOT NULL,
    locale              VARCHAR(10) NOT NULL,  -- ko, en, zh-TW
    name                NVARCHAR(200) NOT NULL,
    description         NVARCHAR(MAX) NULL,

    CONSTRAINT UQ_process_node_i18n UNIQUE (node_id, locale),
    CONSTRAINT CHK_process_node_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
);

-- Task 속성 다국어 테이블
CREATE TABLE task_attribute_i18n (
    i18n_id             BIGINT IDENTITY(1,1) PRIMARY KEY,
    attr_id             BIGINT NOT NULL,
    locale              VARCHAR(10) NOT NULL,
    definition          NVARCHAR(MAX) NULL,
    purpose             NVARCHAR(1000) NULL,
    input_deliverable   NVARCHAR(MAX) NULL,
    output_deliverable  NVARCHAR(MAX) NULL,

    CONSTRAINT UQ_task_attr_i18n UNIQUE (attr_id, locale),
    CONSTRAINT CHK_task_attr_locale CHECK (locale IN ('ko', 'en', 'zh-TW'))
);
```

### 10.4 다국어 용어집

| 한국어 | English | 繁體中文 |
|--------|---------|----------|
| 프로세스 | Process | 流程 |
| 업무 | Task | 任務 |
| 승인 | Approval | 批准 |
| 검토 | Review | 審核 |
| 발주 | Purchase Order | 採購訂單 |
| 입고 | Goods Receipt | 收貨 |
| 자재 | Material | 物料 |
| 공급업체 | Vendor/Supplier | 供應商 |

---

## 11. 프로젝트 로드맵

### 11.1 전체 일정

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PAMS 구축 로드맵                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 0: 준비 (1개월)                                                      │
│  ├── 분류체계 정의 (L1~L4)                                                  │
│  ├── 코드 체계 확정                                                         │
│  ├── 표준 속성 정의                                                         │
│  ├── 외부 시스템 API 규격 협의 ⭐                                            │
│  └── 파일럿 범위 선정                                                       │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  Phase 1: MVP 구축 (3개월)                                                  │
│  ├── 프로세스 계층 관리                                                     │
│  ├── BPMN 모델링                                                            │
│  ├── Task 속성 관리 ⭐                                                       │
│  ├── 시스템/데이터 테이블 연결 (외부 API 연동) ⭐                             │
│  ├── 버전/승인 관리                                                         │
│  └── 통합 검색/영향도 분석                                                  │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  Phase 2: 고도화 (3개월)                                                    │
│  ├── KPI/리스크/통제 연결                                                   │
│  ├── 표준/변형 비교                                                         │
│  ├── 대시보드 고도화                                                        │
│  └── 추가 외부 시스템 연동                                                  │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  Phase 3: 확장 (3개월)                                                      │
│  ├── AI 기반 분석/추천                                                      │
│  ├── Heat Map/성숙도 진단                                                   │
│  ├── 전사 확대                                                              │
│  └── 고급 분석 기능                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 MVP 상세 일정 (3개월)

| 주차 | 작업 항목 | 산출물 |
|------|----------|--------|
| **1-2주** | 개발환경 구축, DB 스키마 생성, 외부 API 연동 테스트 | 개발환경, DDL, API 연동 |
| **3-4주** | 프로세스 계층 관리 기능 | 트리 UI, CRUD API |
| **5-6주** | BPMN 에디터 통합 | BPMN 편집/저장 |
| **7-8주** | Task 속성 관리 기능 ⭐ | 속성 입력 폼, API |
| **9-10주** | 시스템/데이터 테이블 연결 (외부 API) ⭐ | 연결 UI, 영향도 쿼리 |
| **11주** | 버전/승인 워크플로우 | 승인 프로세스 |
| **12주** | 통합 테스트, 버그 수정 | 테스트 리포트 |

### 11.3 파일럿 대상 영역 권장

| 순위 | 영역 | E2E 흐름 | 선정 사유 |
|------|------|----------|----------|
| 1 | **구매-입고** | Source to Pay | 프로세스 명확, 시스템 연계 다양 |
| 2 | 생산계획-실적 | Plan to Produce | 제조업 핵심, MES 연계 검증 |
| 3 | 수주-출하 | Order to Cash | 고객 접점, E2E 흐름 명확 |

---

## 12. 거버넌스 체계

### 12.1 역할 정의

| 역할 | 책임 | 권한 |
|------|------|------|
| **Process Owner** | 프로세스 정의/변경 책임 | 승인 요청, 변경 확정 |
| **Process Architect** | 전사 체계/표준 관리 | L1~L2 정의, 표준 승인 |
| **BPM Administrator** | 시스템 운영, 권한 관리 | 사용자 관리, 코드 관리 |
| **Reviewer** | 프로세스 검토 | 리뷰 코멘트, 검토 완료 |
| **System Owner** | 시스템 메타정보 관리 | 시스템/화면 정보 관리 |
| **Data Steward** | 데이터 테이블 연결 검토 | 데이터 연결 승인 ⭐ |
| **Auditor** | 통제/감사 점검 | 조회 전용, 감사 리포트 |

### 12.2 승인 워크플로우

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         승인 워크플로우                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────┐     ┌────────────┐     ┌──────────┐     ┌───────────┐          │
│  │ DRAFT  │────▶│ IN_REVIEW  │────▶│ APPROVED │────▶│ PUBLISHED │          │
│  └────────┘     └────────────┘     └──────────┘     └───────────┘          │
│      │               │                  │                │                  │
│      │               │                  │                │                  │
│   작성자          검토자            승인자           배포                   │
│                 (Process         (Level별            완료                   │
│                   Owner)          상이)                                     │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  Level별 승인 권한:                                                         │
│  • L1/L2: Process Architect 승인 필수                                       │
│  • L3: Process Owner 승인                                                   │
│  • L4: Process Owner 또는 위임자 승인                                       │
│  • 데이터 테이블 연결 변경: Data Steward 검토 필요 ⭐                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 운영 원칙

1. **L1/L2는 전사 공통 표준** - 변경 시 전사 영향도 검토 필수
2. **L3는 표준 프로세스 중심** - 예외는 승인 기반 Variant로 관리
3. **L4는 현장 실행 절차 반영 가능** - 유지보수 가능한 수준으로 상세화
4. **Task 속성 필수 입력** - L3/L4 승인 전 핵심 속성 입력 필수 ⭐
5. **시스템/데이터 연결 필수** - 프로세스 승인 전 연계 정보 필수 입력 ⭐
6. **데이터 테이블 연결 변경 시 Data Steward 검토** - 영향도 사전 분석 ⭐
7. **정기 리뷰** - 분기별 프로세스 최신성 점검

---

## 13. 리스크 및 대응 방안

| # | 리스크 | 발생 가능성 | 영향도 | 대응 방안 |
|---|--------|------------|-------|----------|
| 1 | 현업 참여 부족 | 높음 | 높음 | 파일럿 단계부터 현업 참여, 경영진 스폰서십 확보 |
| 2 | 프로세스 정의 과다/과소 | 중간 | 중간 | L3 표준화 우선, L4는 의미 있는 단위로 제한 |
| 3 | BPMN 유지보수 실패 | 높음 | 높음 | 거버넌스 체계 선 정의, 정기 리뷰 제도화 |
| 4 | 시스템 연동 복잡성 | 중간 | 중간 | MVP에서는 마스터 수동 등록, 이후 API 연동 |
| 5 | 데이터 품질 저하 | 중간 | 높음 | 필수 입력 항목 정의, 승인 전 검증 로직 적용 |
| 6 | **외부 API 연동 지연** ⭐ | 중간 | 중간 | 캐시 도입, Fallback 처리, 비동기 조회 |
| 7 | **외부 시스템 API 미제공** ⭐ | 중간 | 높음 | 수동 입력 모드 지원, 단계적 API 개발 협의 |
| 8 | **Task 속성 입력 부담** | 높음 | 중간 | 템플릿 제공, AI 기반 자동 추천 (Phase 3) |

---

## 14. 부록

### 14.1 용어 정의

| 용어 | 정의 |
|------|------|
| E2E (End-to-End) | 시작부터 끝까지 전체 업무 흐름 |
| BPMN | Business Process Model and Notation, 업무 프로세스 모델링 표준 |
| RACI | Responsible, Accountable, Consulted, Informed 역할 매트릭스 |
| Task 속성 | Task 정의, Input/Output, 선행 프로세스, 수행주체 등 운영 정보 ⭐ |
| Process Variant | 표준 프로세스의 현장/법인별 변형 버전 |
| KPI | Key Performance Indicator, 핵심 성과 지표 |
| Data Steward | 데이터 품질 및 정합성 관리 책임자 |
| External Table Link | 외부 시스템 테이블과의 연결 정보 ⭐ |

### 14.2 프로세스 코드 체계

```
STP-02-03-05
 │   │  │  └─ L4 순번 (05)
 │   │  └──── L3 순번 (03)
 │   └─────── L2 순번 (02)
 └─────────── L1 코드 (STP = Source to Pay)
```

**L1 코드 예시:**

| 모듈 코드 | 영문명 | 한글명 |
|-------|-------------|----------|
| FI | Financial Accounting | 회계관리 |
| HR | Personel/PayRoll Management | 인사관리 |
| IM | Inventory Management | 재고관리 |
| MDM | Master Data Management | 기준정보 |
| MM | Material Management | 구매관리 |
| PP | Production Planning | 생산관리 |
| QM | Quality Management | 품질관리 |
| SCM | Supply Chain Management(SCM) | SCM |
| SD | Sales & Distribution | 영업관리 |

### 14.3 상태값 표준

| 상태 | 설명 | 허용 전이 |
|------|------|----------|
| DRAFT | 작성 중 | → IN_REVIEW |
| IN_REVIEW | 검토 중 | → APPROVED, DRAFT |
| APPROVED | 승인 완료 | → PUBLISHED |
| PUBLISHED | 배포/운영 중 | → OBSOLETE, IN_REVIEW |
| OBSOLETE | 폐기 | - |

### 14.4 Task 속성 입력 가이드 ⭐ 변경

| 속성 | 필수 여부 | 입력 가이드 |
|------|----------|-------------|
| **Task 정의** | 필수 | "~을(를) ~한다" 형식으로 명확히 기술 |
| **업무 목적** | 권장 | 업무 수행의 비즈니스 목적 기술 |
| **Input 산출물** | 권장 | 필요한 입력 문서/데이터 나열 |
| **Input Data** | 권장 | 외부 테이블 검색하여 연결 |
| **선행 프로세스** | 권장 | 프로세스 트리에서 선택 |
| **Output 산출물** | 권장 | 생성되는 출력 문서/데이터 나열 |
| **Output Data** | 권장 | 외부 테이블 검색하여 연결 |
| **수행주체** | 필수 | 조직/역할 마스터에서 선택 |
| **수행주기** | 필수 | 수시/일/주/월/분기/연 중 선택 |
| **시스템** | 권장 | 시스템 마스터에서 선택 |
| **메뉴명** | 권장 | 화면/메뉴 마스터에서 선택 |
| **비고** | 선택 | 이슈, 예외처리, 참고사항 기술 |

### 14.5 데이터 테이블 연결 가이드 ⭐ 변경

| 연결 유형 | 설명 | CRUD | 예시 |
|----------|------|------|------|
| **INPUT** | 업무 수행을 위해 읽어오는 데이터 | R | 자재마스터 조회 |
| **OUTPUT** | 업무 수행 결과 생성/수정되는 데이터 | C, U, D | 발주 생성 |
| **REFERENCE** | 업무 수행 중 참조하는 데이터 (변경 없음) | R | 공급업체 정보 참조 |

**외부 테이블 연결 절차:**
1. 시스템 선택 (ERP, MES, SCM 등)
2. 테이블명 검색 (외부 시스템 API 조회)
3. 테이블 선택 및 연결 유형 지정
4. CRUD 유형 및 주요 컬럼 입력
5. 저장

### 14.6 E2E 프로세스 카탈로그 ⭐ 신규

L1~L4 `process_node` 트리와 **분리된 전사 E2E 프로세스 카탈로그**(`e2e_process`)를 운영한다.

| 구분 | L3 Process BPMN | E2E BPMN (`model_kind = E2E`) |
|------|-----------------|-------------------------------|
| 소유 | `node_id` → L3 | `e2e_process_id` → E2E |
| 주요 요소 | User Task(L4), Call Activity(L3) | Call Activity(L3) + Gateway/Event |
| 용도 | 프로세스 오너 상세 | Process Architect 전사 cross-domain E2E |

**진입점**

| 화면 | E2E 노출 |
|------|----------|
| 전사 프로세스 맵 | L1~L4 트리 **아래 E2E 가상 섹션** (동일 화면, 계층 분리) |
| E2E 프로세스 메뉴 | `/e2e-process` 전용 목록·관리 |
| BPMN 목록 | `model_kind` 필터 (L3 / E2E) |
| 운영 지식그래프 | E2E 중심 탐색, Inspector → E2E BPMN Viewer (Call Activity drill-down) |

**Call Activity drill-down**: E2E BPMN에서 Call Activity 더블클릭 시 연결 L3의 현행 BPMN에서 L4 Task slice를 런타임 로드(읽기 전용). breadcrumb으로 상위 E2E 흐름으로 복귀.

**스키마 확장**: `scripts/migrations/025_e2e_process.sql` — `e2e_process` 테이블, `bpmn_model.e2e_process_id`, `bpmn_model.model_kind`, nullable `node_id`.

### 14.7 구현 현황 (2026-06-16)

| 영역 | 상태 | 비고 |
|------|:----:|------|
| 환경·i18n·DB·Service/Query 레이어 | ✅ | migration 001~025 |
| 레이아웃·공통 UI·에러 표준 | ✅ | |
| L1~L4 프로세스·승인·버전·Scope/Variant | ✅ | 018~019, 표준/변형 비교 |
| BPMN·Call Activity·선행 동기화 | ✅ | 022 |
| Task 속성·선행·시스템(2-tier)·데이터 연결 | ✅ | 023 |
| 시스템/외부API/공통코드 마스터 | ✅ | 012~016 |
| E2E 카탈로그·E2E BPMN·drill-down | ✅ | 025 |
| 운영 지식그래프 | ✅ | `/analysis/operations-graph` |
| Supabase Auth | ⏸️ | 쿠키 세션 stub |
| RACI·KPI/리스크/통제·문서·조직/역할 | 📋 | Placeholder |
| 대시보드·영향도·통합검색·히트맵·내보내기 | 📋 | |
| E2E 테스트·배포 | 📋 | Phase 6 |

---

## 15. 문서 이력

| 버전 | 일자 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 0.1 | 2026-06-06 | - | 초안 작성 |
| 1.0 | 2026-06-06 | - | 기술 스택 반영 (Next.js, MSSQL 등) |
| 1.1 | 2026-06-06 | - | 5W1H/데이터 테이블 연결을 Layer C로 재배치 |
| 1.2 | 2026-06-06 | - | MSSQL 2017 호환 DDL 전면 수정 |
| 1.3 | 2026-06-06 | - | Task 속성으로 변경, 데이터 테이블 외부 조회 방식으로 변경 |
| 1.4 | 2026-06-06 | - | **에러 핸들링 표준 추가, 국제화(i18n) 추가 (한국어/영어/대만 번체)** ⭐ |
| 1.5 | 2026-06-15 | - | E2E 프로세스 카탈로그, E2E BPMN, L4 drill-down, 운영지식그래프 E2E 탐색 |
| 1.6 | 2026-06-16 | - | 구현 현황(14.7) 반영 — Layer C·운영지식그래프·Scope/Variant·시스템/데이터 연동 완료 상태 정리 |
---

## 16. 승인

| 구분 | 성명 | 서명 | 일자 |
|------|------|------|------|
| 작성자 | | | |
| 검토자 | | | |
| 승인자 | | | |

---

*본 문서는 PAMS 개발을 위한 제품 요구사항 정의서입니다.*
