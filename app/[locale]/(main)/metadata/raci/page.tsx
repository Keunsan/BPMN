import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { RaciMatrix } from "@/components/metadata/RaciMatrix";

export default function RaciPage() {
  return (
    <Suspense fallback={<LoadingSpinner className="py-10" />}>
      <RaciMatrix />
    </Suspense>
  );
}
