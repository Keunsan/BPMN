/**
 * PAMS fidelity HTML mockup generator
 * — 실제 globals.css + Tailwind v4 컴파일 + 컴포넌트와 동일 className
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const MOCKUP_DIR = path.join(ROOT, "docs", "mockup");
const HTML_OUT = path.join(MOCKUP_DIR, "pams-fidelity-mockup.html");
const CSS_OUT = path.join(MOCKUP_DIR, "pams-fidelity.css");
const PUBLIC_HTML = path.join(ROOT, "docs", "PAMS-FIDELITY-MOCKUP.html");

/** panel-styles.ts · 컴포넌트에서 복사한 className */
const PC = {
  panelCard:
    "rounded-lg border border-slate-200/85 bg-white p-2 shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40",
  contentPanel:
    "relative flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200/85 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(15,23,42,0.03),0_4px_20px_-4px_rgba(15,23,42,0.07),0_12px_44px_-14px_rgba(15,23,42,0.055)] dark:border-slate-600/65 dark:bg-slate-900/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_14px_-2px_rgba(0,0,0,0.34),0_12px_44px_-14px_rgba(0,0,0,0.48)]",
  panelTitleBar:
    "flex h-10 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 px-3 dark:border-slate-600/60",
  filterStack: "space-y-4",
  listPage: "flex h-full min-h-0 flex-col gap-1.5",
  listBody: "flex min-h-0 flex-1 flex-col overflow-hidden",
  pageContent: "flex min-h-0 flex-1 flex-col",
};

const BTN = {
  primary:
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none h-[1.625rem] gap-1 px-2 bg-primary text-primary-foreground hover:bg-primary/80 [&_svg]:size-3.5",
  outline:
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none h-[1.625rem] gap-1 px-2 border-border bg-background hover:bg-muted hover:text-foreground pams-page-action-outline [&_svg]:size-3.5",
  ghost:
    "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none size-7 hover:bg-muted hover:text-foreground [&_svg]:size-3.5",
};

const BADGE = {
  default:
    "group/badge inline-flex h-[1.125rem] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-1.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap bg-primary text-primary-foreground",
  secondary:
    "group/badge inline-flex h-[1.125rem] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-1.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap bg-secondary text-secondary-foreground",
  outline:
    "group/badge inline-flex h-[1.125rem] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border px-1.5 py-0.5 text-[0.7rem] font-medium whitespace-nowrap border-border text-foreground",
};

const screens = [
  { id: "login", route: "/login", title: "로그인", status: "live", grp: "인증" },
  { id: "dashboard", route: "/dashboard", title: "운영 현황", status: "live", grp: "대시보드" },
  { id: "dashboard-activity", route: "/dashboard/activity", title: "최근 활동", status: "stub", grp: "대시보드" },
  { id: "process", route: "/process", title: "전사 프로세스 관리", status: "live", grp: "프로세스", active: "processMap" },
  { id: "process-sheet", route: "/process (Sheet)", title: "프로세스 등록 Sheet", status: "overlay", grp: "오버레이" },
  { id: "e2e", route: "/e2e-process", title: "E2E 프로세스", status: "live", grp: "프로세스", active: "e2eProcess" },
  { id: "process-new", route: "/process/new", title: "프로세스 등록", status: "live", grp: "프로세스" },
  { id: "process-compare", route: "/process/compare", title: "표준/변형 비교", status: "live", grp: "프로세스", active: "processCompare" },
  { id: "process-detail", route: "/process/[nodeId]", title: "프로세스 상세", status: "live", grp: "프로세스" },
  { id: "bpmn", route: "/bpmn", title: "모델 목록", status: "live", grp: "BPMN", active: "bpmnList" },
  { id: "bpmn-dialog", route: "/bpmn (Dialog)", title: "새 BPMN Dialog", status: "overlay", grp: "오버레이" },
  { id: "bpmn-editor", route: "/bpmn/[modelId]", title: "BPMN 에디터", status: "live", grp: "BPMN" },
  { id: "bpmn-compare", route: "/bpmn/compare", title: "BPMN 버전 비교", status: "live", grp: "BPMN", active: "bpmnCompare" },
  { id: "task-attr", route: "/metadata/task-attribute", title: "Task 속성 관리", status: "live", grp: "메타데이터", active: "taskAttribute" },
  { id: "task-attr-sheet", route: "/metadata/task-attribute (Sheet)", title: "Task 속성 Sheet", status: "overlay", grp: "오버레이" },
  { id: "system", route: "/metadata/system", title: "시스템 연계", status: "live", grp: "메타데이터", active: "systemLink" },
  { id: "kpi-risk", route: "/metadata/kpi-risk", title: "KPI/리스크/통제", status: "stub", grp: "메타데이터" },
  { id: "ext-tables", route: "/data/external-tables", title: "외부 테이블 조회", status: "live", grp: "데이터", active: "externalTables" },
  { id: "data-link", route: "/data/link", title: "태스크-테이블 연결", status: "live", grp: "데이터", active: "dataLink" },
  { id: "data-impact", route: "/data/impact", title: "데이터 영향도 분석", status: "stub", grp: "데이터" },
  { id: "ops-graph", route: "/analysis/operations-graph", title: "운영 지식그래프", status: "live", grp: "분석", active: "operationsGraph" },
  { id: "impact", route: "/analysis/impact", title: "영향도 분석", status: "stub", grp: "분석" },
  { id: "search", route: "/analysis/search", title: "통합 검색", status: "stub", grp: "분석" },
  { id: "heatmap", route: "/analysis/heatmap", title: "Heat Map", status: "stub", grp: "분석" },
  { id: "approvals", route: "/governance/approvals", title: "승인 대기함", status: "live", grp: "거버넌스", active: "approvalInbox" },
  { id: "history", route: "/governance/history", title: "변경 이력", status: "stub", grp: "거버넌스" },
  { id: "systems", route: "/admin/systems", title: "시스템 마스터", status: "live", grp: "시스템관리", active: "systemMaster" },
  { id: "systems-dialog", route: "/admin/systems (Dialog)", title: "시스템 추가 Dialog", status: "overlay", grp: "오버레이" },
  { id: "ext-api", route: "/admin/external-api", title: "외부 API 설정", status: "live", grp: "시스템관리", active: "externalApi" },
  { id: "codes", route: "/admin/codes", title: "코드 관리", status: "live", grp: "시스템관리", active: "codeManagement" },
  { id: "users", route: "/admin/users", title: "사용자/권한", status: "stub", grp: "시스템관리" },
  { id: "orgs", route: "/admin/organizations", title: "조직 마스터", status: "stub", grp: "시스템관리" },
  { id: "roles", route: "/admin/roles", title: "역할 마스터", status: "stub", grp: "시스템관리" },
];

