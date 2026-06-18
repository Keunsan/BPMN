import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { DataTableLink } from "@/components/data/DataTableLink";

export default function DataLinkPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <DataTableLink />
    </Suspense>
  );
}
