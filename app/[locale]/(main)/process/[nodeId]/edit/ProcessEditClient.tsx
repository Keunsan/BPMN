"use client";

import { ProcessForm } from "@/components/process/ProcessForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useProcessDetail } from "@/lib/query/hooks/useProcess";

type ProcessEditPageProps = {
  nodeId: number;
};

/** 프로세스 수정 페이지 (클라이언트) */
const ProcessEditClient = ({ nodeId }: ProcessEditPageProps) => {
  const { data, isLoading } = useProcessDetail(nodeId);

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  return <ProcessForm mode="edit" initialData={data} />;
};

export default ProcessEditClient;