const navLabels = {
  dashboardOverview: "운영 현황",
  dashboardActivity: "최근 활동",
  processMap: "전사 프로세스 관리",
  e2eProcess: "E2E 프로세스",
  processNew: "프로세스 등록/수정",
  processCompare: "표준/변형 비교",
  bpmnList: "모델 목록",
  bpmnCompare: "버전 비교",
  taskAttribute: "Task 속성 관리",
  systemLink: "시스템 연계",
  kpiRisk: "KPI/리스크/통제",
  externalTables: "외부 테이블 조회",
  dataLink: "태스크-테이블 연결",
  dataImpact: "데이터 영향도 분석",
  operationsGraph: "운영 지식그래프",
  impactAnalysis: "영향도 분석",
  unifiedSearch: "통합 검색",
  heatMap: "Heat Map",
  approvalInbox: "승인 대기함",
  changeHistory: "변경 이력",
  improvements: "개선과제",
  usersPermissions: "사용자/권한",
  systemMaster: "시스템 마스터",
  orgMaster: "조직 마스터",
  roleMaster: "역할 마스터",
  externalApi: "외부 시스템 API 설정",
  codeManagement: "코드 관리",
};

const navGroups = [
  {
    key: "dashboard",
    label: "대시보드",
    items: ["dashboardOverview", "dashboardActivity"],
  },
  {
    key: "process",
    label: "프로세스 관리",
    items: ["processMap", "e2eProcess", "processNew", "processCompare"],
  },
  { key: "bpmn", label: "BPMN 모델링", items: ["bpmnList", "bpmnCompare"] },
  {
    key: "metadata",
    label: "메타데이터 관리",
    items: ["taskAttribute", "systemLink", "kpiRisk"],
  },
  {
    key: "data",
    label: "데이터 연결",
    items: ["externalTables", "dataLink", "dataImpact"],
  },
  {
    key: "analysis",
    label: "분석",
    items: ["impactAnalysis", "operationsGraph", "unifiedSearch", "heatMap"],
  },
  {
    key: "governance",
    label: "거버넌스",
    items: ["approvalInbox", "changeHistory", "improvements"],
  },
  {
    key: "systemAdmin",
    label: "시스템 관리",
    items: [
      "usersPermissions",
      "systemMaster",
      "orgMaster",
      "roleMaster",
      "externalApi",
      "codeManagement",
    ],
  },
];

function tag(s) {
  if (s === "live") return '<span class="text-[10px] font-semibold text-emerald-600">구현</span>';
  if (s === "overlay") return '<span class="text-[10px] font-semibold text-violet-600">Overlay</span>';
  return '<span class="text-[10px] font-semibold text-amber-600">스텁</span>';
}

function pageHeader(icon, title, desc, actions = "") {
  const descBlock = desc
    ? `<span class="hidden h-3 w-px shrink-0 bg-border sm:block" aria-hidden="true"></span><p class="min-w-0 truncate text-[10px] leading-none text-muted-foreground/70">${desc}</p>`
    : "";
  return `<div class="${PC.panelCard} flex h-11 shrink-0 items-center gap-2 justify-between">
  <div class="flex min-w-0 items-center gap-2">
    <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><i data-lucide="${icon}" class="size-3.5"></i></div>
    <div class="flex min-w-0 items-center gap-2">
      <h1 class="shrink-0 truncate text-[14px] font-semibold leading-none tracking-tight">${title}</h1>
      ${descBlock}
    </div>
  </div>
  ${actions ? `<div class="flex shrink-0 items-center gap-2">${actions}</div>` : ""}
</div>`;
}

function pageActions(query = true, register = false, registerLabel = "등록") {
  let html = "";
  if (query) {
    html += `<button type="button" class="${BTN.outline}"><i data-lucide="search"></i>조회</button>`;
  }
  if (register) {
    html += `<button type="button" class="${BTN.primary}"><i data-lucide="plus"></i>${registerLabel}</button>`;
  }
  return html;
}

function filterField(label, inner, required = false) {
  const req = required ? '<span class="ml-0.5 text-destructive">*</span>' : "";
  return `<div class="pams-filter-field space-y-1.5">
  <div class="flex items-center justify-between gap-2">
    <label class="min-w-0 flex-1 truncate text-[10px] font-normal text-slate-400 dark:text-slate-500">${label}${req}</label>
  </div>
  ${inner}
</div>`;
}

function filterSelect(value) {
  return `<button type="button" class="pams-filter-select w-full">${value}</button>`;
}

function filterInput(placeholder, value = "") {
  return `<input class="pams-filter-input" placeholder="${placeholder}" value="${value}" readonly />`;
}

function filterPanel(fields) {
  return `<aside class="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col self-stretch ${PC.panelCard}">
  <div class="min-h-0 flex-1 overflow-y-auto"><div class="${PC.filterStack}">${fields}</div></div>
</aside>`;
}

function panelTitleBar(title, count, suffix = "개") {
  const countHtml =
    count !== undefined
      ? `<span class="shrink-0 text-[12px] text-slate-500 dark:text-slate-400">(${count}${suffix ? ` ${suffix}` : ""})</span>`
      : "";
  return `<div class="${PC.panelTitleBar}">
  <div class="flex min-w-0 items-center gap-2">
    <span class="inline-flex size-2.5 shrink-0 rounded-[3px] bg-primary"></span>
    <span class="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">${title}</span>
    ${countHtml}
  </div>
</div>`;
}

function dataGrid(title, count, thead, tbody, toolbar = "") {
  return `<div class="${PC.contentPanel} min-h-0 flex-1">
  ${panelTitleBar(title, count)}
  ${toolbar ? `<div class="border-b border-slate-200/80 px-3 py-2 dark:border-slate-600/60">${toolbar}</div>` : ""}
  <div class="min-h-0 flex-1 overflow-auto">
    <table class="pams-data-grid-table">
      <thead class="pams-data-grid-head"><tr>${thead}</tr></thead>
      <tbody class="pams-data-grid-body">${tbody}</tbody>
    </table>
  </div>
</div>`;
}

function th(label) {
  return `<th class="pams-data-grid-header-cell"><div class="pams-data-grid-header-inner"><span class="pams-data-grid-header-label">${label}</span></div></th>`;
}

function td(content, selected = false) {
  const attr = selected ? ' data-state="selected"' : "";
  return `<td class="pams-data-grid-cell"${attr}>${content}</td>`;
}

function tr(cells, selected = false) {
  const attr = selected ? ' data-state="selected"' : "";
  return `<tr${attr}>${cells}</tr>`;
}

