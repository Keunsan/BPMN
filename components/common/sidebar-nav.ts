/** PRD 6.1 메뉴 구조 — Sidebar 네비게이션 설정 */

import type { SidebarIconKey } from "@/components/common/sidebar-nav-icons";

export type SidebarNavItem = {
  labelKey: string;
  href?: string;
  iconKey?: SidebarIconKey;
  children?: SidebarNavItem[];
};

export const sidebarNav: SidebarNavItem[] = [
  {
    labelKey: "menu.dashboard",
    children: [
      {
        labelKey: "menu.dashboardOverview",
        href: "/dashboard",
        iconKey: "dashboardOverview",
      },
      {
        labelKey: "menu.dashboardActivity",
        href: "/dashboard/activity",
        iconKey: "dashboardActivity",
      },
    ],
  },
  {
    labelKey: "menu.process",
    children: [
      {
        labelKey: "menu.processMap",
        href: "/process",
        iconKey: "processMap",
      },
      {
        labelKey: "menu.e2eProcess",
        href: "/e2e-process",
        iconKey: "e2eProcess",
      },
      {
        labelKey: "menu.processNew",
        href: "/process/new",
        iconKey: "processNew",
      },
      {
        labelKey: "menu.processCompare",
        href: "/process/compare",
        iconKey: "processCompare",
      },
    ],
  },
  {
    labelKey: "menu.bpmn",
    children: [
      { labelKey: "menu.bpmnList", href: "/bpmn", iconKey: "bpmnList" },
      {
        labelKey: "menu.bpmnCompare",
        href: "/bpmn/compare",
        iconKey: "bpmnCompare",
      },
    ],
  },
  {
    labelKey: "menu.metadata",
    children: [
      {
        labelKey: "menu.taskAttribute",
        href: "/metadata/task-attribute",
        iconKey: "taskAttribute",
      },
      { labelKey: "menu.raci", href: "/metadata/raci", iconKey: "raci" },
      {
        labelKey: "menu.systemLink",
        href: "/metadata/system",
        iconKey: "systemLink",
      },
      {
        labelKey: "menu.kpiRisk",
        href: "/metadata/kpi-risk",
        iconKey: "kpiRisk",
      },
    ],
  },
  {
    labelKey: "menu.data",
    children: [
      {
        labelKey: "menu.externalTables",
        href: "/data/external-tables",
        iconKey: "externalTables",
      },
      { labelKey: "menu.dataLink", href: "/data/link", iconKey: "dataLink" },
      {
        labelKey: "menu.dataImpact",
        href: "/data/impact",
        iconKey: "dataImpact",
      },
    ],
  },
  {
    labelKey: "menu.analysis",
    children: [
      {
        labelKey: "menu.impactAnalysis",
        href: "/analysis/impact",
        iconKey: "impactAnalysis",
      },
      {
        labelKey: "menu.operationsGraph",
        href: "/analysis/operations-graph",
        iconKey: "operationsGraph",
      },
      {
        labelKey: "menu.unifiedSearch",
        href: "/analysis/search",
        iconKey: "unifiedSearch",
      },
      { labelKey: "menu.heatMap", href: "/analysis/heatmap", iconKey: "heatMap" },
    ],
  },
  {
    labelKey: "menu.governance",
    children: [
      {
        labelKey: "menu.approvalInbox",
        href: "/governance/approvals",
        iconKey: "approvalInbox",
      },
      {
        labelKey: "menu.changeHistory",
        href: "/governance/history",
        iconKey: "changeHistory",
      },
      {
        labelKey: "menu.improvements",
        href: "/governance/improvements",
        iconKey: "improvements",
      },
    ],
  },
  {
    labelKey: "menu.systemAdmin",
    children: [
      {
        labelKey: "menu.usersPermissions",
        href: "/admin/users",
        iconKey: "usersPermissions",
      },
      {
        labelKey: "menu.systemMaster",
        href: "/admin/systems",
        iconKey: "systemMaster",
      },
      {
        labelKey: "menu.orgMaster",
        href: "/admin/organizations",
        iconKey: "orgMaster",
      },
      {
        labelKey: "menu.roleMaster",
        href: "/admin/roles",
        iconKey: "roleMaster",
      },
      {
        labelKey: "menu.externalApi",
        href: "/admin/external-api",
        iconKey: "externalApi",
      },
      {
        labelKey: "menu.codeManagement",
        href: "/admin/codes",
        iconKey: "codeManagement",
      },
    ],
  },
];
