/* PAMS 전체 화면 HTML 목업 생성 스크립트 */
const fs = require("fs");
const path = require("path");

const outPath = path.join(__dirname, "../docs/PAMS-FULL-MOCKUP.html");
const cssBase = fs
  .readFileSync(path.join(__dirname, "../docs/PAMS-SCREENS-MOCKUP.html"), "utf8")
  .match(/<style>([\s\S]*?)<\/style>/)[1];

const screens = [
  { id: "login", grp: "인증", route: "/login", title: "로그인", status: "live", note: "Auth layout — 사이드바 없음" },
  { id: "dashboard", grp: "대시보드", route: "/dashboard", title: "운영 현황", status: "live" },
  { id: "dashboard-activity", grp: "대시보드", route: "/dashboard/activity", title: "최근 활동", status: "stub" },
  { id: "process", grp: "프로세스", route: "/process", title: "전사 프로세스 관리", status: "live" },
  { id: "e2e", grp: "프로세스", route: "/e2e-process", title: "E2E 프로세스", status: "live" },
  { id: "process-new", grp: "프로세스", route: "/process/new", title: "프로세스 등록", status: "live" },
  { id: "process-compare", grp: "프로세스", route: "/process/compare", title: "표준/변형 비교", status: "live" },
  { id: "process-detail", grp: "프로세스", route: "/process/[nodeId]", title: "프로세스 상세", status: "live" },
  { id: "bpmn", grp: "BPMN", route: "/bpmn", title: "모델 목록", status: "live" },
  { id: "bpmn-editor", grp: "BPMN", route: "/bpmn/[modelId]", title: "BPMN 에디터", status: "live" },
  { id: "bpmn-compare", grp: "BPMN", route: "/bpmn/compare", title: "BPMN 버전 비교", status: "live" },
  { id: "task-attr", grp: "메타데이터", route: "/metadata/task-attribute", title: "Task 속성 관리", status: "live" },
  { id: "raci", grp: "메타데이터", route: "/metadata/raci", title: "RACI (리다이렉트)", status: "redirect" },
  { id: "system", grp: "메타데이터", route: "/metadata/system", title: "시스템 연계", status: "live" },
  { id: "kpi-risk", grp: "메타데이터", route: "/metadata/kpi-risk", title: "KPI/리스크/통제", status: "stub" },
  { id: "ext-tables", grp: "데이터", route: "/data/external-tables", title: "외부 테이블 조회", status: "live" },
  { id: "data-link", grp: "데이터", route: "/data/link", title: "태스크-테이블 연결", status: "live" },
  { id: "data-impact", grp: "데이터", route: "/data/impact", title: "데이터 영향도 분석", status: "stub" },
  { id: "impact", grp: "분석", route: "/analysis/impact", title: "영향도 분석", status: "stub" },
  { id: "ops-graph", grp: "분석", route: "/analysis/operations-graph", title: "운영 지식그래프", status: "live" },
  { id: "search", grp: "분석", route: "/analysis/search", title: "통합 검색", status: "stub" },
  { id: "heatmap", grp: "분석", route: "/analysis/heatmap", title: "Heat Map", status: "stub" },
  { id: "approvals", grp: "거버넌스", route: "/governance/approvals", title: "승인 대기함", status: "live" },
  { id: "history", grp: "거버넌스", route: "/governance/history", title: "변경 이력", status: "stub" },
  { id: "improvements", grp: "거버넌스", route: "/governance/improvements", title: "개선과제", status: "stub" },
  { id: "users", grp: "시스템관리", route: "/admin/users", title: "사용자/권한", status: "stub" },
  { id: "systems", grp: "시스템관리", route: "/admin/systems", title: "시스템 마스터", status: "live" },
  { id: "orgs", grp: "시스템관리", route: "/admin/organizations", title: "조직 마스터", status: "stub" },
  { id: "roles", grp: "시스템관리", route: "/admin/roles", title: "역할 마스터", status: "stub" },
  { id: "ext-api", grp: "시스템관리", route: "/admin/external-api", title: "외부 시스템 API 설정", status: "live" },
  { id: "codes", grp: "시스템관리", route: "/admin/codes", title: "코드 관리", status: "live" },
];

function tag(s) {
  if (s === "live") return '<span class="mock-tag tag-live">구현됨</span>';
  if (s === "stub") return '<span class="mock-tag tag-stub">스텁</span>';
  return '<span class="mock-tag tag-redirect">리다이렉트</span>';
}

function sidebar(active) {
  const menu = [
    ["dashboard", "대시보드", "운영 현황"],
    ["process", "프로세스", "전사 프로세스 관리"],
    ["e2e", "프로세스", "E2E 프로세스"],
    ["bpmn", "BPMN", "모델 목록"],
    ["task-attr", "메타데이터", "Task 속성 관리"],
    ["system", "메타데이터", "시스템 연계"],
    ["ext-tables", "데이터", "외부 테이블 조회"],
    ["data-link", "데이터", "태스크-테이블 연결"],
    ["ops-graph", "분석", "운영 지식그래프"],
    ["approvals", "거버넌스", "승인 대기함"],
    ["systems", "시스템관리", "시스템 마스터"],
    ["codes", "시스템관리", "코드 관리"],
  ];
  let html = "";
  let lastGrp = "";
  for (const [id, grp, label] of menu) {
    if (grp !== lastGrp) {
      html += `<div class="nav-grp">${grp}</div>`;
      lastGrp = grp;
    }
    html += `<div class="nav-item${id === active ? " active" : ""}"><span class="ico">•</span> ${label}</div>`;
  }
  return html;
}

function shell(active, breadcrumb, body, h = 520) {
  return `<div class="pams-app h${h}">
  <div class="pams-topbar">
    <div class="pams-brand">PAMS</div>
    <input class="pams-global-search" placeholder="통합 검색 (Ctrl+K)" readonly />
    <div class="pams-topbar-right"><span class="pams-session">30분 남음</span><div class="pams-avatar">김</div></div>
  </div>
  <div class="pams-body">
    <aside class="pams-sidebar">${sidebar(active)}</aside>
    <div class="pams-content">${body}</div>
  </div>
  <div class="pams-statusbar">PAMS · 프로세스 아키텍처 관리 시스템 · ${breadcrumb}</div>
</div>`;
}

