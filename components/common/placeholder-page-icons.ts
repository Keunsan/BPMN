import {
  Activity,
  Building2,
  Database,
  Flame,
  Gauge,
  GitBranch,
  History,
  Lightbulb,
  Search,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

/** PlaceholderPage 빈 화면 아이콘 키 */
export type PlaceholderPageIconKey =
  | "activity"
  | "building2"
  | "database"
  | "flame"
  | "gauge"
  | "gitBranch"
  | "history"
  | "lightbulb"
  | "search"
  | "shield"
  | "users";

/** PlaceholderPage 아이콘 매핑 (클라이언트 전용) */
export const placeholderPageIcons: Record<PlaceholderPageIconKey, LucideIcon> = {
  activity: Activity,
  building2: Building2,
  database: Database,
  flame: Flame,
  gauge: Gauge,
  gitBranch: GitBranch,
  history: History,
  lightbulb: Lightbulb,
  search: Search,
  shield: Shield,
  users: Users,
};
