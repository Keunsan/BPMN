import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TaskSystemMapping } from "@/components/metadata/TaskSystemMapping";

export default function MetadataSystemPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TaskSystemMapping />
    </Suspense>
  );
}