function pageHeader(icon, title, desc, actions = "") {
  const descHtml = desc ? `<span class="desc">${desc}</span>` : "";
  return `<header class="page-header">
  <div class="page-header-left">
    <div class="page-header-icon">${icon}</div>
    <h2>${title}</h2>
    ${descHtml}
  </div>
  <div class="page-actions">${actions}</div>
</header>`;
}

function stubBody(title) {
  return (
    pageHeader("🚧", title, "데이터가 없습니다.") +
    `<div class="list-body"><div class="content-area"><div class="grid-card flex1">
  <div class="grid-head">${title}</div>
  <div class="empty-state"><div class="empty-icon">📭</div><p>데이터가 없습니다.</p></div>
</div></div></div>`
  );
}

function redirectNote() {
  return `<div class="note-box">메뉴 <strong>조직/역할 매핑 (RACI)</strong>는 <code>/metadata/raci</code> → <code>/metadata/task-attribute</code> 로 서버 리다이렉트됩니다. RACI는 Task 속성 「수행주체」 섹션에서 별도 안내합니다.</div>`;
}

const bodies = {
  login: () => `<div class="login-page">
  <div class="login-lang">🌐 KO</div>
  <div class="login-card">
    <h2>로그인</h2>
    <p class="login-sub">프로세스 아키텍처 관리 시스템</p>
    <p class="login-welcome">PAMS에 오신 것을 환영합니다</p>
    <button class="btn btn-primary" style="width:100%;justify-content:center;padding:0.65rem">로그인</button>
  </div>
</div>`,

  dashboard: () =>
    shell(
      "dashboard",
      "대시보드 / 운영 현황",
      pageHeader("📊", "운영 현황", "PAMS에 오신 것을 환영합니다.") +
        `<div class="list-body"><div class="content-area"><div class="grid-card flex1"><div class="grid-head">프로세스 관리</div>
<div class="stat-cards">${["초안", "검토 중", "승인됨", "배포됨", "폐기됨"]
  .map(
    (s) =>
      `<div class="stat-card"><span class="lbl">프로세스 관리</span><span class="badge badge-draft">${s}</span><strong>—</strong></div>`,
  )
  .join("")}</div></div></div></div>`,
      520,
    ),

  "dashboard-activity": () => shell("dashboard", "대시보드 / 최근 활동", stubBody("최근 활동"), 420),

  process: () =>
    shell(
      "process",
      "프로세스 / 전사 프로세스 관리",
      pageHeader("⬡", "전사 프로세스 관리", "코드 또는 명칭 검색", '<button class="btn btn-primary btn-sm">+ 등록</button>') +
        `<div class="list-body">
  <aside class="filter-panel"><div class="filter-field"><label>법인</label><select class="select"><option>전체 법인</option></select></div>
  <div class="filter-field"><label>사업부</label><select class="select"><option>전체 사업부</option></select></div></aside>
  <div class="splitter-h"></div>
  <div class="content-area"><div class="grid-card flex1"><div class="grid-head">⬡ 전사 프로세스 관리</div>
  <div style="padding:0.75rem"><input class="input search-input" placeholder="코드 또는 명칭 검색"/>
  <ul class="tree"><li><div class="tree-node sel"><span class="tree-toggle">▼</span><span class="tree-label">STP — 전략·기획 (3)</span><span class="badge badge-published">배포</span></div>
  <ul class="tree" style="padding-left:14px"><li><div class="tree-node"><span class="tree-label">STP-01-01 전략과제 도출</span></div></li></ul></li></ul>
  <div class="e2e-section"><div class="e2e-title">E2E 프로세스</div><div class="tree-node"><span class="tree-label">E2E-001 수주~납품</span></div></div>
  </div></div></div></div>`,
      580,
    ),

  e2e: () =>
    shell(
      "e2e",
      "프로세스 / E2E 프로세스",
      pageHeader("⎇", "E2E 프로세스", "전사 cross-domain E2E 실행 흐름을 관리합니다.", '<button class="btn btn-primary btn-sm">+ E2E 등록</button>') +
        `<div class="list-body"><div class="content-area"><div class="grid-card flex1"><div class="grid-head">E2E 프로세스</div>
<div class="grid-wrap"><table class="dgrid"><thead><tr><th>코드</th><th>명칭</th><th>상태</th><th>참여 L3</th></tr></thead>
<tbody><tr class="sel"><td class="mono">E2E-001</td><td>수주~납품 End-to-End</td><td><span class="badge badge-published">배포됨</span></td><td>5</td></tr>
<tr><td class="mono">E2E-002</td><td>구매~정산 흐름</td><td><span class="badge badge-draft">초안</span></td><td>3</td></tr></tbody></table></div></div></div></div>`,
      520,
    ),

  "process-new": () =>
    shell(
      "process",
      "프로세스 / 등록",
      `<div class="form-page"><h1>프로세스 등록</h1>
<div class="form-group"><label class="form-label">프로세스명 *</label><div class="lang-tabs"><span class="lang-tab on">한국어</span><span class="lang-tab">English</span></div>
<input class="input" placeholder="프로세스명 입력"/><textarea class="textarea" placeholder="설명 입력" style="margin-top:0.5rem"></textarea></div>
<div class="form-grid"><label class="form-check"><input type="checkbox" checked/> 코드 자동 생성</label><div></div>
<div><label class="form-label">상태</label><select class="select"><option>초안</option></select></div>
<div><label class="form-label">버전</label><input class="input" value="1.0.0"/></div></div>
<div style="margin-top:1rem;display:flex;gap:0.5rem"><button class="btn btn-primary">저장</button><button class="btn btn-outline">취소</button></div></div>`,
      520,
    ),

  "process-compare": () =>
    shell(
      "process",
      "프로세스 / 표준/변형 비교",
      pageHeader("↔", "표준/변형 비교", "표준 프로세스와 법인·사업부별 변형의 차이를 비교합니다.") +
        `<div class="list-body"><aside class="filter-panel">
<div class="filter-field"><label>법인</label><select class="select"><option>전체 법인</option></select></div>
<div class="filter-field"><label>사업부</label><select class="select"><option>전체 사업부</option></select></div>
<div class="filter-field"><label>표준 프로세스</label><select class="select"><option>OPR-02-03 — 발주 관리</option></select></div>
</aside><div class="splitter-h"></div><div class="content-area"><div class="grid-card flex1">
<div class="grid-head">OPR-02-03 ↔ OPR-02-03-VAR</div>
<div class="tabs-bar"><span class="tab on">메타데이터</span><span class="tab">BPMN</span></div>
<div class="grid-wrap"><table class="dgrid"><thead><tr><th>필드</th><th>표준</th><th>변형</th></tr></thead>
<tbody><tr><td>프로세스명</td><td>발주 관리</td><td>발주 관리 (ABC)</td></tr></tbody></table></div></div></div></div>`,
      560,
    ),

  "process-detail": () =>
    shell(
      "process",
      "프로세스 / 상세",
      `<div class="detail-split"><aside class="detail-tree"><div class="sec-label">프로세스 트리</div>
<ul class="tree"><li><div class="tree-node sel"><span class="tree-label">OPR-02-03-01</span></div></li></ul></aside>
<div class="detail-main"><div class="detail-top"><span class="mono">OPR-02-03-01</span> <strong>발주서 작성</strong> <span class="badge badge-published">배포됨</span> <span class="mono">v1.2 · L4</span>
<div style="margin-top:0.35rem"><button class="btn btn-outline btn-sm">수정</button> <button class="btn btn-outline btn-sm">승인 요청</button></div></div>
<div class="tabs-bar"><span class="tab on">기본정보</span><span class="tab">BPMN 모델</span><span class="tab">Task 메타데이터</span><span class="tab">변경 이력</span></div>
<div style="padding:0.75rem"><dl class="info-grid"><dt>레벨</dt><dd>L4</dd><dt>적용 범위</dt><dd>전사 공통</dd><dt>설명</dt><dd>구매 요청에 따라 발주서를 작성한다.</dd></dl></div></div></div>`,
      580,
    ),

  bpmn: () =>
    shell(
      "bpmn",
      "BPMN / 모델 목록",
      pageHeader("◇", "BPMN 모델", "BPMN 모델을 조회하고 편집합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button><button class="btn btn-primary btn-sm">+ 새 모델</button>') +
        `<div class="list-body"><aside class="filter-panel"><div class="filter-field"><label>검색</label><input class="input" placeholder="모델명 또는 프로세스 검색"/></div>
<div class="filter-field"><label>상태</label><select class="select"><option>전체 상태</option></select></div></aside><div class="splitter-h"></div>
<div class="content-area"><div class="card-grid">
<div class="model-card"><div class="model-thumb">BPMN SVG</div><div class="model-body"><strong>주문 처리</strong><small>OPR-02-01 · v2</small></div><div class="model-foot"><span class="badge badge-published">배포됨</span></div></div>
<div class="model-card"><div class="model-thumb">미리보기 없음</div><div class="model-body"><strong>구매 승인</strong><small>OPR-03-02 · v1</small></div><div class="model-foot"><span class="badge badge-draft">초안</span></div></div>
</div></div></div>`,
      560,
    ),

  "bpmn-editor": () =>
    shell(
      "bpmn",
      "BPMN / 에디터",
      `<div class="editor-layout">
<div class="editor-toolbar"><button class="btn btn-outline btn-sm">← 목록</button> <strong>주문 처리</strong> <span class="mono">v2.1</span>
<span style="margin-left:auto;display:flex;gap:0.35rem"><button class="btn btn-outline btn-sm">↶</button><button class="btn btn-outline btn-sm">↷</button><button class="btn btn-outline btn-sm">Task</button><button class="btn btn-primary btn-sm">저장</button></span></div>
<div class="editor-body"><aside class="editor-sidebar"><div style="font-weight:600;margin-bottom:0.5rem">프로세스 연결</div>
<div class="tabs-bar"><span class="tab on">로컬 L4</span><span class="tab">전사 L3</span></div><input class="input" placeholder="검색" style="margin-bottom:0.5rem"/>
<ul class="tree"><li><div class="tree-node sel"><span class="tree-label">발주서 작성</span></div></li></ul></aside><div class="splitter-h"></div>
<div class="bpmn-canvas"><p style="color:var(--muted);font-size:0.8125rem">bpmn.js 캔버스 · Task / Call Activity 연결</p></div></div></div>`,
      580,
    ),

  "bpmn-compare": () =>
    shell(
      "bpmn",
      "BPMN / 버전 비교",
      pageHeader("↔", "BPMN 버전 비교", "BPMN 모델을 조회하고 편집합니다.", '<button class="btn btn-primary btn-sm">비교</button>') +
        `<div class="list-body"><aside class="filter-panel"><div class="filter-field"><label>왼쪽 버전</label><select class="select"><option>v2.1 (현재)</option></select></div>
<div class="filter-field"><label>오른쪽 버전</label><select class="select"><option>v2.0</option></select></div></aside><div class="splitter-h"></div>
<div class="content-area"><div class="compare-2col">
<div class="grid-card"><div class="grid-head">v2.1</div><div class="bpmn-viewer">BPMN Viewer</div></div>
<div class="grid-card"><div class="grid-head">v2.0</div><div class="bpmn-viewer">BPMN Viewer</div></div></div>
<div class="grid-card" style="margin-top:6px"><div class="grid-head">변경 요약</div><div style="padding:0.75rem;font-size:0.8125rem">+ 추가 2 · − 삭제 1 · ~ 수정 3</div></div></div></div>`,
      560,
    ),

  "task-attr": () =>
    shell(
      "task-attr",
      "메타데이터 / Task 속성",
      pageHeader("▣", "Task 속성 관리", "BPMN Activity에 연결된 Task의 운영 메타데이터를 조회하고 수정합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button>') +
        `<div class="list-body"><aside class="filter-panel"><div class="filter-field"><label>법인</label><select class="select"><option>전체</option></select></div>
<input class="input" placeholder="코드 또는 명칭 검색" style="margin-top:0.5rem"/><ul class="tree" style="margin-top:0.5rem"><li><div class="tree-node sel"><span class="tree-icon l4">⎇</span><span class="tree-label">OPR-02-03-01</span></div></li></ul></aside><div class="splitter-h"></div>
<div class="content-area"><div class="task-chip">발주서 작성 <span class="mono">OPR-02-03-01</span></div><div class="grid-card flex1"><div class="grid-head">Task 속성 <span class="badge-count">3개</span></div>
<div class="grid-wrap"><table class="dgrid"><thead><tr><th>No.</th><th>코드</th><th>명칭</th><th>레벨</th><th>업무 정의</th><th>BPMN</th><th>상태</th><th>작업</th></tr></thead>
<tbody><tr class="sel"><td>1</td><td class="mono">OPR-02-03-01</td><td>발주서 작성</td><td>L4</td><td>발주서를 작성한다</td><td><span class="link">주문 v2</span></td><td><span class="badge badge-published">배포</span></td><td><button class="btn btn-outline btn-sm">상세</button></td></tr></tbody></table></div></div></div></div>`,
      580,
    ),

  raci: () => redirectNote(),

  system: () =>
    shell(
      "system",
      "메타데이터 / 시스템 연계",
      pageHeader("🔗", "태스크-시스템 연결", "L3/L4 태스크와 시스템을 연결합니다.", '<button class="btn btn-primary btn-sm">연결 (2)</button>') +
        `<div class="list-body"><aside class="filter-panel"><ul class="tree"><li><div class="tree-node sel"><span class="tree-icon l4">⎇</span><span class="tree-label">OPR-02-03-01</span></div></li></ul></aside><div class="splitter-h"></div>
<div class="content-area"><div class="task-chip">발주서 작성 L4</div><div class="right-stack">
<div class="grid-card h240"><div class="grid-head">연결된 시스템 2개</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>시스템</th><th>주요</th><th>화면 수</th><th>작업</th></tr></thead><tbody><tr class="sel"><td>ERP</td><td>주요</td><td>3</td><td>🗑</td></tr></tbody></table></div></div>
<div class="splitter-v"></div><div class="grid-card flex1"><div class="grid-head">연결 가능 시스템</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>☑</th><th>시스템</th></tr></thead><tbody><tr><td>☑</td><td>WMS</td></tr></tbody></table></div></div></div></div></div>`,
      580,
    ),

  "kpi-risk": () => shell("task-attr", "메타데이터 / KPI", stubBody("KPI/리스크/통제"), 420),

  "ext-tables": () =>
    shell(
      "ext-tables",
      "데이터 / 외부 테이블",
      pageHeader("▤", "외부 테이블 조회", "시스템별 외부 API로 테이블과 컬럼 메타정보를 조회합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button>') +
        `<div class="list-body"><aside class="filter-panel"><div class="filter-field"><label>시스템 *</label><select class="select"><option>ERP</option></select></div>
<div class="filter-field"><label>스키마</label><input class="input" value="dbo"/></div><input class="input" placeholder="테이블명 또는 한글명 검색"/></aside><div class="splitter-h"></div>
<div class="content-area"><div class="compare-2col">
<div class="grid-card flex1"><div class="grid-head">테이블</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>테이블명</th><th>한글명</th><th>작업</th></tr></thead><tbody><tr class="sel"><td class="mono">PO_HEADER</td><td>발주 헤더</td><td><button class="btn btn-outline btn-sm">선택</button></td></tr></tbody></table></div></div>
<div class="grid-card flex1"><div class="grid-head">컬럼</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>컬럼명</th><th>한글명</th><th>타입</th></tr></thead><tbody><tr><td class="mono">PO_NO</td><td>발주번호</td><td>varchar</td></tr></tbody></table></div></div></div></div></div>`,
      560,
    ),

  "data-link": () =>
    shell(
      "data-link",
      "데이터 / 태스크-테이블",
      pageHeader("🔗", "태스크-테이블 연결", "외부 테이블을 태스크의 입·출력·참조 데이터로 연결합니다.", '<select class="select input-sm"><option>입력</option></select><button class="btn btn-primary btn-sm">연결 (1)</button>') +
        `<div class="list-body"><aside class="filter-panel"><ul class="tree"><li><div class="tree-node sel"><span class="tree-icon l4">⎇</span><span class="tree-label">OPR-02-03-01</span></div></li></ul></aside><div class="splitter-h"></div>
<div class="content-area"><div class="right-stack"><div class="grid-card h240"><div class="grid-head">연결된 테이블</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>시스템</th><th>테이블</th><th>유형</th><th>CRUD</th></tr></thead><tbody><tr><td>ERP</td><td class="mono">PO_HEADER</td><td>출력</td><td>생성</td></tr></tbody></table></div></div>
<div class="splitter-v"></div><div class="grid-card flex1"><div class="grid-head">연결 가능 테이블</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>☑</th><th>테이블</th><th>한글명</th></tr></thead><tbody><tr><td>☑</td><td class="mono">VENDOR_MST</td><td>거래처</td></tr></tbody></table></div></div></div></div></div>`,
      580,
    ),

  "data-impact": () => shell("data-link", "데이터 / 영향도", stubBody("데이터 연결"), 420),
  impact: () => shell("ops-graph", "분석 / 영향도", stubBody("분석"), 420),

  "ops-graph": () =>
    shell(
      "ops-graph",
      "분석 / 운영 지식그래프",
      pageHeader("◎", "운영 지식그래프", "프로세스·시스템·데이터 간 운영 관계를 시각적으로 탐색합니다.") +
        `<div class="ops-workspace" style="flex:1;min-height:0">
<aside class="ops-side"><div class="ops-side-head">탐색</div><div class="ops-side-body"><div class="sec-label">기준 노드</div><strong>주문 접수</strong><p class="mono">OPR-02-01 · L3</p><button class="btn btn-outline btn-sm" style="width:100%;margin:0.35rem 0">프로세스 선택</button><button class="btn btn-outline btn-sm" style="width:100%">E2E 선택</button></div></aside><div class="splitter-h"></div>
<div class="ops-center"><div class="graph-toolbar"><input class="input input-sm" style="width:120px" placeholder="노드 검색"/><span class="chip on">그래프</span><span class="chip on">테이블</span><select class="select input-sm"><option>계층 뷰</option></select><button class="btn btn-outline btn-sm">보내기</button></div>
<div class="graph-canvas"><div class="graph-meta">노드 12 · 엣지 18</div><div class="g-node e2e"><div class="g-kind">E2E</div>수주~납품</div><div class="g-node l3"><div class="g-kind">L3</div>주문 접수</div><div class="g-node task"><div class="g-kind">Task</div>발주서 작성</div></div>
<div class="graph-status"><span>계층 뷰</span><span>선택: 발주서 작성</span><span>줌 100%</span></div></div><div class="splitter-h"></div>
<aside class="ops-side w288"><div class="ops-side-head">상세</div><div class="ops-side-body"><div class="inspector-hero"><span class="kind-badge">Task</span><div style="font-weight:700">발주서 작성</div><div class="mono">OPR-02-03-01</div></div><div class="sec-label">관련 노드</div><div class="related-item"><span class="kind-dot" style="background:#64748b"></span> ERP · 화면</div></div></aside></div>`,
      620,
    ),

  search: () => shell("ops-graph", "분석 / 통합 검색", stubBody("분석"), 420),
  heatmap: () => shell("ops-graph", "분석 / Heat Map", stubBody("Heat Map"), 420),

  approvals: () =>
    shell(
      "approvals",
      "거버넌스 / 승인",
      pageHeader("📥", "승인 대기함", "검토 중인 프로세스 변경 요청을 승인하거나 반려합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button>') +
        `<div class="list-body"><div class="content-area"><div class="grid-card flex1"><div class="grid-head">승인 대기함</div>
<div class="grid-wrap"><table class="dgrid"><thead><tr><th>코드</th><th>명칭</th><th>레벨</th><th>상태</th><th>작업</th></tr></thead>
<tbody><tr><td class="mono">OPR-02-03-01</td><td>발주서 작성</td><td>L4</td><td><span class="badge" style="background:#fffbeb;color:#d97706">검토 중</span></td>
<td><button class="btn btn-primary btn-sm">승인</button> <button class="btn btn-outline btn-sm">반려</button></td></tr></tbody></table></div></div></div></div>`,
      480,
    ),

  history: () => shell("approvals", "거버넌스 / 이력", stubBody("변경 이력"), 420),
  improvements: () => shell("approvals", "거버넌스 / 개선", stubBody("개선과제"), 420),
  users: () => shell("systems", "관리 / 사용자", stubBody("사용자/권한"), 420),

  systems: () =>
    shell(
      "systems",
      "관리 / 시스템 마스터",
      pageHeader("🖥", "시스템 마스터", "법인·사업부별 시스템과 외부 테이블 API 설정을 관리합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button><button class="btn btn-primary btn-sm">+ 시스템 추가</button>') +
        `<div class="list-body"><aside class="filter-panel"><input class="input" placeholder="시스템 코드, 이름, 설명 검색"/></aside><div class="splitter-h"></div>
<div class="content-area"><div class="grid-card flex1"><div class="grid-head">시스템</div>
<div class="grid-wrap"><table class="dgrid"><thead><tr><th>No.</th><th>코드</th><th>시스템명</th><th>법인</th><th>사업부</th><th>유형</th><th>작업</th></tr></thead>
<tbody><tr><td>1</td><td class="mono">ERP</td><td>ERP 시스템</td><td>QNC</td><td>CO</td><td>운영</td><td>✎</td></tr></tbody></table></div></div></div></div>`,
      560,
    ),

  orgs: () => shell("systems", "관리 / 조직", stubBody("조직 마스터"), 420),
  roles: () => shell("systems", "관리 / 역할", stubBody("역할 마스터"), 420),

  "ext-api": () =>
    shell(
      "systems",
      "관리 / 외부 API",
      pageHeader("⚡", "외부 시스템 API 설정", "공통 외부 API 엔드포인트와 시스템별 호출 파라미터를 관리합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button>') +
        `<div class="list-body"><aside class="filter-panel"><input class="input" placeholder="시스템 코드, 이름 검색"/></aside><div class="splitter-h"></div>
<div class="content-area"><div class="grid-card" style="margin-bottom:6px"><div class="grid-head">공통 API 설정</div><div style="padding:0.75rem"><div class="filter-field"><label>테이블 목록 API URL</label><input class="input" value="https://api.example.com/tables"/></div><button class="btn btn-primary btn-sm">저장</button></div></div>
<div class="compare-2col" style="flex:1;min-height:200px"><div class="grid-card flex1"><div class="grid-head">시스템</div><div style="padding:0.5rem"><div class="tree-node sel">ERP <span class="badge badge-published">설정됨</span></div><div class="tree-node">SRM <span class="badge badge-draft">미설정</span></div></div></div>
<div class="grid-card flex1"><div class="grid-head">시스템별 파라미터</div><div style="padding:0.75rem"><textarea class="textarea" style="min-height:80px;font-family:monospace;font-size:0.6875rem">{"schema":"dbo"}</textarea><div style="margin-top:0.5rem"><button class="btn btn-outline btn-sm">연결 테스트</button> <button class="btn btn-primary btn-sm">저장</button></div></div></div></div></div></div>`,
      620,
    ),

  codes: () =>
    shell(
      "codes",
      "관리 / 코드",
      pageHeader("⌗", "코드 관리", "코드 그룹과 상세 코드를 관리합니다.", '<button class="btn btn-outline btn-sm">🔍 조회</button><button class="btn btn-primary btn-sm">+ 그룹 추가</button>') +
        `<div class="list-body"><aside class="filter-panel"><input class="input" placeholder="코드 그룹 또는 코드명 검색"/></aside><div class="splitter-h"></div>
<div class="content-area"><div class="compare-2col">
<div class="grid-card flex1"><div class="grid-head">코드 그룹</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>코드명</th><th>코드 그룹</th><th>상태</th><th>상세</th></tr></thead><tbody><tr class="sel"><td>법인</td><td class="mono">COMPANY_CD</td><td><span class="badge badge-published">사용</span></td><td>12</td></tr></tbody></table></div></div>
<div class="grid-card flex1"><div class="grid-head">상세 코드</div><div class="grid-wrap"><table class="dgrid"><thead><tr><th>상세 코드</th><th>코드명</th><th>정렬</th></tr></thead><tbody><tr><td class="mono">QNC</td><td>큐앤씨</td><td>1</td></tr></tbody></table></div></div></div></div></div>`,
      560,
    ),
};

const extraCss = `
.tag-live{background:#ecfdf5;color:#059669}.tag-stub{background:#fef3c7;color:#92400e}.tag-redirect{background:#ede9fe;color:#6d28d9}
.pams-brand{font-weight:800;font-size:0.9375rem;color:var(--accent);width:var(--nav-w);flex-shrink:0;padding-left:0.5rem}
.pams-global-search{flex:1;max-width:320px;padding:0.35rem 0.65rem;border:1px solid var(--border);border-radius:6px;font-size:0.75rem;background:#f8fafc}
.pams-topbar-right{display:flex;align-items:center;gap:0.65rem}
.pams-session{font-size:0.6875rem;color:var(--muted)}
.pams-statusbar{height:24px;background:var(--surface);border-top:1px solid var(--border);font-size:0.625rem;color:var(--muted);display:flex;align-items:center;padding:0 0.75rem;flex-shrink:0}
.login-page{min-height:400px;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);display:flex;align-items:center;justify-content:center;position:relative;padding:2rem;border-radius:0 0 10px 10px}
.login-lang{position:absolute;top:1rem;right:1rem;font-size:0.75rem;color:var(--muted)}
.login-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:2rem;width:min(400px,100%);box-shadow:0 8px 32px rgba(15,23,42,0.08)}
.login-card h2{font-size:1.25rem;margin-bottom:0.25rem}.login-sub{font-size:0.8125rem;color:var(--muted);margin-bottom:1.25rem}
.login-welcome{font-size:0.875rem;margin-bottom:1.25rem;padding:0.75rem;background:#f8fafc;border-radius:6px;text-align:center}
.stat-cards{display:grid;grid-template-columns:repeat(5,1fr);gap:0.65rem;padding:0.85rem}
.stat-card{padding:0.75rem;border:1px solid var(--border);border-radius:8px;background:#fafbfc}
.stat-card .lbl{font-size:0.625rem;color:var(--muted);display:block;margin-bottom:0.35rem}
.stat-card strong{font-size:1.25rem;display:block;margin-top:0.35rem}
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;color:var(--muted);padding:2rem}
.empty-icon{font-size:2rem;margin-bottom:0.5rem;opacity:0.5}
.form-page{padding:1.5rem;max-width:640px;margin:0 auto;overflow-y:auto;flex:1}
.form-page h1{font-size:1.25rem;margin-bottom:1rem}
.form-group{margin-bottom:1rem}.form-label{font-size:0.8125rem;font-weight:600;margin-bottom:0.35rem;display:block}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}
.form-check{display:flex;align-items:center;gap:0.35rem;font-size:0.8125rem}
.tabs-bar{display:flex;border-bottom:1px solid var(--border);padding:0 0.75rem}
.tab{padding:0.45rem 0.65rem;font-size:0.75rem;font-weight:600;color:var(--muted);border-bottom:2px solid transparent}
.tab.on{color:var(--accent);border-bottom-color:var(--accent)}
.detail-split{display:flex;flex:1;min-height:0;gap:6px}
.detail-tree{width:220px;flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0.65rem;overflow-y:auto}
.detail-main{flex:1;min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:flex;flex-direction:column;overflow:hidden}
.detail-top{padding:0.75rem;border-bottom:1px solid var(--border);font-size:0.8125rem}
.info-grid{display:grid;grid-template-columns:100px 1fr;gap:0.35rem 0.75rem;font-size:0.8125rem}
.info-grid dt{color:var(--muted);font-weight:600}
.editor-layout{display:flex;flex-direction:column;flex:1;min-height:0}
.editor-toolbar{display:flex;align-items:center;gap:0.5rem;padding:0.45rem 0.65rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;flex-shrink:0}
.editor-body{display:flex;flex:1;min-height:0;gap:0;margin-top:6px}
.editor-sidebar{width:240px;flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:0.65rem;overflow-y:auto}
.bpmn-canvas{flex:1;background:#fafbfc;border:1px solid var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center}
.compare-2col{display:flex;gap:6px;flex:1;min-height:0}
.compare-2col>.grid-card{flex:1;min-width:0}
.bpmn-viewer{height:180px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:0.75rem;background:#f8fafc}
.inventory{width:100%;border-collapse:collapse;font-size:0.8125rem;background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:1rem}
.inventory th,.inventory td{padding:0.5rem 0.75rem;border-bottom:1px solid #f1f5f9;text-align:left}
.inventory th{background:#f8fafc;font-weight:600;color:var(--muted)}
.ai-prompt{border-left:3px solid var(--accent);padding:0.75rem 1rem;background:#f8fafc;font-size:0.8125rem;line-height:1.6;margin:0}
.search-input{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='%2364748b' viewBox='0 0 24 24'%3E%3Cpath d='M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:0.55rem center;padding-left:2rem}
.pams-app.h420{height:420px}.pams-app.h480{height:480px}.pams-app.h520{height:520px}.pams-app.h560{height:560px}.pams-app.h580{height:580px}.pams-app.h620{height:620px}
.doc-nav{width:260px}
`;

let navHtml = '<h1>PAMS 전체 화면<br><span style="font-weight:400;color:var(--muted)">UI 목업</span></h1>';
navHtml += '<a href="#inventory">📋 화면 목록</a><a href="#shell">🧱 공통 Shell</a><a href="#ask-ai">AI 문의</a>';
let lastG = "";
for (const s of screens) {
  if (s.grp !== lastG) {
    navHtml += `<div class="grp">${s.grp}</div>`;
    lastG = s.grp;
  }
  navHtml += `<a href="#${s.id}">${s.title}</a>`;
}

const liveCount = screens.filter((s) => s.status === "live").length;
const stubCount = screens.filter((s) => s.status === "stub").length;

let sections = `<section class="mock-section" id="inventory"><div class="sec-head"><h3>화면 목록 — 전체 ${screens.length}개 (구현 ${liveCount} · 스텁 ${stubCount} · 리다이렉트 1)</h3></div>
<table class="inventory"><thead><tr><th>화면</th><th>Route</th><th>상태</th><th>패턴</th></tr></thead><tbody>`;

const patterns = {
  login: "Auth Card",
  dashboard: "Status Cards",
  "dashboard-activity": "Placeholder",
  process: "Filter + Tree",
  e2e: "DataTable + Sheet",
  "process-new": "Form Page",
  "process-compare": "Filter + Compare Tabs",
  "process-detail": "Tree + Detail Tabs",
  bpmn: "Filter + Card Grid",
  "bpmn-editor": "Toolbar + Canvas",
  "bpmn-compare": "Filter + Dual Viewer",
  "task-attr": "Tree + DataGrid + Sheet",
  raci: "Redirect",
  system: "Tree + Dual Grid",
  "kpi-risk": "Placeholder",
  "ext-tables": "Filter + Master/Detail Grid",
  "data-link": "Tree + Dual Grid",
  "data-impact": "Placeholder",
  impact: "Placeholder",
  "ops-graph": "3-Panel Graph",
  search: "Placeholder",
  heatmap: "Placeholder",
  approvals: "DataTable",
  history: "Placeholder",
  improvements: "Placeholder",
  users: "Placeholder",
  systems: "Filter + Grid + Dialog",
  orgs: "Placeholder",
  roles: "Placeholder",
  "ext-api": "Filter + Stacked Forms",
  codes: "Filter + Master/Detail Grid",
};

for (const s of screens) {
  sections += `<tr><td><a href="#${s.id}">${s.title}</a></td><td class="mono">/ko${s.route}</td><td>${tag(s.status)}</td><td>${patterns[s.id] || "—"}</td></tr>`;
}
sections += "</tbody></table></section>";

sections += `<section class="mock-section" id="shell"><div class="sec-head"><h3>공통 Shell — MainShell</h3><p>모든 (main) 라우트는 아래 레이아웃을 공유합니다.</p></div>
<div class="note-box">Header(h-14): SidebarBrand + 통합검색(Ctrl+K) + 사용자/세션 · Sidebar: PRD 6.1 메뉴 · Main: p-1.5 flex column · StatusBar 하단</div>
<pre style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:1rem;font-size:0.75rem;overflow-x:auto;font-family:Consolas,monospace">┌─ SidebarBrand ─ Header (search, user, locale) ─────────────┐
│ Sidebar          │  ListPageLayout                          │
│ (PRD 6.1 menu)   │  ├ PageHeader (icon, title, desc, actions)│
│                  │  └ ListPageBody                          │
│                  │      ├ FilterPanel (optional, resizable) │
│                  │      └ PageContent / DataGrid / Canvas   │
├─ StatusBar ────────────────────────────────────────────────┤</pre></section>`;

for (const s of screens) {
  const bodyFn = bodies[s.id];
  const content = bodyFn ? bodyFn() : stubBody(s.title);
  const note = s.note ? ` · ${s.note}` : "";
  sections += `<section class="mock-section" id="${s.id}"><div class="sec-head">
<span class="sid">/ko${s.route}</span><h3>${s.title}</h3><p>${tag(s.status)}${note}</p></div>`;
  if (s.id === "login") {
    sections += `<div class="pams-app" style="height:auto;border-radius:10px;overflow:hidden">${content}</div>`;
  } else {
    sections += content;
  }
  sections += "</section>";
}

// Overlay / Dialog 보조 섹션
const overlays = [
  {
    id: "process-sheet",
    route: "/process (Sheet)",
    title: "프로세스 등록 Sheet",
    html: `<div class="pams-app h520" style="position:relative">
<div class="pams-topbar"><div class="pams-brand">PAMS</div><input class="pams-global-search" placeholder="통합 검색" readonly/><div class="pams-avatar">김</div></div>
<div class="pams-body" style="opacity:0.3"><aside class="pams-sidebar">${sidebar("process")}</aside><div class="pams-content"></div></div>
<div class="pams-statusbar">프로세스 / 등록 Sheet</div>
<div class="sheet-overlay" style="position:absolute;inset:52px 0 24px 0"><div class="sheet-panel" style="width:480px;margin-left:auto"><div style="padding:1.25rem"><h3 style="font-size:1.125rem;margin-bottom:1rem">프로세스 등록</h3>
<div class="lang-tabs"><span class="lang-tab on">한국어</span><span class="lang-tab">English</span></div>
<input class="input" placeholder="프로세스명" style="margin:0.5rem 0"/><textarea class="textarea" placeholder="설명"></textarea>
<div class="form-grid" style="margin-top:0.75rem"><label class="form-check"><input type="checkbox" checked/> 코드 자동 생성</label><div></div>
<div><label class="form-label">상태</label><select class="select"><option>초안</option></select></div><div><label class="form-label">버전</label><input class="input" value="1.0.0"/></div></div>
<div style="margin-top:1rem"><button class="btn btn-primary">저장</button> <button class="btn btn-outline">취소</button></div></div></div></div></div>`,
  },
  {
    id: "e2e-sheet",
    route: "/e2e-process (Sheet)",
    title: "E2E 등록 Sheet",
    html: `<div class="pams-app h480" style="position:relative">
<div class="pams-topbar"><div class="pams-brand">PAMS</div><div class="pams-avatar">김</div></div>
<div class="pams-body" style="opacity:0.25;min-height:300px"></div>
<div class="sheet-overlay"><div class="sheet-panel" style="width:480px"><div class="sheet-header"><h3>E2E 프로세스 등록</h3></div><div class="sheet-body">
<div class="filter-field"><label>코드</label><input class="input"/></div>
<div class="filter-field" style="margin-top:0.5rem"><label>명칭</label><input class="input"/></div>
<div class="filter-field" style="margin-top:0.5rem"><label>관련 도메인</label><input class="input" placeholder="영업, 구매 (쉼표 구분)"/></div>
<button class="btn btn-primary" style="margin-top:1rem">저장</button> <button class="btn btn-outline">취소</button></div></div></div></div>`,
  },
  {
    id: "bpmn-dialog",
    route: "/bpmn (Dialog)",
    title: "새 BPMN 모델 Dialog",
    html: `<div class="pams-app h420" style="position:relative"><div class="pams-topbar"><div class="pams-brand">PAMS</div></div><div style="flex:1;opacity:0.3;min-height:280px"></div>
<div class="dialog-overlay"><div class="dialog"><h4>새 모델</h4>
<div class="filter-field"><label>모델명</label><input class="input" placeholder="모델명 입력"/></div>
<div class="filter-field" style="margin-top:0.75rem"><label>연결 프로세스 (L3)</label><select class="select"><option>OPR-02-01 — 주문 접수</option></select></div>
<div class="dialog-foot"><button class="btn btn-outline">취소</button><button class="btn btn-primary">생성</button></div></div></div></div>`,
  },
  {
    id: "task-attr-sheet",
    route: "/metadata/task-attribute (Sheet)",
    title: "Task 속성 상세 Sheet",
    html: `<div class="pams-app h520" style="position:relative"><div class="pams-topbar"><div class="pams-brand">PAMS</div></div><div style="opacity:0.2;min-height:320px"></div>
<div class="sheet-overlay"><div class="sheet-panel"><div class="sheet-header"><h3>OPR-02-03-01 — 발주서 작성</h3>
<div class="sheet-header-actions"><span class="save-state">● 변경사항 있음</span><button class="btn btn-primary btn-sm">저장</button><button class="btn btn-outline btn-sm">닫기</button></div></div>
<div class="sheet-body"><div class="collapse-card"><div class="collapse-head">Task 정의 ▼</div><div class="collapse-body"><textarea class="textarea">발주서를 작성한다.</textarea></div></div>
<div class="collapse-card"><div class="collapse-head">선행 프로세스 ▼</div><div class="collapse-body"><button class="btn btn-outline btn-sm">+ 선행 추가</button></div></div></div></div></div></div>`,
  },
  {
    id: "systems-dialog",
    route: "/admin/systems (Dialog)",
    title: "시스템 추가 Dialog",
    html: `<div class="pams-app h480" style="position:relative"><div class="pams-topbar"><div class="pams-brand">PAMS</div></div><div style="opacity:0.2;min-height:280px"></div>
<div class="dialog-overlay"><div class="dialog" style="width:min(520px,calc(100% - 2rem))"><h4>시스템 추가</h4>
<div class="form-grid"><div class="filter-field"><label>시스템 코드</label><select class="select"><option>선택</option></select></div><div class="filter-field"><label>법인</label><select class="select"><option>QNC</option></select></div></div>
<div class="filter-field" style="margin-top:0.75rem"><label>테이블 API URL</label><input class="input"/></div>
<div class="dialog-foot"><button class="btn btn-outline">취소</button><button class="btn btn-primary">저장</button></div></div></div></div>`,
  },
];

navHtml += '<div class="grp">오버레이</div>';
for (const o of overlays) {
  navHtml += `<a href="#${o.id}">↳ ${o.title}</a>`;
  sections += `<section class="mock-section" id="${o.id}"><div class="sec-head"><span class="sid">${o.route}</span><h3>${o.title}</h3><p><span class="mock-tag tag-sheet">Overlay</span></p></div>${o.html}</section>`;
}

sections += `<section class="mock-section" id="ask-ai"><div class="sec-head"><h3>AI 디자인 리뷰 — 프롬프트 예시</h3></div>
<blockquote class="ai-prompt">PAMS(Process Asset Management System) <strong>전체 ${screens.length}개 화면</strong> UI 목업(HTML)입니다. Next.js 16 + Shadcn/Tailwind B2B SaaS.<br><br>
<strong>구현 완료 ${liveCount}개:</strong> 프로세스 트리·E2E·BPMN 카드/에디터·Task 속성·시스템/테이블 연계·외부 테이블·운영 지식그래프·승인함·시스템/API/코드 관리 등<br>
<strong>스텁 ${stubCount}개:</strong> PlaceholderPageClient 패턴 (Construction 아이콘 + EmptyState)<br><br>
<strong>문의:</strong> (1) 전역 디자인 시스템·일관성 (2) ListPageLayout vs Editor vs Graph 레이아웃 (3) 스텁 화면 UX 우선순위 (4) DataGrid 밀도·가독성 (5) Sheet/Dialog 패턴 통일</blockquote></section>`;

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PAMS — 전체 화면 UI 목업 (${screens.length} screens)</title>
<style>${cssBase}${extraCss}</style>
</head>
<body>
<div class="doc-layout">
<nav class="doc-nav">${navHtml}</nav>
<main class="doc-main">
<div class="doc-intro">
<h2>PAMS — 전체 화면 UI 목업</h2>
<p>현재까지 개발된 PAMS의 <strong>모든 라우트(${screens.length}개)</strong>를 실제 구현 디자인 기준으로 HTML로 재현한 문서입니다. MainShell, ListPageLayout, DataGrid, Sheet, Dialog, BPMN 에디터, 운영 지식그래프 3단 패널, Placeholder 스텁을 포함합니다. 다른 AI에게 UX·비주얼 디자인 개선 방향을 문의할 때 사용하세요.</p>
<div class="meta">구현 ${liveCount} · 스텁 ${stubCount} · 리다이렉트 1 · 상세 목업: PROCESS-MAP-MOCKUP.html · 2026-06-19</div>
</div>
${sections}
</main></div>
</body></html>`;

fs.writeFileSync(outPath, html, "utf8");
console.log("OK:", outPath, html.length, "bytes,", screens.length, "screens");
