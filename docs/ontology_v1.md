# PAMS Domain Ontology v1 — 검토·적용 가이드

> **문서 목적:** PAMS에 온톨로지 개념을 적용할 수 있는지, 무엇이 필요한지, 어떤 이점이 있는지를 한 파일에 정리한다.  
> 다른 PC·다른 세션에서 검토를 이어갈 수 있도록 대화 내용·설계안·목업을 통합한다.

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| **버전** | 1.0 (Domain Ontology v1 초안) |
| **작성일** | 2026-06-16 |
| **상태** | 검토안 — 구현 전 |
| **관련 문서** | [ONTOLOGY-VISION.html](./ONTOLOGY-VISION.html) · [ONTOLOGY-MOCKUP.html](./ONTOLOGY-MOCKUP.html) · [PRD.md](./PRD.md) · [PLAN.md](./PLAN.md) |
| **기준 구현 현황** | PRD 14.7 (2026-06-16), migration 001~025 |

---

## 목차

1. [요약](#1-요약)
2. [온톨로지란 무엇인가](#2-온톨로지란-무엇인가)
3. [PAMS와 온톨로지의 관계](#3-pams와-온톨로지의-관계)
4. [현재 상태 (As-Is)](#4-현재-상태-as-is)
5. [공백 분석 (Gap)](#5-공백-분석-gap)
6. [목표 아키텍처 (To-Be)](#6-목표-아키텍처-to-be)
7. [Domain Ontology v1 — Class·Property](#7-domain-ontology-v1--classproperty)
8. [URI 식별자 체계](#8-uri-식별자-체계)
9. [적용 수준 Level A / B / C](#9-적용-수준-level-a--b--c)
10. [핵심 Use Case](#10-핵심-use-case)
11. [거버넌스](#11-거버넌스)
12. [데이터 준비 선행 조건](#12-데이터-준비-선행-조건)
13. [로드맵](#13-로드맵)
14. [기존 코드베이스 연계](#14-기존-코드베이스-연계)
15. [기대 이점](#15-기대-이점)
16. [범위 외 · 주의사항](#16-범위-외--주의사항)
17. [다음 검토 액션](#17-다음-검토-액션)
18. [문서 이력](#18-문서-이력)

---

## 1. 요약

### 핵심 결론

- **PAMS에 온톨로지 개념 적용은 가능하며, 이미 기반의 60~70%가 갖춰져 있다.**
- 현재는 형식 온톨로지(OWL/RDF)가 아니라 **관계형 DB(MSSQL) + 운영 지식그래프** 형태의 **경량 시맨틱 모델**에 가깝다.
- 권장 방향: 온톨로지를 처음부터 새로 도입하기보다 **기존 3-Layer + 운영 지식그래프를 온톨로지 관점으로 명명·정식화·확장**한다.

### 권장 접근 순서

```
Level A (개념 정식화, 4~8주)
    → Layer C 완성 (RACI·조직·KPI 등)
    → Level B (Semantic Export Layer, 선택)
    → Level C (OWL + Reasoner, ROI 명확할 때만)
```

### 1차 Use Case (추천)

> **「ERP 테이블 변경 시 → 연결 Task → L3 프로세스 → E2E → 담당 조직」** 경로를 한 번의 그래프 질의로 제공

→ PRD 영향도 분석 요구사항 및 이미 구현된 운영 지식그래프(`/analysis/operations-graph`)와 정확히 일치한다.

---

## 2. 온톨로지란 무엇인가

**온톨로지(Ontology)** 는 **「우리 회사 업무 세계를 컴퓨터가 이해할 수 있게 정의한 개념·관계 사전」** 이다.

일반 DB는 데이터를 저장한다.

- `process_node` — "발주서 작성"
- `task_data_table_link` — "MM_VENDOR 연결"

온톨로지는 여기에 **의미**를 더한다.

- "발주서 작성"은 **Task**(Class)이다
- Task는 **Process**에 **포함(containedIn)** 된다
- Task는 **MM_VENDOR** 를 **읽는다(readsTable)**
- **구매팀**이 **책임(accountableFor)** 진다
- "구매요청" = "Purchase Request" = "PR" 은 **같은 개념(exactMatch)**

즉 **데이터 + 관계 + 규칙 + 용어 정의** 를 한 세트로 관리하는 것이다.

### 온톨로지 핵심 구성 요소

| 요소 | 정의 | PAMS 대응 예 |
|------|------|-------------|
| **Class** | 개념의 유형 | Process, Task, ApplicationSystem, DataTable |
| **ObjectProperty** | 개념 간 관계 | precedes, readsTable, contains |
| **DataProperty** | 리터럴 속성 | code, status, crudType, frequency |
| **Individual** | Class의 구체 인스턴스 | STP-02-03-03, ERP, MM_VENDOR |
| **Taxonomy** | 계층 분류 | L1→L4 트리, 조직 트리 |
| **Annotation** | 라벨·설명·다국어 | process_node_i18n, task_attribute_i18n |

---

## 3. PAMS와 온톨로지의 관계

PRD 3-Layer 구조는 사실상 **「프로세스-운영 도메인 온톨로지」의 개념적 뼈대** 이다.

```
Layer A: Process Architecture   → Class 계층 (L1~L4, E2E)
Layer B: BPMN Modeling          → 시각화 + PRECEDES/CONTAINS 동기화
Layer C: Operation Metadata     → Task 속성, 시스템, 데이터, RACI, KPI...
```

운영 지식그래프(`types/operations-graph.ts`)는 Domain Ontology v1의 **TypeScript projection(투영)** 으로 승격할 수 있다.

### 현재 GraphNodeKind ↔ Ontology Class

| GraphNodeKind | Ontology Class | 비고 |
|---------------|----------------|------|
| E2E | E2EProcess | 전사 cross-domain 흐름 |
| L3 | Process (level=L3) | BPMN 소유 |
| TASK | Task (level=L4) | Layer C 메타 |
| APPLICATION | ApplicationSystem | ERP/MES/SCM/SRM |
| TABLE | DataTable | 외부 시스템 참조 |
| INTERFACE | SystemInterface | API/인터페이스 |

### 현재 GraphEdgeKind ↔ Ontology ObjectProperty

| GraphEdgeKind | ObjectProperty | domain → range |
|---------------|----------------|----------------|
| CONTAINS | contains | Process/E2E → Process/Task |
| PRECEDES | precedes | Task → Task |
| USES_SCREEN | usesScreen | Task → SystemScreen |
| READS_TABLE | readsTable | Task → DataTable |
| WRITES_TABLE | writesTable | Task → DataTable |
| INTERFACE | hasInterface | ApplicationSystem → SystemInterface |

**확장 예정 (Layer C 완성 후):** PERFORMS, ACCOUNTABLE, MEASURES, CONTROLS, DOCUMENTED_BY

---

## 4. 현재 상태 (As-Is)

PRD 14.7 구현 현황 (2026-06-16) 기준.

| 영역 | 상태 | 온톨로지 관련성 |
|------|:----:|----------------|
| L1~L4 프로세스·승인·버전·Scope/Variant | ✅ | Class: Process, variantOf |
| BPMN·Call Activity·선행 동기화 | ✅ | PRECEDES, CONTAINS 동기화 |
| Task 속성·선행·시스템·데이터 연결 | ✅ | Task, readsTable/writesTable |
| E2E 카탈로그·E2E BPMN·drill-down | ✅ | E2EProcess, orchestrates |
| 운영 지식그래프 | ✅ | `/analysis/operations-graph` |
| i18n (ko/en/zh-TW) | ✅ | rdfs:label / skos:prefLabel 매핑 대상 |
| 시스템/외부API/공통코드 마스터 | ✅ | ApplicationSystem, SystemScreen |
| RACI·KPI·리스크·통제·문서·조직/역할 | 📋 | Placeholder — 그래프 확장 blocked |
| 대시보드·영향도·통합검색·히트맵 | 📋 | 온톨로지 1차 활용처 |
| AI 기반 분석 | 📋 | Semantic Layer + RAG context |
| Supabase Auth | ⏸️ | 쿠키 세션 stub |

### 이미 구현된 핵심 파일

| 파일 | 역할 |
|------|------|
| `types/operations-graph.ts` | GraphNodeKind, GraphEdgeKind 정의 |
| `lib/services/operations-graph.service.ts` | BFS 서브그래프 조합 |
| `lib/db/queries/operations-graph.ts` | 그래프 SQL |
| `components/analysis/operations-graph/*` | Explorer · Canvas · Inspector UI |
| `app/[locale]/(main)/analysis/operations-graph/page.tsx` | 진입점 |

---

## 5. 공백 분석 (Gap)

| 공백 | 설명 | 우선순위 |
|------|------|:--------:|
| **형식 스키마 부재** | OWL/RDF/SKOS 공개 정의 없음 | A |
| **관계 제약 미정의** | domain/range, inverseOf, transitive axiom 없음 | A |
| **추론 엔진 없음** | SQL/BFS만 — 다단계 semantic inference 미지원 | B |
| **용어·동의어 관리 없음** | skos:exactMatch, broader/narrower 미관리 | A |
| **외부 표준 연계 없음** | BPMN semantics, ERP 카탈로그, COBIT/ISO 매핑 없음 | C |
| **Layer C 미완** | RACI, KPI, 통제, 문서 Placeholder | **필수** |
| **단일 저장소** | MSSQL SSOT, triple store/graph DB 없음 | B |

---

## 6. 목표 아키텍처 (To-Be)

MSSQL을 **SSOT(Single Source of Truth)** 로 유지하고, 그 위에 **Semantic Layer** 를 얹는 하이브리드 아키텍처.

```
┌─────────────────────────────────────────────────────────┐
│  Presentation Layer                                     │
│  · 프로세스 트리 / BPMN / E2E Viewer                    │
│  · 운영 지식그래프 (Explorer · Canvas · Inspector)        │
│  · 영향도 분석 / 통합검색 / AI Q&A                      │
├─────────────────────────────────────────────────────────┤
│  Application Layer (lib/services/*)                     │
│  · operations-graph.service.ts                            │
│  · impact-analysis.service.ts        [신규]               │
│  · semantic-search.service.ts        [신규]               │
│  · lib/ontology/*                    [신규]               │
├─────────────────────────────────────────────────────────┤
│  Semantic Layer                      [신규 — Level B+]  │
│  · Domain Ontology v1 정의                                │
│  · RDF/JSON-LD Export Pipeline                            │
│  · Graph Sync (MSSQL → Graph View)                        │
│  · Glossary / SKOS Concept Scheme                         │
├─────────────────────────────────────────────────────────┤
│  Data Layer — MSSQL 2017 (SSOT)                         │
│  Layer A: process_node, e2e_process, i18n                 │
│  Layer B: bpmn_model, bpmn_element                        │
│  Layer C: task_attribute, task_predecessor, mappings...   │
└─────────────────────────────────────────────────────────┘
```

### 3-Layer + Semantic Layer

| Layer | 내용 | 온톨로지 역할 |
|-------|------|--------------|
| **Semantic Layer** | Ontology 정의, RDF export, Glossary | 의미·추론·AI context |
| **Layer A** | L1~L4, E2E, Scope/Variant | Class 계층, Taxonomy |
| **Layer B** | BPMN 2.0, Call Activity | PRECEDES/CONTAINS 동기화 |
| **Layer C** | Task 속성, RACI, 시스템, 데이터, KPI | Individual 속성·관계 SSOT |

---

## 7. Domain Ontology v1 — Class·Property

### 7.1 Class 정의

| Class | 설명 | SSOT 테이블 | 상태 |
|-------|------|-------------|:----:|
| Process | L1~L4 프로세스 | process_node | ✅ |
| E2EProcess | 전사 E2E 가치흐름 | e2e_process | ✅ |
| VariantProcess | 표준의 변형 | process_node (variant_of) | ✅ |
| Task | L4 Activity | process_node (L4) + task_attribute | ✅ |
| BpmnModel | BPMN 다이어그램 | bpmn_model | ✅ |
| ApplicationSystem | ERP/MES/SCM/SRM | application_system | ✅ |
| SystemScreen | 화면/트랜잭션 | system_screen | ✅ |
| DataTable | 외부 테이블 (참조) | task_data_table_link + 외부 API | ✅ |
| SystemInterface | API/인터페이스 | system_interface | ✅ |
| Organization | 조직 | organization | 📋 |
| Role | 업무 역할 | role | 📋 |
| KPI | 성과 지표 | kpi | 📋 |
| Control | 내부통제 | control | 📋 |
| Risk | 리스크 | risk | 📋 |
| Document | SOP/문서 | document | 📋 |
| GlossaryTerm | 용어·동의어 (SKOS) | glossary_term [신규] | — |

### 7.2 Class 계층 (subClassOf)

```
pams:BusinessActivity
  ├── pams:Process
  │     ├── pams:Task          (level=L4)
  │     └── pams:VariantProcess
  └── pams:E2EProcess
```

### 7.3 ObjectProperty 정의

| Property | domain | range | inverseOf | 상태 |
|----------|--------|-------|-----------|:----:|
| contains | Process, E2EProcess | Process, Task | containedIn | ✅ |
| precedes | Task | Task | precededBy | ✅ |
| variantOf | VariantProcess | Process | hasVariant | ✅ |
| usesScreen | Task | SystemScreen | usedByTask | ✅ |
| readsTable | Task | DataTable | readByTask | ✅ |
| writesTable | Task | DataTable | writtenByTask | ✅ |
| hasInterface | ApplicationSystem | SystemInterface | interfaceOf | ✅ |
| orchestrates | E2EProcess | Process (L3) | orchestratedBy | ✅ |
| performs | Role | Task | performedBy | 📋 |
| accountableFor | Organization | Process | accountableOrg | 📋 |
| measures | KPI | Process | measuredBy | 📋 |
| controls | Control | Task | controlledBy | 📋 |
| documentedBy | Process, Task | Document | documents | 📋 |
| exactMatch | GlossaryTerm | GlossaryTerm | (symmetric) | — |
| broader | GlossaryTerm | GlossaryTerm | narrower | — |

### 7.4 DataProperty (주요)

| Property | domain | 예시 값 |
|----------|--------|---------|
| code | Process, Task, System... | STP-02-03-03 |
| status | Process | PUBLISHED, DRAFT |
| crudType | DataTable link | C, R, U, D |
| linkType | DataTable link | INPUT, OUTPUT, REFERENCE |
| frequency | Task | Daily, Monthly |
| raciType | Role mapping | RESPONSIBLE, ACCOUNTABLE... |

---

## 8. URI 식별자 체계

```
Namespace: https://pams.{company}.local/ontology/

Individual URI 패턴:
  pams:process/{code}                    → pams:process/STP-02-03-03
  pams:e2e/{code}                        → pams:e2e/STP-E2E-01
  pams:system/{systemCode}               → pams:system/ERP
  pams:table/{system}/{schema}/{name}    → pams:table/ERP/dbo/MM_VENDOR
  pams:org/{orgCode}                     → pams:org/PURCHASING
  pams:role/{roleCode}                   → pams:role/BUYER
  pams:kpi/{kpiCode}                     → pams:kpi/PO-CYCLE-TIME
  pams:term/{termId}                     → pams:term/purchase-request
```

### i18n 매핑

| PAMS i18n | 온톨로지 Annotation |
|-----------|---------------------|
| process_node_i18n.name | rdfs:label, skos:prefLabel |
| 동의어 (Glossary) | skos:altLabel |
| description | rdfs:comment |

### Publish 정책 (검토 필요)

- **DRAFT** 인스턴스를 그래프 탐색·영향도·AI context에 포함할지 여부
- 권장: Published/Approved만 Semantic Layer export, Draft는 개발·검토 환경만

---

## 9. 적용 수준 Level A / B / C

### Level A — 온톨로지 사고방식 (4~8주) ★ 권장 1단계

| 항목 | 내용 |
|------|------|
| **목표** | 기술 스택 변경 없이 Domain Ontology v1 + 거버넌스 정립 |
| **산출물** | Class/Property 표, Glossary, 관계 카탈로그, 데이터 품질 규칙 |
| **코드 변경** | 거의 없음 — `types/operations-graph.ts` 공식 스키마 승격 |
| **효과** | 개념 정렬, AI 프롬프트 품질, 영향도 정확도 향상 |

### Level B — Semantic Layer (8~16주)

| 항목 | 내용 |
|------|------|
| **목표** | MSSQL SSOT + RDF/Graph View 동기화, 다단계 경로 질의 |
| **산출물** | `lib/ontology/*`, RDF export, Graph Sync, SPARQL/Graph API PoC |
| **기술 선택** | RDF/JSON-LD export · Neo4j/Neptune PoC · MSSQL materialized graph |
| **효과** | 영향도·통합검색·AI RAG context 고도화 |

### Level C — 형식 온톨로지 + 추론 (16주+, 선택)

| 항목 | 내용 |
|------|------|
| **목표** | OWL 2 + Reasoner, 외부 표준 import, 모순 자동 검출 |
| **참고 표준** | BPMN semantics, PROV-O (변경 이력), SKOS (용어집) |
| **적용 시점** | AI 본격화, ERP deep integration, 감사 자동 증적 |
| **주의** | ROI 명확할 때만 — Level A/B로 충분한 use case 많음 |

---

## 10. 핵심 Use Case

### UC-01: 테이블 변경 영향도 분석 (1차 목표)

```
Trigger: MM_VENDOR 테이블 스키마 변경
    ↓
Semantic Layer: readsTable/writesTable 역추적
    ↓
Task 12건 → L3 5건 → E2E STP → 구매팀·재무팀
    ↓
영향도 리포트 · Excel · 담당자 알림
```

PRD 6.2.4 데이터 영향도 분석 화면과 동일 시나리오.

### UC-02: E2E 프로세스 탐색 (현재 구현 → 확장)

- E2E 중심 BFS → L3 → TASK → APPLICATION/TABLE
- Inspector → BPMN drill-down
- **확장:** ORG, KPI, RACI 노드 · Glossary 연결

### UC-03: 시맨틱 통합검색

```
Query: "구매요청"
    ↓
Glossary exactMatch → PR, Purchase Request, 구매요청서
    ↓
Graph Query → Task, Process, System, Table
    ↓
그룹핑 + 하이라이트 + locale fallback
```

### UC-04: AI 프로세스 Q&A (Phase 3)

```
Question: "발주 승인에서 ERP에 쓰는 테이블은?"
    ↓
Semantic Layer RDF/Graph context
    ↓
AI SDK RAG → ontology-aware 응답
```

### UC-05: 온톨로지 모순 검출 (Level C)

- Task A precedes B, B precedes A → 순환 선행 오류
- L4 Task without system mapping → 데이터 품질 경고
- VariantProcess without variantOf → 스키마 위반
- Published Process with DRAFT-only child → 상태 불일치

---

## 11. 거버넌스

| 역할 | 책임 | 온톨로지 권한 |
|------|------|--------------|
| **Ontology Owner** (Process Architect) | Class/Property 정의·유지 | 스키마 변경 승인 |
| **Data Steward** | DataTable, Glossary, 데이터 품질 | 용어·테이블 개념 정의 |
| **IT Architect** | ApplicationSystem, Semantic Layer | RDF export 정책 |
| **Change Board** | L1/L2 개념 변경 | Taxonomy 상위 변경 승인 |
| **Process Owner** | L3/L4 데이터 품질 | Task 연결·RACI 입력 |

### 필수 산출물

1. **PAMS Domain Ontology v1** — 본 문서 + Class Diagram
2. **용어사전 (Glossary)** — ko/en/zh-TW, SKOS Concept Scheme
3. **관계 유형 카탈로그** — GraphEdgeKind ↔ ObjectProperty
4. **데이터 품질 규칙** — L4 필수 연결, 미연결 Task 경고
5. **Publish 정책** — 추론·export 대상 상태

PRD 12장 거버넌스 체계를 온톨로지 관점으로 확장한다.

---

## 12. 데이터 준비 선행 조건

> 온톨로지는 「빈 그래프 위에 추론」이 아니라 **「채워진 그래프 위에 의미 부여」** 이다.

| 데이터 | 현재 | 온톨로지 전 | 품질 목표 |
|--------|:----:|:-----------:|----------|
| L1~L4 프로세스 | ✅ | — | Published 80%+, i18n en/zh-TW 50%+ |
| Task 속성·선행 | ✅ | — | L4 100% task_attribute |
| 시스템·데이터 연결 | ✅ | CRUD/link_type 정합성 | 시스템 Task 90%+ 연결 |
| RACI·조직·역할 | 📋 | **필수** | L3 100% owner, L4 80% RACI |
| KPI·리스크·통제 | 📋 | 감사 use case 시 | L2/L3 KPI 70% |
| GlossaryTerm | — | Level A | 핵심 용어 200건 ko/en |

---

## 13. 로드맵

| Phase | 기간 | 내용 | Level |
|-------|------|------|-------|
| **0** | 2주 | Use Case·범위, Level A/B/C 선택, 워크숍 | — |
| **1** | 4주 | Domain Ontology v1, Glossary 초안, EdgeKind 예약 | A |
| **2** | 4~6주 | Layer C(RACI 등), 영향도↔그래프 통합, 데이터 품질 | A |
| **3** | 4~8주 | RDF export, Graph Sync PoC, AI RAG context | B |
| **4** | 선택 | OWL reasoner, PROV-O, SKOS formalize | C |

### PAMS PLAN.md와의 정렬

- **Phase 4~5 (현재):** 운영 지식그래프 ✅ → 영향도·통합검색 📋
- **온톨로지 Phase 1~2** 는 PLAN Phase 5 미완(영향도·검색)과 **병행** 가능
- **온톨로지 Phase 3** 는 PLAN Phase 3 (AI)와 연결

---

## 14. 기존 코드베이스 연계

| As-Is | To-Be | 변경 |
|-------|-------|------|
| `types/operations-graph.ts` | Ontology v1 TS projection | EdgeKind 확장 |
| `lib/services/operations-graph.service.ts` | Graph Query 진입점 | ORG/KPI 노드 |
| `lib/db/queries/operations-graph.ts` | Graph Sync source | 확장 |
| `lib/services/process.service.ts` | Publish → RDF export trigger | hook |
| `scripts/migrations/*.sql` | glossary_term, graph_sync_log | 신규 migration |
| — | `lib/ontology/*` | **신규** |
| — | `lib/services/impact-analysis.service.ts` | **신규** |
| — | `lib/services/semantic-search.service.ts` | **신규** |
| `app/.../analysis/operations-graph/` | Ontology Inspector, Glossary | UI 확장 |

---

## 15. 기대 이점

### 15.1 회사(조직) 관점

| 영역 | 이점 |
|------|------|
| **변경·장애 대응** | 테이블/시스템 변경 → Task→프로세스→조직 **경로를 분 단위**로 파악 |
| **표준화** | 전사 **공통 개념·용어** (ko/en/zh-TW), 해외법인 협업 |
| **E2E 가시성** | 프로세스–BPMN–시스템–데이터–조직 **한 장 지도** |
| **감사·통제** | RACI/KPI/Control 연결 시 **증적 즉시 추출** |
| **AI·자동화** | RAG·챗봇·추천의 **구조화 context** — Phase 3 기반 |
| **거버넌스** | 순환 선행·미연결 Task 등 **품질 자동 검출** |

### 15.2 개인 관점

| 역할 | 이점 |
|------|------|
| **Process Architect** | 표준 프로세스를 **모델로 소유**, Change Board에서 **근거 있는** 영향 설명 |
| **IT / 개발** | 요구사항이 **명확한 도메인 모델**(precedes, writesTable)로 내려옴, 기능 중복 SQL 감소 |
| **Data Steward** | 테이블–Task–조직 **연결 자산**화 |
| **커리어** | EA + Knowledge Graph + BPM **교차 역량** — 희소 포지션 |

### 15.3 현실적 기대 (과장 금지)

- Level C(OWL Reasoner) 없이도 **Level A + Layer C + 지식그래프** 만으로 상당한 ROI
- 온톨로지 ≠ 비싼 학술 프로젝트 — **PAMS가 이미 가는 방향의 다음 단계**

---

## 16. 범위 외 · 주의사항

- MSSQL → triple store **전환(SSOT 교체)** 은 범위 외
- OWL reasoner **프로덕션** 은 Level C PoC 이후 별도 검토
- ERP/MES 메타 **자동 수집(CDC/ETL)** 은 별도 프로젝트
- 본 문서는 **설계·검토안** — API 스펙·DDL 상세는 구현 Phase에서 별도 작성

---

## 17. 다음 검토 액션

다른 PC에서 이어서 검토할 때 아래 체크리스트부터 시작한다.

### 즉시 (Phase 0)

- [ ] 1차 Use Case 확정: 영향도 / 검색 / AI / 감사 중 **1~2개**
- [ ] Level A/B/C **어디까지** 갈지 결정
- [ ] Ontology Owner · Data Steward **담당자** 지정
- [ ] `ONTOLOGY-MOCKUP.html` 로 이해관계자 **화면 리뷰**

### 단기 (Phase 1 — Level A)

- [ ] 본 문서 Class/Property 표 **워크숍 검토**
- [ ] GraphEdgeKind 확장안(PERFORMS, ACCOUNTABLE 등) **승인**
- [ ] Glossary **핵심 50~200 용어** 목록 초안
- [ ] Publish 정책(DRAFT vs PUBLISHED in graph) **결정**

### 중기 (Phase 2)

- [ ] RACI·조직 Placeholder **구현 우선순위** (PLAN.md와 정렬)
- [ ] 영향도 API ↔ `operations-graph.service` **통합 설계**
- [ ] 데이터 품질 규칙 **자동 경고** 요구사항

### 참고 파일 (브라우저·에디터)

| 파일 | 용도 |
|------|------|
| `docs/ontology_v1.md` | **본 문서** — 텍스트 검토·버전 관리 |
| `docs/ONTOLOGY-VISION.html` | 아키텍처·로드맵 **전체 구조** |
| `docs/ONTOLOGY-MOCKUP.html` | **UI 목업** 8화면 |
| `docs/PRD.md` §14.7 | 구현 현황 |
| `types/operations-graph.ts` | 현재 그래프 스키마 |

---

## 18. 문서 이력

| 버전 | 일자 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-06-16 | 초안 — 대화 내용 통합 (적용 가능성, Gap, Level A/B/C, Domain Model, Use Case, 이점, 로드맵) |

---

*본 문서는 PAMS Domain Ontology v1 검토용이다. 구현 시 PRD·PLAN·`.cursor/rules/project-rules.mdc` 와 함께 참조한다.*
