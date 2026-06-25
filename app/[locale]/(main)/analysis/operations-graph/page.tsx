import { Suspense } from "react";

import { OperationsGraphClient } from "@/components/analysis/operations-graph/OperationsGraphClient";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export default function OperationsGraphPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-10" />}>
      <OperationsGraphClient />
    </Suspense>
  );
}
