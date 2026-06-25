"use client";

import {
  Children,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

const PROCESS_CODE_RE = /(STP-[A-Z0-9][\w-]*)/g;

/** STP 코드 등 프로세스 식별자를 강조 */
const enrichText = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(PROCESS_CODE_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(
      <span
        key={`${match[0]}-${index}`}
        className="font-mono font-medium text-primary"
      >
        {match[0]}
      </span>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
};

const enrichChildren = (children: ReactNode): ReactNode =>
  Children.map(children, (child) =>
    typeof child === "string" ? enrichText(child) : child,
  );

const EnrichedBlock = ({
  tag: Tag,
  className,
  children,
}: PropsWithChildren<{
  tag: "h3" | "h4" | "p" | "li" | "strong" | "th" | "td";
  className: string;
}>) => <Tag className={className}>{enrichChildren(children)}</Tag>;

const markdownComponents: Components = {
  h3: ({ children }) => (
    <EnrichedBlock
      tag="h3"
      className="mt-4 mb-2 text-sm font-semibold first:mt-0"
    >
      {children}
    </EnrichedBlock>
  ),
  h4: ({ children }) => (
    <EnrichedBlock
      tag="h4"
      className="mt-3 mb-1.5 text-sm font-medium text-muted-foreground"
    >
      {children}
    </EnrichedBlock>
  ),
  p: ({ children }) => (
    <EnrichedBlock tag="p" className="mb-3 text-sm leading-relaxed last:mb-0">
      {children}
    </EnrichedBlock>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-relaxed last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm leading-relaxed last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <EnrichedBlock tag="li" className="leading-relaxed">
      {children}
    </EnrichedBlock>
  ),
  strong: ({ children }) => (
    <EnrichedBlock tag="strong" className="font-semibold">
      {children}
    </EnrichedBlock>
  ),
  code: ({ children }) => (
    <code className="rounded-md bg-muted px-1 py-0.5 font-mono text-sm text-primary">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/60">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <EnrichedBlock
      tag="th"
      className="px-3 py-2 text-left text-sm font-medium text-foreground"
    >
      {children}
    </EnrichedBlock>
  ),
  td: ({ children }) => (
    <EnrichedBlock
      tag="td"
      className="px-3 py-2 align-top text-sm leading-relaxed"
    >
      {children}
    </EnrichedBlock>
  ),
  hr: () => <hr className="my-4 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
};

type AiMarkdownContentProps = {
  content: string;
  className?: string;
};

/** AI 답변용 마크다운 렌더러 — 표·목록·코드 가독성 강화 */
export const AiMarkdownContent = ({
  content,
  className,
}: AiMarkdownContentProps) => (
  <div className={cn("text-foreground", className)}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  </div>
);
