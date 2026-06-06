"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
};

type TreeProps = {
  data: TreeNode[];
  className?: string;
  defaultExpandedIds?: string[];
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
};

type TreeItemProps = {
  node: TreeNode;
  level: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect?: (node: TreeNode) => void;
  selectedId?: string;
};

function TreeItem({
  node,
  level,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
}: TreeItemProps) {
  const hasChildren = Boolean(node.children?.length);
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <li
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-md py-1 pr-2 text-sm",
          isSelected && "bg-accent text-accent-foreground",
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-sm hover:bg-muted"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            onClick={() => onToggle(node.id)}
          >
            {isExpanded ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </button>
        ) : (
          <span className="inline-block size-6" />
        )}
        <button
          type="button"
          className="flex-1 truncate text-left hover:underline"
          onClick={() => onSelect?.(node)}
        >
          {node.label}
        </button>
      </div>
      {hasChildren && isExpanded && (
        <ul role="group">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** 계층 트리 UI — Phase 2 ProcessTree에서 확장 예정 */
export function Tree({
  data,
  className,
  defaultExpandedIds = [],
  onSelect,
  selectedId,
}: TreeProps) {
  const [expandedIds, setExpandedIds] = React.useState(
    () => new Set(defaultExpandedIds),
  );

  const onToggle = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <ul role="tree" className={cn("space-y-0.5", className)}>
      {data.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          level={0}
          expandedIds={expandedIds}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </ul>
  );
}
