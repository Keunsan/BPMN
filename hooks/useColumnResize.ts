"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

type ColumnWidthConfig = {
  key: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
};

type UseColumnResizeOptions = {
  columns: ColumnWidthConfig[];
  storageKey?: string;
  enabled?: boolean;
};

const readStoredWidths = (
  storageKey: string | undefined,
  columns: ColumnWidthConfig[],
): Record<string, number> => {
  const defaults = Object.fromEntries(
    columns.map((column) => [column.key, column.defaultWidth]),
  );

  if (!storageKey || typeof window === "undefined") {
    return defaults;
  }

  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      return defaults;
    }

    const parsed = JSON.parse(saved) as Record<string, unknown>;
    const next = { ...defaults };

    for (const column of columns) {
      const value = parsed[column.key];
      if (typeof value === "number" && Number.isFinite(value)) {
        next[column.key] = clamp(
          value,
          column.minWidth ?? 48,
          column.maxWidth ?? 640,
        );
      }
    }

    return next;
  } catch {
    return defaults;
  }
};

/** 데이터 그리드 컬럼 너비 드래그 조절 */
export const useColumnResize = ({
  columns,
  storageKey,
  enabled = true,
}: UseColumnResizeOptions) => {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    readStoredWidths(storageKey, columns),
  );
  const [resizingKey, setResizingKey] = useState<string | null>(null);
  const widthsRef = useRef(widths);
  const resizeRef = useRef<{ key: string; startX: number; startW: number } | null>(
    null,
  );
  const hydratedRef = useRef(false);

  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  useEffect(() => {
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!resizingKey) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeRef.current) {
        return;
      }

      const column = columns.find((item) => item.key === resizeRef.current?.key);
      if (!column) {
        return;
      }

      const delta = event.clientX - resizeRef.current.startX;
      const nextWidth = clamp(
        resizeRef.current.startW + delta,
        column.minWidth ?? 48,
        column.maxWidth ?? 640,
      );

      setWidths((current) => ({
        ...current,
        [column.key]: nextWidth,
      }));
    };

    const handlePointerUp = () => {
      resizeRef.current = null;
      setResizingKey(null);

      if (hydratedRef.current && storageKey) {
        window.localStorage.setItem(storageKey, JSON.stringify(widthsRef.current));
      }

      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };
  }, [columns, resizingKey, storageKey]);

  const handleResizePointerDown = useCallback(
    (key: string, event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      resizeRef.current = {
        key,
        startX: event.clientX,
        startW: widthsRef.current[key] ?? 0,
      };
      setResizingKey(key);
    },
    [enabled],
  );

  return {
    widths,
    getWidth: (key: string, defaultWidth: number) =>
      widths[key] ?? defaultWidth,
    resizingKey,
    handleResizePointerDown,
  };
};
