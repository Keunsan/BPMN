"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EditableColumn, EditableColumnOption } from "@/types/editable-data-grid";

type CellEditorProps<T extends { id: string }> = {
  column: EditableColumn<T>;
  value: unknown;
  options: EditableColumnOption[];
  onCommit: (value: unknown) => void;
  onCancel: () => void;
};

type TextareaCellEditorProps = {
  draft: unknown;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

/** textarea 팝오버 — 확인/취소 외 영역 클릭 시 닫히지 않음 */
const TextareaCellEditor = ({
  draft,
  onDraftChange,
  onCommit,
  onCancel,
  onKeyDown,
}: TextareaCellEditorProps) => {
  const tc = useTranslations("common");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  return (
    <Popover
      open
      onOpenChange={(_nextOpen, eventDetails) => {
        eventDetails.cancel();
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        className="pointer-events-none w-full truncate text-left text-sm"
        tabIndex={-1}
      >
        {String(draft ?? "") || "—"}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-2"
        align="start"
        initialFocus={textareaRef}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <Textarea
          ref={textareaRef}
          value={String(draft ?? "")}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={onKeyDown}
          rows={4}
          className="text-sm"
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>
            {tc("cancel")}
          </Button>
          <Button type="button" size="sm" onClick={onCommit}>
            {tc("confirm")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/** 셀 인라인 에디터 */export const CellEditor = <T extends { id: string }>({
  column,
  value,
  options,
  onCommit,
  onCancel,
}: CellEditorProps<T>) => {
  const [draft, setDraft] = useState<unknown>(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const [comboOpen, setComboOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => onCommit(draft);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
    if (event.key === "Enter" && column.editor !== "textarea") {
      event.preventDefault();
      commit();
    }
  };

  if (column.editor === "select") {
    return (
      <Select value={String(draft ?? "")} onValueChange={onCommit}>
        <SelectTrigger
          size="sm"
          className="h-7 w-full border-0 bg-transparent px-1 shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (column.editor === "combobox") {
    const filtered = options.filter((opt) =>
      opt.label.toLowerCase().includes(comboSearch.toLowerCase()),
    );
    return (
      <Popover open={comboOpen} onOpenChange={setComboOpen}>
        <PopoverTrigger className="flex h-7 w-full items-center justify-between rounded-md px-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="truncate">
            {options.find((o) => o.value === String(draft ?? ""))?.label ?? "—"}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            value={comboSearch}
            onChange={(e) => setComboSearch(e.target.value)}
            placeholder="검색"
            className="mb-2 h-8"
          />
          <div className="max-h-48 overflow-y-auto">
            <button
              type="button"
              className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                onCommit(null);
                setComboOpen(false);
              }}
            >
              —
            </button>
            {filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onCommit(opt.value);
                  setComboOpen(false);
                }}
              >
                {opt.value === String(draft ?? "") ? (
                  <Check className="size-3.5 shrink-0" />
                ) : (
                  <span className="size-3.5 shrink-0" />
                )}
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (column.editor === "textarea") {
    return (
      <TextareaCellEditor
        draft={draft}
        onDraftChange={(value) => setDraft(value)}
        onCommit={commit}
        onCancel={onCancel}
        onKeyDown={handleKeyDown}
      />
    );
  }
  if (column.editor === "checkbox") {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={Boolean(draft)}
        className="flex size-4 items-center justify-center rounded border border-input bg-background"
        onClick={() => onCommit(!draft)}
      >
        {draft ? <Check className="size-3 text-primary" /> : null}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type={
        column.editor === "number"
          ? "number"
          : column.editor === "date"
            ? "date"
            : "text"
      }
      value={String(draft ?? "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="h-7 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-2"
    />
  );
};
