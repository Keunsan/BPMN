"use client";

import { cn } from "@/lib/utils";
import type { GraphNodeKind } from "@/types/operations-graph";
import type { ProcessStatus } from "@/types/process";

type GraphNodeBadgeProps = {
  variant: "kind" | "status";
  kind?: GraphNodeKind;
  status?: ProcessStatus;
  label: string;
  className?: string;
};

const kindBadgeClass: Partial<Record<GraphNodeKind, string>> = {
  E2E: "pams-ops-graph-badge--kind-e2e",
  TASK: "pams-ops-graph-badge--kind-task",
  L3: "pams-ops-graph-badge--kind-l3",
  APPLICATION: "pams-ops-graph-badge--kind-application",
  TABLE: "pams-ops-graph-badge--kind-table",
  INTERFACE: "pams-ops-graph-badge--kind-interface",
};

const statusBadgeClass: Partial<Record<ProcessStatus, string>> = {
  DRAFT: "pams-ops-graph-badge--status-draft",
  IN_REVIEW: "pams-ops-graph-badge--status-in-review",
  APPROVED: "pams-ops-graph-badge--status-approved",
  PUBLISHED: "pams-ops-graph-badge--status-published",
  OBSOLETE: "pams-ops-graph-badge--status-obsolete",
};

/** 노드 타입·상태 라벨 배지 */
export const GraphNodeBadge = ({
  variant,
  kind,
  status,
  label,
  className,
}: GraphNodeBadgeProps) => {
  const toneClass =
    variant === "kind" && kind
      ? kindBadgeClass[kind]
      : variant === "status" && status
        ? statusBadgeClass[status]
        : undefined;

  return (
    <span
      className={cn(
        "pams-ops-graph-badge",
        variant === "kind"
          ? "pams-ops-graph-badge--kind"
          : "pams-ops-graph-badge--status",
        toneClass,
        className,
      )}
    >
      {label}
    </span>
  );
};
