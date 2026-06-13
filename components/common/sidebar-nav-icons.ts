import {
  Activity,
  BadgeCheck,
  Building2,
  ClipboardList,
  Code,
  Flame,
  GitCompare,
  GitCompareArrows,
  History,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Link2,
  Network,
  Plug,
  Plus,
  Radar,
  Search,
  Server,
  Share2,
  ShieldAlert,
  Table,
  UserCog,
  Users,
  Webhook,
  Waypoints,
  Workflow,
  type LucideIcon,
} from "lucide-react";

/** 사이드바 메뉴 아이콘 키 */
export type SidebarIconKey =
  | "dashboardOverview"
  | "dashboardActivity"
  | "processMap"
  | "processNew"
  | "processCompare"
  | "bpmnList"
  | "bpmnCompare"
  | "taskAttribute"
  | "raci"
  | "systemLink"
  | "kpiRisk"
  | "externalTables"
  | "dataLink"
  | "dataImpact"
  | "impactAnalysis"
  | "unifiedSearch"
  | "heatMap"
  | "operationsGraph"
  | "approvalInbox"
  | "changeHistory"
  | "improvements"
  | "usersPermissions"
  | "systemMaster"
  | "orgMaster"
  | "roleMaster"
  | "externalApi"
  | "codeManagement";

/** 사이드바 메뉴 아이콘 매핑 */
export const sidebarNavIcons: Record<SidebarIconKey, LucideIcon> = {
  dashboardOverview: LayoutDashboard,
  dashboardActivity: Activity,
  processMap: Network,
  processNew: Plus,
  processCompare: GitCompare,
  bpmnList: Workflow,
  bpmnCompare: GitCompareArrows,
  taskAttribute: ClipboardList,
  raci: Users,
  systemLink: Plug,
  kpiRisk: ShieldAlert,
  externalTables: Table,
  dataLink: Link2,
  dataImpact: Share2,
  impactAnalysis: Radar,
  unifiedSearch: Search,
  heatMap: Flame,
  operationsGraph: Waypoints,
  approvalInbox: Inbox,
  changeHistory: History,
  improvements: Lightbulb,
  usersPermissions: UserCog,
  systemMaster: Server,
  orgMaster: Building2,
  roleMaster: BadgeCheck,
  externalApi: Webhook,
  codeManagement: Code,
};
