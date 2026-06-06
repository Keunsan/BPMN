"use client";

import { useCallback, useMemo, useState } from "react";

type UsePaginationOptions = {
  initialPage?: number;
  initialLimit?: number;
  total?: number;
};

/** 페이지네이션 상태 훅 */
export const usePagination = ({
  initialPage = 1,
  initialLimit = 20,
  total = 0,
}: UsePaginationOptions = {}) => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
  }, [initialPage]);

  return {
    page,
    limit,
    totalPages,
    offset: (page - 1) * limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    reset,
    params: { page, limit },
  };
};
