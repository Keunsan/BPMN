import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";

import { ProcessListClient } from "./ProcessListClient";

/** 전사 프로세스 맵 */
const ProcessListPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProcessListClient />
    </Suspense>
  );
};

export default ProcessListPage;
