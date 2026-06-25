"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export type UseHorizontalPanelResizeOptions = {
  storageKey: string;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  enabled?: boolean;
  /** left — 분할선이 패널 오른쪽, right — 분할선이 패널 왼쪽 */
  side?: "left" | "right";
};

const readStoredWidth = (
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
): number => {
  if (typeof window === "undefined") {
    return defaultWidth;
  }
  const saved = window.localStorage.getItem(storageKey);
  const parsed = saved ? Number(saved) : defaultWidth;
  if (Number.isFinite(parsed)) {
    return clamp(parsed, minWidth, maxWidth);
  }
  return defaultWidth;
};

/** 패널 좌우 드래그 리사이즈 훅 */
export const useHorizontalPanelResize = ({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  enabled = true,
  side = "left",
}: UseHorizontalPanelResizeOptions) => {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    hydratedRef.current = true;
    setWidth(readStoredWidth(storageKey, defaultWidth, minWidth, maxWidth));
  }, [defaultWidth, maxWidth, minWidth, storageKey]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeRef.current) {
        return;
      }
      const delta = event.clientX - resizeRef.current.startX;
      const nextWidth =
        side === "right"
          ? resizeRef.current.startW - delta
          : resizeRef.current.startW + delta;
      setWidth(clamp(nextWidth, minWidth, maxWidth));
    };

    const handlePointerUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
      if (hydratedRef.current) {
        window.localStorage.setItem(storageKey, String(widthRef.current));
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
  }, [isResizing, maxWidth, minWidth, side, storageKey]);

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!enabled) {
      return;
    }
    event.preventDefault();
    resizeRef.current = { startX: event.clientX, startW: widthRef.current };
    setIsResizing(true);
  };

  return {
    width,
    isResizing,
    handleResizePointerDown,
  };
};