function sidebarNav(activeKey) {
  return navGroups
    .map(
      (g) => `<div class="mb-1">
    <button type="button" class="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-sidebar-foreground hover:bg-muted/50">
      <i data-lucide="chevron-down" class="size-3.5 shrink-0"></i>${g.label}
    </button>
    <ul class="mt-0.5 space-y-0.5 border-l border-sidebar-border pl-3">
      ${g.items
        .map((key) => {
          const active = key === activeKey;
          return `<li><span class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-muted-foreground"}">${navLabels[key]}</span></li>`;
        })
        .join("")}
    </ul>
  </div>`,
    )
    .join("");
}

function mainShell(activeKey, breadcrumb, body, height = "680px") {
  return `<div class="mock-frame flex flex-col overflow-hidden rounded-lg border border-slate-200/85 bg-background shadow-lg" style="height:${height}">
  <div class="flex h-14 shrink-0 items-stretch border-b bg-card">
    <div class="hidden h-14 shrink-0 items-center gap-2 border-r bg-sidebar px-3 text-sidebar-foreground md:flex flex-row" style="width:220px">
      <div class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">P</div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-[15px] font-semibold leading-tight">PAMS</p>
        <p class="truncate text-[11px] leading-snug text-muted-foreground">프로세스 아키텍처 관리 시스템</p>
      </div>
    </div>
    <header class="flex min-w-0 flex-1 items-center gap-4 px-4">
      <div class="relative mx-auto w-full max-w-xl flex-1">
        <i data-lucide="search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"></i>
        <input type="search" readonly placeholder="통합 검색 (Ctrl+K)" class="h-9 w-full rounded-lg border border-border/80 bg-muted/40 pl-9 pr-16 text-sm" />
        <kbd class="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">Ctrl+K</kbd>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-2">
        <button type="button" class="${BTN.ghost}"><i data-lucide="sun"></i></button>
        <div class="hidden items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5 sm:flex">
          <div class="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary"><i data-lucide="user" class="size-3.5"></i></div>
          <div class="min-w-0 text-xs leading-tight"><p class="truncate font-medium text-foreground">사용자</p><p class="truncate text-muted-foreground">PAMS</p></div>
        </div>
      </div>
    </header>
  </div>
  <div class="flex min-h-0 flex-1 overflow-hidden">
    <aside class="hidden h-full min-h-0 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex" style="width:200px">
      <nav class="min-h-0 flex-1 overflow-y-auto"><div class="px-2 py-2">${sidebarNav(activeKey)}</div></nav>
    </aside>
    <div class="relative z-20 hidden w-1.5 shrink-0 cursor-col-resize border-r bg-sidebar/80 md:block"><div class="pointer-events-none mx-auto mt-[45%] h-10 w-0.5 rounded-full bg-border"></div></div>
    <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-1.5">
      <div class="${PC.listPage}">${body}</div>
    </main>
  </div>
  <footer class="flex h-8 shrink-0 items-center justify-between border-t bg-card px-3 text-xs text-muted-foreground">
    <button type="button" class="${BTN.ghost}"><i data-lucide="refresh-cw" class="size-3"></i></button>
    <div class="flex items-center gap-2"><span class="flex items-center gap-1 tabular-nums"><i data-lucide="clock" class="size-3"></i>30:00 남음</span><button type="button" class="${BTN.outline} h-6 px-2 text-[0.7rem]">연장</button></div>
  </footer>
</div>`;
}

function listWithFilter(filterHtml, contentHtml, filterWidth = "280px") {
  return `<div class="${PC.listBody}">
  <div class="flex min-h-0 flex-1 overflow-hidden" style="gap:0">
    <div style="width:${filterWidth};flex-shrink:0">${filterHtml}</div>
    <div class="relative z-20 w-1.5 shrink-0 cursor-col-resize bg-transparent"><div class="pointer-events-none absolute top-1/2 left-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border"></div></div>
    <div class="${PC.pageContent}">${contentHtml}</div>
  </div>
</div>`;
}

function stubPage(title, activeKey) {
  return mainShell(
    activeKey,
    title,
    `${pageHeader("hard-hat", title, "데이터가 없습니다.")}
${listWithFilter("", `<div class="${PC.contentPanel} min-h-0 flex-1">${panelTitleBar(title)}<div class="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-muted-foreground"><i data-lucide="inbox" class="size-10 opacity-40"></i><p class="text-sm">데이터가 없습니다.</p></div></div>`)}`,
    "520px",
  );
}

