"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

type UseVerticalPanelResizeOptions = {
  storageKey: string;
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
  enabled?: boolean;
};

const readStoredHeight = (
  storageKey: string,
  defaultHeight: number,
  minHeight: number,
  maxHeight: number,
): number => {
  if (typeof window === "undefined") {
    return defaultHeight;
  }
  const saved = window.localStorage.getItem(storageKey);
  const parsed = saved ? Number(saved) : defaultHeight;
  if (Number.isFinite(parsed)) {
    return clamp(parsed, minHeight, maxHeight);
  }
  return defaultHeight;
};

/** 패널 상하 드래그 리사이즈 훅 */
export const useVerticalPanelResize = ({
  storageKey,
  defaultHeight,
  minHeight,
  maxHeight,
  enabled = true,
}: UseVerticalPanelResizeOptions) => {
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const heightRef = useRef(height);
  const resizeRef = useRef<{ startY: number; startH: number } | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    heightRef.current = height;
  }, [height]);

  useEffect(() => {
    hydratedRef.current = true;
    setHeight(readStoredHeight(storageKey, defaultHeight, minHeight, maxHeight));
  }, [defaultHeight, maxHeight, minHeight, storageKey]);

  useEffect(() => {
    if (!isResizing) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeRef.current) {
        return;
      }
      const delta = event.clientY - resizeRef.current.startY;
      setHeight(
        clamp(resizeRef.current.startH + delta, minHeight, maxHeight),
      );
    };

    const handlePointerUp = () => {
      resizeRef.current = null;
      setIsResizing(false);
      if (hydratedRef.current) {
        window.localStorage.setItem(storageKey, String(heightRef.current));
      }
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };

    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.removeProperty("user-select");
      document.body.style.removeProperty("cursor");
    };
  }, [isResizing, maxHeight, minHeight, storageKey]);

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!enabled) {
      return;
    }
    event.preventDefault();
    resizeRef.current = { startY: event.clientY, startH: heightRef.current };
    setIsResizing(true);
  };

  return {
    height,
    isResizing,
    handleResizePointerDown,
  };
};
