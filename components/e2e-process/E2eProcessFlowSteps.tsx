"use client";

import {
  ArrowRight,
  CircleDot,
  Flag,
  GitBranch,
  Split,
  Workflow,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { E2eFlowStep } from "@/lib/utils/bpmn-e2e-flow";
import { cn } from "@/lib/utils";

type E2eProcessFlowStepsProps = {
  steps: E2eFlowStep[];
  className?: string;
};

const stepIcon = (kind: E2eFlowStep["kind"]) => {
  switch (kind) {
    case "start":
      return CircleDot;
    case "end":
      return Flag;
    case "gateway":
      return Split;
    case "l3_call":
      return GitBranch;
    case "unlinked_call":
      return Workflow;
    default:
      return ArrowRight;
  }
};

/** E2E 실행 흐름 단계 타임라인 */
export const E2eProcessFlowSteps = ({
  steps,
  className,
}: E2eProcessFlowStepsProps) => {
  const t = useTranslations("e2eProcess");

  if (!steps.length) {
    return null;
  }

  return (
    <ol className={cn("space-y-0", className)}>
      {steps.map((step, index) => {
        const Icon = stepIcon(step.kind);
        const isL3Call = step.kind === "l3_call";
        const isUnlinked = step.kind === "unlinked_call";
        const gatewayLabel =
          step.gatewayType === "EXCLUSIVE_GATEWAY"
            ? t("flowGatewayExclusive")
            : step.gatewayType === "PARALLEL_GATEWAY"
              ? t("flowGatewayParallel")
              : step.gatewayType === "INCLUSIVE_GATEWAY"
                ? t("flowGatewayInclusive")
                : null;

        return (
          <li key={step.elementBpmnId} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-border"
              />
            ) : null}
            <div
              className={cn(
                "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border bg-background",
                step.kind === "start" && "border-primary/40 text-primary",
                step.kind === "end" && "border-muted-foreground/40 text-muted-foreground",
                isL3Call && "border-primary bg-primary/10 text-primary",
                isUnlinked && "border-destructive/40 text-destructive",
                step.kind === "gateway" && "border-border text-muted-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("flowStepNo", { no: step.stepNo })}
                </span>
                {step.kind === "start" ? (
                  <Badge variant="outline">{t("flowStepStart")}</Badge>
                ) : null}
                {step.kind === "end" ? (
                  <Badge variant="outline">{t("flowStepEnd")}</Badge>
                ) : null}
                {gatewayLabel ? (
                  <Badge variant="secondary">{gatewayLabel}</Badge>
                ) : null}
                {isUnlinked ? (
                  <Badge variant="destructive">{t("flowStepUnlinked")}</Badge>
                ) : null}
              </div>
              {isL3Call ? (
                <div className="mt-1">
                  <p className="font-medium">{step.linkedProcessName ?? step.label}</p>
                  {step.linkedProcessCode ? (
                    <p className="font-mono text-sm text-muted-foreground">
                      {step.linkedProcessCode}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p
                  className={cn(
                    "mt-1 text-sm",
                    step.kind === "start" || step.kind === "end"
                      ? "text-muted-foreground"
                      : "font-medium",
                  )}
                >
                  {step.kind === "start"
                    ? t("flowStepStart")
                    : step.kind === "end"
                      ? t("flowStepEnd")
                      : step.label}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