const bodies = {
  login: () => `<div class="flex min-h-[420px] flex-col items-center justify-center bg-background p-6">
  <div class="absolute right-4 top-4 text-xs text-muted-foreground">KO ▾</div>
  <div class="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
    <h2 class="text-lg font-semibold">로그인</h2>
    <p class="text-sm text-muted-foreground">프로세스 아키텍처 관리 시스템</p>
    <p class="mt-4 rounded-md bg-muted/50 p-3 text-center text-sm">PAMS에 오신 것을 환영합니다</p>
    <button type="button" class="${BTN.primary} mt-4 h-9 w-full px-4">로그인</button>
  </div>
</div>`,

  dashboard: () =>
    mainShell(
      "dashboardOverview",
      "dashboard",
      `${pageHeader("layout-dashboard", "운영 현황", "PAMS에 오신 것을 환영합니다.")}
${listWithFilter("", `<div class="${PC.contentPanel} min-h-0 flex-1">${panelTitleBar("프로세스 관리")}
<div class="grid gap-3 p-4 md:grid-cols-3 lg:grid-cols-5">${["초안", "검토 중", "승인됨", "배포됨", "폐기됨"]
  .map(
    (s) => `<div class="rounded-lg border border-slate-200/85 bg-white p-4 shadow-sm dark:border-slate-600/65 dark:bg-slate-900/40">
  <p class="text-[10px] text-muted-foreground">프로세스 관리</p><span class="${BADGE.secondary} mt-2">${s}</span><p class="mt-2 text-2xl font-bold">—</p></div>`,
  )
  .join("")}</div></div>`)}`,
      "560px",
    ),

  "dashboard-activity": () => stubPage("최근 활동", "dashboardActivity"),

  process: () =>
    mainShell(
      "processMap",
      "process",
      `${pageHeader("network", "전사 프로세스 관리", "코드 또는 명칭 검색", pageActions(false, true))}
${listWithFilter(
  filterPanel(
    filterField("법인", filterSelect("전체 법인")) +
      filterField("사업부", filterSelect("전체 사업부")) +
      `<p class="px-1 text-[11px] text-muted-foreground">전체 법인·전체 사업부는 모든 scope의 프로세스 카탈로그를 표시합니다.</p>`,
  ),
  `<div class="${PC.contentPanel} min-h-0 flex-1">
  ${panelTitleBar("전사 프로세스 관리")}
  <div class="space-y-3 p-4">
    <div class="flex gap-2"><input class="pams-filter-input flex-1 pl-7" placeholder="코드 또는 명칭 검색" readonly />
    <button type="button" class="${BTN.primary}"><i data-lucide="plus"></i>등록</button></div>
    <div class="flex flex-wrap gap-1 text-[11px]"><span class="text-muted-foreground">레벨 펼치기</span>
    <span class="rounded border border-slate-200 bg-sky-50 px-1.5 py-0.5 font-semibold text-blue-600">L1</span>
    <span class="rounded border border-slate-200 bg-sky-50 px-1.5 py-0.5 font-semibold text-emerald-600">L2</span>
    <span class="rounded border px-1.5 py-0.5 font-semibold text-amber-600">L3</span><span class="rounded border px-1.5 py-0.5 font-semibold text-violet-600">L4</span></div>
    <ul class="space-y-0.5 text-sm">
      <li><div class="flex items-center gap-1 rounded-md bg-accent px-1 py-1 text-accent-foreground"><i data-lucide="chevron-down" class="size-3.5"></i><i data-lucide="folder-tree" class="size-3.5 text-blue-600"></i><span class="flex-1 truncate font-medium">STP — 전략·기획</span><span class="text-xs text-muted-foreground">(3)</span><span class="${BADGE.default}">배포됨</span></div>
        <ul class="ml-4"><li><div class="flex items-center gap-1 rounded-md px-1 py-1 hover:bg-muted"><i data-lucide="chevron-down" class="size-3.5"></i><i data-lucide="folder-tree" class="size-3.5 text-amber-600"></i><span class="flex-1">STP-01-01 전략과제 도출</span><span class="${BADGE.default}">배포됨</span></div></li></ul>
      </li>
    </ul>
    <div class="border-t pt-3"><p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">E2E 프로세스</p>
    <div class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"><i data-lucide="git-branch" class="size-3.5 text-sky-600"></i><span class="flex-1">E2E-001 수주~납품</span><span class="${BADGE.default}">배포됨</span></div></div>
  </div>
</div>`,
)}`,
      "640px",
    ),

  "process-sheet": () =>
    `<div class="relative">${mainShell("processMap", "", pageHeader("network", "전사 프로세스 관리", "", pageActions(false, true)) + listWithFilter(filterPanel(filterField("법인", filterSelect("전체"))), `<div class="${PC.contentPanel} min-h-0 flex-1 opacity-30">${panelTitleBar("전사 프로세스 관리")}</div>`), "600px")}
<div class="absolute inset-0 z-50 flex justify-end bg-black/20">
  <div class="flex h-full w-[min(768px,calc(100vw-2rem))] flex-col border-l bg-background shadow-xl">
    <div class="space-y-6 overflow-y-auto p-6">
      <h2 class="text-2xl font-semibold">프로세스 등록</h2>
      <div class="space-y-2"><label class="text-sm font-medium">프로세스명 *</label>
      <div class="flex border-b"><span class="border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary">한국어</span><span class="px-3 py-2 text-sm text-muted-foreground">English</span></div>
      <input class="h-7 w-full rounded-md border border-input px-2 text-sm" placeholder="프로세스명 입력" readonly />
      <textarea class="min-h-[72px] w-full rounded-md border border-input px-2 py-1 text-sm" placeholder="설명 입력"></textarea></div>
      <div class="grid gap-4 sm:grid-cols-2"><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked class="size-4"/>코드 자동 생성</label><div></div>
      <div><label class="text-sm font-medium">상태</label><button class="pams-filter-select mt-1">초안</button></div>
      <div><label class="text-sm font-medium">버전</label><input class="mt-1 h-7 w-full rounded-md border border-input px-2 text-sm" value="1.0.0" readonly /></div></div>
      <div class="flex gap-2"><button class="${BTN.primary}">저장</button><button class="${BTN.outline}">취소</button></div>
    </div>
  </div>
</div></div>`,

  e2e: () =>
    mainShell(
      "e2eProcess",
      "e2e",
      `${pageHeader("git-branch", "E2E 프로세스", "전사 cross-domain E2E 실행 흐름을 관리합니다.", pageActions(false, true, "E2E 등록"))}
${listWithFilter("", dataGrid("E2E 프로세스", undefined, th("코드") + th("명칭") + th("상태") + th("참여 L3"), tr(td('<span class="font-mono text-[11px]">E2E-001</span>') + td("수주~납품 End-to-End") + td(`<span class="${BADGE.default}">배포됨</span>`) + td("5"), true) + tr(td('<span class="font-mono text-[11px]">E2E-002</span>') + td("구매~정산") + td(`<span class="${BADGE.secondary}">초안</span>`) + td("3"))))}`,
      "560px",
    ),

  "process-new": () =>
    mainShell(
      "processNew",
      "process/new",
      `<div class="mx-auto max-w-2xl space-y-6 overflow-y-auto p-6"><h1 class="text-2xl font-semibold">프로세스 등록</h1>
<div class="space-y-2"><label class="text-sm font-medium">프로세스명 *</label><div class="flex border-b"><span class="border-b-2 border-primary px-3 py-1.5 text-sm text-primary">한국어</span></div>
<input class="h-7 w-full rounded-md border border-input px-2 text-sm" readonly /><textarea class="mt-2 min-h-[72px] w-full rounded-md border border-input px-2 text-sm"></textarea></div>
<div class="grid gap-4 sm:grid-cols-2"><label class="flex items-center gap-2 text-sm"><input type="checkbox" checked class="size-4"/>코드 자동 생성</label><div></div></div>
<div class="flex gap-2"><button class="${BTN.primary}">저장</button><button class="${BTN.outline}">취소</button></div></div>`,
      "560px",
    ),

  "process-compare": () =>
    mainShell(
      "processCompare",
      "compare",
      `${pageHeader("git-compare", "표준/변형 비교", "표준 프로세스와 법인·사업부별 변형의 차이를 비교합니다.")}
${listWithFilter(
  filterPanel(
    filterField("법인", filterSelect("전체 법인")) +
      filterField("사업부", filterSelect("전체 사업부")) +
      filterField("표준 프로세스", filterSelect("OPR-02-03 — 발주 관리")),
  ),
  dataGrid(
    "OPR-02-03 ↔ OPR-02-03-VAR",
    undefined,
    th("필드") + th("표준") + th("변형"),
    tr(td("프로세스명") + td("발주 관리") + td("발주 관리 (ABC)")) +
      tr(td("상태") + td(`<span class="${BADGE.default}">배포됨</span>`) + td(`<span class="${BADGE.default}">배포됨</span>`)),
  ),
)}`,
      "560px",
    ),

  "process-detail": () =>
    mainShell(
      "processMap",
      "detail",
      `<div class="flex min-h-0 flex-1 gap-1.5 overflow-hidden">
  <aside class="hidden w-80 shrink-0 overflow-y-auto rounded-lg border border-slate-200/85 bg-white p-3 shadow-sm lg:block"><p class="mb-2 text-[11px] font-semibold text-muted-foreground">프로세스 트리</p>
  <div class="rounded-md bg-accent px-2 py-1 text-sm text-accent-foreground">OPR-02-03-01</div></aside>
  <div class="${PC.contentPanel} min-h-0 flex-1">
    <div class="border-b px-4 py-3"><span class="font-mono text-xs text-muted-foreground">OPR-02-03-01</span> <span class="text-lg font-semibold">발주서 작성</span> <span class="${BADGE.default} ml-2">배포됨</span> <span class="ml-2 font-mono text-xs text-muted-foreground">v1.2 · L4</span>
    <div class="mt-2 flex gap-2"><button class="${BTN.outline}">수정</button></div></div>
    <div class="flex border-b px-2"><span class="border-b-2 border-primary px-3 py-2 text-xs font-medium text-primary">기본정보</span><span class="px-3 py-2 text-xs text-muted-foreground">BPMN 모델</span><span class="px-3 py-2 text-xs text-muted-foreground">Task 메타데이터</span></div>
    <dl class="grid grid-cols-[120px_1fr] gap-2 p-4 text-sm"><dt class="text-muted-foreground">레벨</dt><dd>L4</dd><dt class="text-muted-foreground">설명</dt><dd>구매 요청에 따라 발주서를 작성한다.</dd></dl>
  </div>
</div>`,
      "580px",
    ),

  bpmn: () =>
    mainShell(
      "bpmnList",
      "bpmn",
      `${pageHeader("workflow", "BPMN 모델", "BPMN 모델을 조회하고 편집합니다.", pageActions(true, true, "새 모델"))}
${listWithFilter(
  filterPanel(
    filterField("법인", filterSelect("전체 법인")) +
      filterField("검색", filterInput("모델명 또는 프로세스 검색")) +
      filterField("상태", filterSelect("전체 상태")) +
      filterField("모델 유형", filterSelect("전체 유형")),
  ),
  `<div class="${PC.contentPanel} min-h-0 flex-1">${panelTitleBar("BPMN 모델", 12)}
<div class="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <article class="overflow-hidden rounded-lg border border-slate-200/85 bg-white shadow-sm"><div class="flex h-36 items-center justify-center bg-muted/30 text-xs text-muted-foreground">BPMN SVG</div>
  <div class="p-2"><p class="text-sm font-semibold">주문 처리</p><p class="font-mono text-[11px] text-muted-foreground">OPR-02-01 · v2</p></div>
  <div class="flex justify-between border-t px-2 py-1.5 text-[11px]"><span class="${BADGE.default}">배포됨</span><span class="text-muted-foreground">2026. 6. 18.</span></div></article>
  <article class="overflow-hidden rounded-lg border border-slate-200/85 bg-white shadow-sm"><div class="flex h-36 items-center justify-center bg-muted/30 text-xs text-muted-foreground">미리보기 없음</div>
  <div class="p-2"><p class="text-sm font-semibold">구매 승인</p><p class="font-mono text-[11px] text-muted-foreground">OPR-03-02 · v1</p></div>
  <div class="flex justify-between border-t px-2 py-1.5 text-[11px]"><span class="${BADGE.secondary}">초안</span></div></article>
</div></div>`,
)}`,
      "620px",
    ),

  "bpmn-dialog": () =>
    `<div class="relative flex h-[480px] items-center justify-center overflow-hidden rounded-lg border bg-background">${mainShell("bpmnList", "", `<div class="opacity-20">${pageHeader("workflow", "BPMN 모델", "")}</div>`, "480px")}
<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
  <div class="w-full max-w-md rounded-xl border bg-background p-6 shadow-lg">
    <h3 class="text-lg font-semibold">새 모델</h3>
    <div class="mt-4 space-y-4">${filterField("모델명", '<input class="h-7 w-full rounded-md border border-input px-2 text-sm" placeholder="모델명 입력" readonly />')}${filterField("연결 프로세스 (L3)", filterSelect("OPR-02-01 — 주문 접수"))}</div>
    <div class="mt-6 flex justify-end gap-2"><button class="${BTN.outline}">취소</button><button class="${BTN.primary}">생성</button></div>
  </div>
</div></div>`,

  "bpmn-editor": () =>
    mainShell(
      "bpmnList",
      "editor",
      `<div class="flex min-h-0 flex-1 flex-col gap-1.5">
  <div class="${PC.panelCard} flex h-10 shrink-0 items-center gap-2 px-2">
    <button class="${BTN.outline}"><i data-lucide="arrow-left"></i>목록</button><strong class="text-sm">주문 처리</strong><span class="font-mono text-xs text-muted-foreground">v2.1</span>
    <div class="ml-auto flex gap-1"><button class="${BTN.outline}"><i data-lucide="undo-2"></i></button><button class="${BTN.outline}">Task</button><button class="${BTN.primary}">저장</button></div>
  </div>
  <div class="flex min-h-0 flex-1 gap-1.5">
    <aside class="${PC.panelCard} w-72 shrink-0 overflow-y-auto p-3"><p class="mb-2 text-sm font-semibold">프로세스 연결</p>
    <div class="mb-2 flex gap-1 text-xs"><span class="rounded bg-primary/10 px-2 py-1 text-primary">로컬 L4</span><span class="rounded px-2 py-1 text-muted-foreground">전사 L3</span></div>
    <input class="pams-filter-input mb-2" placeholder="검색" readonly /><div class="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">발주서 작성</div></aside>
    <div class="relative z-20 w-1.5 shrink-0 bg-transparent"></div>
    <div class="flex min-h-0 flex-1 items-center justify-center rounded-lg border border-slate-200/85 bg-muted/20 text-sm text-muted-foreground">bpmn.js 캔버스</div>
  </div>
</div>`,
      "580px",
    ),

  "bpmn-compare": () =>
    mainShell(
      "bpmnCompare",
      "bpmn/compare",
      `${pageHeader("git-compare", "BPMN 버전 비교", "BPMN 모델을 조회하고 편집합니다.", `<button class="${BTN.primary}">비교</button>`)}
${listWithFilter(
  filterPanel(
    filterField("왼쪽 버전", filterSelect("v2.1 (현재)")) +
      filterField("오른쪽 버전", filterSelect("v2.0")),
  ),
  `<div class="flex min-h-0 flex-1 flex-col gap-1.5">
  <div class="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
    <div class="${PC.contentPanel}"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">v2.1</span></div><div class="flex h-48 items-center justify-center bg-muted/20 text-xs text-muted-foreground">BPMN Viewer</div></div>
    <div class="${PC.contentPanel}"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">v2.0</span></div><div class="flex h-48 items-center justify-center bg-muted/20 text-xs text-muted-foreground">BPMN Viewer</div></div>
  </div>
  <div class="${PC.contentPanel}"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">변경 요약</span></div><p class="p-3 text-sm text-muted-foreground">+ 추가 2 · − 삭제 1</p></div>
</div>`,
)}`,
      "580px",
    ),

  "task-attr": () =>
    mainShell(
      "taskAttribute",
      "task-attr",
      `${pageHeader("table-properties", "Task 속성 관리", "BPMN Activity에 연결된 Task의 운영 메타데이터를 조회하고 수정합니다.", pageActions(true, false))}
${listWithFilter(
  filterPanel(
    filterField("법인", filterSelect("전체 법인")) +
      filterField("사업부", filterSelect("전체 사업부")) +
      filterInput("코드 또는 명칭 검색") +
      `<div class="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">OPR-02-03-01 · L4</div>`,
  ),
  `<div class="${PC.pageContent} gap-1.5">
  <div class="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">발주서 작성 <span class="font-mono font-normal text-muted-foreground">OPR-02-03-01</span></div>
  ${dataGrid("Task 속성 관리", 3, th("No.") + th("코드") + th("명칭") + th("레벨") + th("업무 정의") + th("BPMN") + th("상태") + th("작업"),
    tr(td("1") + td('<span class="font-mono">OPR-02-03-01</span>') + td("발주서 작성") + td("L4") + td("발주서를 작성") + td('<span class="text-primary underline">주문 v2</span>') + td(`<span class="${BADGE.default}">배포</span>`) + td(`<button class="${BTN.outline}">상세</button>`), true))}
</div>`,
  "300px",
)}`,
      "620px",
    ),

  "task-attr-sheet": () =>
    `<div class="relative">${mainShell("taskAttribute", "", pageHeader("table-properties", "Task 속성 관리", ""), "560px")}
<div class="absolute inset-0 z-50 flex justify-end bg-black/20">
  <div class="flex h-full w-[min(800px,calc(100vw-2rem))] flex-col border-l bg-background shadow-xl">
    <div class="border-b p-4"><h3 class="font-semibold">OPR-02-03-01 — 발주서 작성</h3><p class="text-xs text-muted-foreground">BPMN "주문 v2" · Activity_CreatePO</p>
    <div class="mt-2 flex gap-2"><span class="text-xs text-emerald-600">● 변경사항 있음</span><button class="${BTN.primary}">저장</button><button class="${BTN.outline}">닫기</button></div></div>
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <div class="rounded-lg border"><div class="bg-muted/50 px-3 py-2 text-sm font-semibold">Task 정의</div><div class="p-3"><textarea class="min-h-[80px] w-full rounded-md border border-input px-2 text-sm">발주서를 작성한다.</textarea></div></div>
      <div class="rounded-lg border"><div class="bg-muted/50 px-3 py-2 text-sm font-semibold">선행 프로세스</div><div class="p-3"><button class="${BTN.outline}"><i data-lucide="plus"></i>선행 추가</button></div></div>
    </div>
  </div>
</div></div>`,

  system: () =>
    mainShell(
      "systemLink",
      "system",
      `${pageHeader("link-2", "태스크-시스템 연결", "L3/L4 태스크와 시스템을 연결하고, 필요 시 화면을 추가합니다.", `<label class="flex items-center gap-1 text-xs"><input type="checkbox"/>주요</label><button class="${BTN.primary}"><i data-lucide="link"></i>연결 (2)</button>`)}
${listWithFilter(
  filterPanel(`<div class="rounded-md bg-accent px-2 py-1 text-xs">OPR-02-03-01 · L4</div>`),
  `<div class="${PC.pageContent} gap-1.5">
  <div class="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold">발주서 작성 L4</div>
  <div class="${PC.contentPanel}" style="height:220px">${panelTitleBar("연결된 시스템", 2)}<table class="pams-data-grid-table"><thead class="pams-data-grid-head"><tr>${th("시스템")}${th("주요")}${th("화면 수")}${th("작업")}</tr></thead><tbody class="pams-data-grid-body">${tr(td("ERP")+td("주요")+td("3")+td("🗑"), true)}</tbody></table></div>
  <div class="h-1 shrink-0 bg-transparent"></div>
  <div class="${PC.contentPanel} min-h-0 flex-1">${panelTitleBar("연결 가능 시스템", 48)}<table class="pams-data-grid-table"><thead class="pams-data-grid-head"><tr>${th("☑")}${th("시스템")}</tr></thead><tbody class="pams-data-grid-body">${tr(td("☑")+td("WMS"))}</tbody></table></div>
</div>`,
)}`,
      "620px",
    ),

  "kpi-risk": () => stubPage("KPI/리스크/통제", "kpiRisk"),
  "ext-tables": () =>
    mainShell(
      "externalTables",
      "ext-tables",
      `${pageHeader("database", "외부 테이블 조회", "시스템별 외부 API로 테이블과 컬럼 메타정보를 조회합니다.", pageActions(true, false))}
${listWithFilter(
  filterPanel(
    filterField("시스템", filterSelect("ERP"), true) +
      filterField("스키마", filterInput("", "dbo")) +
      filterInput("테이블명 또는 한글명 검색"),
  ),
  `<div class="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
  ${dataGrid("테이블", undefined, th("테이블명") + th("한글명") + th("작업"), tr(td('<span class="font-mono">PO_HEADER</span>') + td("발주 헤더") + td(`<button class="${BTN.outline}">선택</button>`), true))}
  ${dataGrid("컬럼", undefined, th("컬럼명") + th("한글명") + th("타입"), tr(td('<span class="font-mono">PO_NO</span>') + td("발주번호") + td("varchar")))}
</div>`,
)}`,
      "580px",
    ),

  "data-link": () =>
    mainShell(
      "dataLink",
      "data-link",
      `${pageHeader("link-2", "태스크-테이블 연결", "외부 테이블을 선택해 태스크의 입력/출력/참조 데이터로 연결합니다.", `${filterSelect("입력")}<button class="${BTN.primary}">연결 (1)</button>`)}
${listWithFilter(
  filterPanel(`<div class="rounded-md bg-accent px-2 py-1 text-xs">OPR-02-03-01</div>`),
  `<div class="${PC.pageContent} gap-1.5">
  <div class="${PC.contentPanel}" style="height:220px">${panelTitleBar("연결된 테이블", 2)}<table class="pams-data-grid-table"><thead class="pams-data-grid-head"><tr>${th("시스템")}${th("테이블")}${th("유형")}${th("CRUD")}</tr></thead><tbody class="pams-data-grid-body">${tr(td("ERP")+td('<span class="font-mono">PO_HEADER</span>')+td("출력")+td("생성"))}</tbody></table></div>
  <div class="${PC.contentPanel} min-h-0 flex-1">${panelTitleBar("연결 가능 테이블", 156)}<table class="pams-data-grid-table"><thead class="pams-data-grid-head"><tr>${th("☑")}${th("테이블")}${th("한글명")}</tr></thead><tbody class="pams-data-grid-body">${tr(td("☑")+td('<span class="font-mono">VENDOR_MST</span>')+td("거래처"))}</tbody></table></div>
</div>`,
)}`,
      "620px",
    ),

  "data-impact": () => stubPage("데이터 연결", "dataImpact"),
  impact: () => stubPage("분석", "impactAnalysis"),
  search: () => stubPage("분석", "unifiedSearch"),
  heatmap: () => stubPage("Heat Map", "heatMap"),

  "ops-graph": () =>
    mainShell(
      "operationsGraph",
      "ops-graph",
      `${pageHeader("waypoints", "운영 지식그래프", "프로세스·시스템·데이터 간 운영 관계를 시각적으로 탐색합니다.")}
<div class="flex min-h-0 flex-1 gap-0 overflow-hidden">
  <aside class="${PC.contentPanel} w-[300px] shrink-0"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">탐색</span></div>
  <div class="space-y-3 p-3 text-xs"><p class="text-[10px] font-semibold uppercase text-muted-foreground">기준 노드</p><p class="font-semibold">주문 접수</p><p class="font-mono text-muted-foreground">OPR-02-01 · L3</p>
  <button class="${BTN.outline} w-full"><i data-lucide="folder-tree"></i>프로세스 선택</button></div></aside>
  <div class="w-1.5 shrink-0"></div>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col ${PC.contentPanel} p-0">
    <div class="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-xs"><input class="h-7 w-32 rounded-md border border-input px-2" placeholder="노드 검색" readonly /><span class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-sky-700">그래프</span><button class="${BTN.outline} ml-auto">보내기</button></div>
    <div class="relative min-h-0 flex-1 bg-[radial-gradient(circle,#cbd5e1_0.8px,transparent_0.8px)] bg-[size:20px_20px] bg-muted/20"><p class="absolute left-2 top-2 rounded border bg-background/90 px-2 py-0.5 text-[10px] text-muted-foreground">노드 12 · 엣지 18</p></div>
    <div class="flex gap-3 border-t px-3 py-1 text-[10px] text-muted-foreground"><span>계층 뷰</span><span>선택: 발주서 작성</span></div>
  </div>
  <div class="w-1.5 shrink-0"></div>
  <aside class="${PC.contentPanel} w-[288px] shrink-0"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">상세</span></div>
  <div class="p-3"><span class="${BADGE.outline}">Task</span><p class="mt-2 font-semibold">발주서 작성</p><p class="font-mono text-[11px] text-muted-foreground">OPR-02-03-01</p></div></aside>
</div>`,
      "640px",
    ),

  approvals: () =>
    mainShell(
      "approvalInbox",
      "approvals",
      `${pageHeader("inbox", "승인 대기함", "검토 중인 프로세스 변경 요청을 승인하거나 반려합니다.", pageActions(true, false))}
${listWithFilter("", dataGrid("승인 대기함", undefined, th("코드") + th("명칭") + th("레벨") + th("상태") + th("작업"),
  tr(td('<span class="font-mono">OPR-02-03-01</span>') + td("발주서 작성") + td("L4") + td(`<span class="${BADGE.outline}">검토 중</span>`) + td(`<button class="${BTN.primary}">승인</button> <button class="${BTN.outline}">반려</button>`))))}`,
      "520px",
    ),

  history: () => stubPage("변경 이력", "changeHistory"),
  users: () => stubPage("사용자/권한", "usersPermissions"),
  orgs: () => stubPage("조직 마스터", "orgMaster"),
  roles: () => stubPage("역할 마스터", "roleMaster"),

  systems: () =>
    mainShell(
      "systemMaster",
      "systems",
      `${pageHeader("server", "시스템 마스터", "법인·사업부별 시스템과 외부 테이블 API 설정을 관리합니다.", pageActions(true, true, "시스템 추가"))}
${listWithFilter(
  filterPanel(filterInput("시스템 코드, 이름, 설명 검색")),
  dataGrid("시스템", undefined, th("No.") + th("코드") + th("시스템명") + th("법인") + th("유형") + th("작업"),
    tr(td("1") + td('<span class="font-mono">ERP</span>') + td("ERP 시스템") + td("QNC") + td("운영") + td("✎"))),
)}`,
      "560px",
    ),

  "systems-dialog": () =>
    `<div class="relative flex h-[500px] items-center justify-center">${mainShell("systemMaster", "", pageHeader("server", "시스템 마스터", ""), "500px")}
<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div class="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
<h3 class="text-lg font-semibold">시스템 추가</h3><div class="mt-4 grid grid-cols-2 gap-4">${filterField("시스템 코드", filterSelect("선택"))}${filterField("법인", filterSelect("QNC"))}</div>
${filterField("테이블 API URL", '<input class="h-7 w-full rounded-md border border-input px-2 text-sm" readonly />')}
<div class="mt-6 flex justify-end gap-2"><button class="${BTN.outline}">취소</button><button class="${BTN.primary}">저장</button></div></div></div></div>`,

  "ext-api": () =>
    mainShell(
      "externalApi",
      "ext-api",
      `${pageHeader("webhook", "외부 시스템 API 설정", "공통 외부 API 엔드포인트와 시스템별 호출 파라미터를 관리합니다.", pageActions(true, false))}
${listWithFilter(
  filterPanel(filterInput("시스템 코드, 이름 검색")),
  `<div class="flex min-h-0 flex-1 flex-col gap-1.5">
  <div class="${PC.contentPanel}"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">공통 API 설정</span></div><div class="p-4 space-y-3">${filterField("테이블 목록 API URL", '<input class="h-7 w-full rounded-md border border-input px-2 text-sm" value="https://api.example.com/tables" readonly />')}<button class="${BTN.primary}">저장</button></div></div>
  <div class="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
    <div class="${PC.contentPanel}"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">시스템</span></div><div class="p-2"><div class="rounded-md bg-accent px-2 py-1.5 text-xs">ERP <span class="${BADGE.default} ml-1">설정됨</span></div></div></div>
    <div class="${PC.contentPanel}"><div class="${PC.panelTitleBar}"><span class="text-[13px] font-semibold">시스템별 파라미터</span></div><div class="p-3"><textarea class="min-h-[100px] w-full rounded-md border border-input p-2 font-mono text-[11px]" readonly>{"schema":"dbo"}</textarea><div class="mt-2 flex gap-2"><button class="${BTN.outline}">연결 테스트</button><button class="${BTN.primary}">저장</button></div></div></div>
  </div>
</div>`,
)}`,
      "640px",
    ),

  codes: () =>
    mainShell(
      "codeManagement",
      "codes",
      `${pageHeader("code", "코드 관리", "코드 그룹과 상세 코드를 관리합니다.", pageActions(true, true, "그룹 추가"))}
${listWithFilter(
  filterPanel(filterInput("코드 그룹 또는 코드명 검색")),
  `<div class="grid min-h-0 flex-1 grid-cols-2 gap-1.5">
  ${dataGrid("코드 그룹", undefined, th("코드명") + th("코드 그룹") + th("상태") + th("상세"),
    tr(td("법인") + td('<span class="font-mono">COMPANY_CD</span>') + td(`<span class="${BADGE.default}">사용</span>`) + td("12"), true))}
  ${dataGrid("상세 코드", undefined, th("상세 코드") + th("코드명") + th("정렬"),
    tr(td('<span class="font-mono">QNC</span>') + td("큐앤씨") + td("1")))}
</div>`,
)}`,
      "580px",
    ),
};

