"use client";

import { FilterPanelSideBody } from "@/components/common/layout/FilterPanelSideBody";
import { cn } from "@/lib/utils";

type ListPageBodyBaseProps = {
  content: React.ReactNode;
  className?: string;
};

type ListPageBodyWithFilterProps = ListPageBodyBaseProps & {
  filter: React.ReactNode;
  filterStorageKey: string;
  filterDefaultWidth?: number;
  filterMinWidth?: number;
  filterMaxWidth?: number;
  splitterLabel?: string;
};

type ListPageBodyWithoutFilterProps = ListPageBodyBaseProps & {
  filter?: undefined;
  filterStorageKey?: undefined;
};

type ListPageBodyProps =
  | ListPageBodyWithFilterProps
  | ListPageBodyWithoutFilterProps;

/** 좌측 필터 + 우측 콘텐츠 2열 본문 */
export const ListPageBody = (props: ListPageBodyProps) => {
  const { content, className } = props;

  if (!props.filter) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <FilterPanelSideBody
      filter={props.filter}
      storageKey={props.filterStorageKey}
      defaultWidth={props.filterDefaultWidth}
      minWidth={props.filterMinWidth}
      maxWidth={props.filterMaxWidth}
      splitterLabel={props.splitterLabel}
      className={className}
    >
      {content}
    </FilterPanelSideBody>
  );
};
