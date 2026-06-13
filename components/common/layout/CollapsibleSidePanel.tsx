"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { pamsContentPanelClass } from "@/components/common/layout/panel-styles";
import { PanelTitleBar } from "@/components/common/layout/PanelTitleBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapsibleSidePanelProps = {
  side: "left" | "right";
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  width: number;
  title?: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

/** 좌·우 접기 가능한 사이드 패널 */
export const CollapsibleSidePanel = ({
  side,
  collapsed,
  onCollapsedChange,
  width,
  title,
  toolbar,
  children,
  className,
  bodyClassName,
}: CollapsibleSidePanelProps) => {
  const t = useTranslations("operationsGraph");

  const expandLabel =
    side === "left" ? t("panel.expandLeft") : t("panel.expandRight");
  const collapseLabel =
    side === "left" ? t("panel.collapseLeft") : t("panel.collapseRight");

  const CollapseIcon = side === "left" ? PanelLeftClose : PanelRightClose;
  const ExpandIcon = side === "left" ? PanelLeftOpen : PanelRightOpen;

  if (collapsed) {
    return (
      <aside
        className={cn(
          "flex w-8 shrink-0 flex-col self-stretch transition-[width] duration-200",
          className,
        )}
      >
        <div className="flex shrink-0 justify-center pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onCollapsedChange(false)}
            title={expandLabel}
            aria-label={expandLabel}
            aria-expanded={false}
          >
            <ExpandIcon className="size-3.5" />
          </Button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      style={{ width }}
      className={cn(
        "flex min-h-0 shrink-0 flex-col self-stretch transition-[width] duration-200",
        className,
      )}
    >
      <div
        className={cn(
          pamsContentPanelClass,
          "flex min-h-0 flex-1 flex-col overflow-hidden",
        )}
      >
        <PanelTitleBar
          title={title}
          toolbar={
            <>
              {toolbar}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => onCollapsedChange(true)}
                title={collapseLabel}
                aria-label={collapseLabel}
                aria-expanded
              >
                <CollapseIcon className="size-3.5" />
              </Button>
            </>
          }
          icon
        />
        <div className={cn("min-h-0 flex-1 overflow-auto", bodyClassName)}>
          {children}
        </div>
      </div>
    </aside>
  );
};
