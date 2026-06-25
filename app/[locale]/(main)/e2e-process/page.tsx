import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";

import { E2eProcessListClient } from "./E2eProcessListClient";

/** E2E 프로세스 목록 페이지 */
export default function E2eProcessPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-10" />}>
      <E2eProcessListClient />
    </Suspense>
  );
}