// ── Build nav ──
let navHtml = `<h1 class="px-3 py-2 text-sm font-bold leading-snug">PAMS Fidelity<br><span class="font-normal text-muted-foreground">Tailwind 컴파일 CSS</span></h1>`;
navHtml += `<a href="#inventory" class="doc-nav-link">📋 화면 목록</a><a href="#about" class="doc-nav-link">ℹ️ 정확도</a>`;
let lastGrp = "";
for (const s of screens) {
  if (s.grp !== lastGrp) {
    navHtml += `<div class="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">${s.grp}</div>`;
    lastGrp = s.grp;
  }
  navHtml += `<a href="#${s.id}" class="doc-nav-link">${s.title}</a>`;
}

const liveCount = screens.filter((s) => s.status === "live").length;
const stubCount = screens.filter((s) => s.status === "stub").length;

let sections = `<section id="inventory" class="mb-12 scroll-mt-4"><h2 class="mb-3 text-lg font-semibold">화면 목록 (${screens.length})</h2>
<table class="w-full border-collapse overflow-hidden rounded-lg border border-slate-200/85 bg-white text-sm shadow-sm">
<thead><tr class="bg-slate-50 text-left text-xs text-muted-foreground"><th class="p-2">화면</th><th class="p-2">Route</th><th class="p-2">상태</th></tr></thead><tbody>`;
for (const s of screens) {
  sections += `<tr class="border-t"><td class="p-2"><a href="#${s.id}" class="text-primary hover:underline">${s.title}</a></td><td class="p-2 font-mono text-xs">/ko${s.route}</td><td class="p-2">${tag(s.status)}</td></tr>`;
}
sections += `</tbody></table></section>`;

