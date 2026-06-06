"use client";

import { useCallback, useState } from "react";

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item !== null ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** localStorage 동기화 훅 */
export const useLocalStorage = <T,>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] => {
  const [stored, setStored] = useState<T>(() =>
    readStorage(key, initialValue),
  );

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [key],
  );

  return [stored, setValue];
};
