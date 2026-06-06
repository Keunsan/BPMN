import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ProcessForm } from "@/components/process/ProcessForm";

type ProcessNewPageProps = {
  searchParams: Promise<{ parentId?: string }>;
};

/** 프로세스 등록 페이지 */
const ProcessNewPage = async ({ searchParams }: ProcessNewPageProps) => {
  const { parentId } = await searchParams;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProcessForm mode="create" parentId={parentId ? Number(parentId) : null} />
    </Suspense>
  );
};

export default ProcessNewPage;