sections += `<section id="about" class="mb-12 rounded-lg border border-sky-200/80 bg-sky-50/50 p-4 text-sm"><h2 class="mb-2 font-semibold">디자인 정확도</h2>
<ul class="list-inside list-disc space-y-1 text-muted-foreground">
<li><strong class="text-foreground">CSS</strong>: <code class="text-xs">app/globals.css</code>를 Tailwind v4로 컴파일 — oklch 색상·pams-data-grid·filter 스타일 동일</li>
<li><strong class="text-foreground">className</strong>: PageHeader, FilterPanel, DataGrid, Button 등 실제 컴포넌트 문자열 사용</li>
<li><strong class="text-foreground">폰트</strong>: Geist (Google Fonts CDN)</li>
<li>구현 ${liveCount} · 스텁 ${stubCount} · Overlay ${screens.filter((s) => s.status === "overlay").length}</li>
</ul></section>`;

for (const s of screens) {
  const fn = bodies[s.id];
  const content = fn ? fn() : stubPage(s.title, s.active || "");
  sections += `<section id="${s.id}" class="mb-16 scroll-mt-4"><div class="mb-3 flex flex-wrap items-baseline gap-2">
  <code class="text-[11px] text-primary">/ko${s.route}</code><h2 class="text-lg font-semibold">${s.title}</h2>${tag(s.status)}</div>${content}</section>`;
}

