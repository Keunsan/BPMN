/** PRD 6.1 메뉴 구조 — Sidebar 네비게이션 설정 */

export type SidebarNavItem = {
  labelKey: string;
  href?: string;
  children?: SidebarNavItem[];
};

export const sidebarNav: SidebarNavItem[] = [
  {
    labelKey: "menu.dashboard",
    children: [
      { labelKey: "menu.dashboardOverview", href: "/dashboard" },
      { labelKey: "menu.dashboardActivity", href: "/dashboard/activity" },
    ],
  },
  {
    labelKey: "menu.process",
    children: [
      { labelKey: "menu.processMap", href: "/process" },
      { labelKey: "menu.processNew", href: "/process/new" },
      { labelKey: "menu.processCompare", href: "/process/compare" },
    ],
  },
  {
    labelKey: "menu.bpmn",
    children: [
      { labelKey: "menu.bpmnList", href: "/bpmn" },
      { labelKey: "menu.bpmnCompare", href: "/bpmn/compare" },
    ],
  },
  {
    labelKey: "menu.metadata",
    children: [
      { labelKey: "menu.raci", href: "/metadata/raci" },
      { labelKey: "menu.systemLink", href: "/metadata/system" },
      { labelKey: "menu.kpiRisk", href: "/metadata/kpi-risk" },
    ],
  },
  {
    labelKey: "menu.data",
    children: [
      { labelKey: "menu.externalTables", href: "/data/external-tables" },
      { labelKey: "menu.dataLink", href: "/data/link" },
      { labelKey: "menu.dataImpact", href: "/data/impact" },
    ],
  },
  {
    labelKey: "menu.analysis",
    children: [
      { labelKey: "menu.impactAnalysis", href: "/analysis/impact" },
      { labelKey: "menu.unifiedSearch", href: "/analysis/search" },
      { labelKey: "menu.heatMap", href: "/analysis/heatmap" },
    ],
  },
  {
    labelKey: "menu.governance",
    children: [
      { labelKey: "menu.approvalInbox", href: "/governance/approvals" },
      { labelKey: "menu.changeHistory", href: "/governance/history" },
      { labelKey: "menu.improvements", href: "/governance/improvements" },
    ],
  },
  {
    labelKey: "menu.systemAdmin",
    children: [
      { labelKey: "menu.usersPermissions", href: "/admin/users" },
      { labelKey: "menu.systemMaster", href: "/admin/systems" },
      { labelKey: "menu.orgMaster", href: "/admin/organizations" },
      { labelKey: "menu.roleMaster", href: "/admin/roles" },
      { labelKey: "menu.externalApi", href: "/admin/external-api" },
      { labelKey: "menu.codeManagement", href: "/admin/codes" },
    ],
  },
];