const docStyles = `
.doc-layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.doc-nav { position: sticky; top: 0; height: 100vh; overflow-y: auto; border-right: 1px solid var(--border); background: var(--card); }
.doc-nav-link { display: block; padding: 0.35rem 0.75rem; margin: 0 0.35rem; border-radius: 0.375rem; font-size: 0.8125rem; color: var(--muted-foreground); text-decoration: none; }
.doc-nav-link:hover { background: var(--accent); color: var(--accent-foreground); }
.doc-main { padding: 1.5rem 2rem 4rem; max-width: 1200px; }
.mock-frame { font-size: inherit; }
`;

const html = `<!DOCTYPE html>
<html lang="ko" class="h-full" style="--font-geist-sans: 'Geist', system-ui, sans-serif; --font-sans: var(--font-geist-sans);">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>PAMS — Fidelity UI Mockup (${screens.length} screens)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="pams-fidelity.css"/>
<style>${docStyles}</style>
</head>
<body class="h-full min-h-0 antialiased bg-background text-foreground">
<div class="doc-layout">
<nav class="doc-nav">${navHtml}</nav>
<main class="doc-main">
<div class="mb-8 rounded-xl bg-primary p-6 text-primary-foreground">
<h1 class="text-2xl font-bold">PAMS — Fidelity UI Mockup</h1>
<p class="mt-2 max-w-2xl text-sm opacity-90">실제 <code class="rounded bg-white/20 px-1">globals.css</code> + component className을 사용한 고정밀 HTML 목업. 이전 simplified mockup과 달리 Tailwind 컴파일 CSS로 앱과 동일한 디자인 토큰·그리드·필터 스타일을 적용합니다.</p>
</div>
${sections}
</div>
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>document.addEventListener("DOMContentLoaded",()=>{if(window.lucide)lucide.createIcons();});</script>
</body></html>`;

fs.writeFileSync(HTML_OUT, html, "utf8");

// Tailwind compile
console.log("Compiling Tailwind CSS from globals.css...");
execSync(
  `npx @tailwindcss/cli -i "${path.join(MOCKUP_DIR, "pams-fidelity-input.css")}" -o "${CSS_OUT}" --cwd "${ROOT}"`,
  { stdio: "inherit", cwd: ROOT },
);

// Copy to docs root with adjusted css path
const publicHtml = html.replace('href="pams-fidelity.css"', 'href="mockup/pams-fidelity.css"');
fs.writeFileSync(PUBLIC_HTML, publicHtml, "utf8");

console.log("OK:", PUBLIC_HTML);
console.log("CSS:", CSS_OUT, fs.statSync(CSS_OUT).size, "bytes");
