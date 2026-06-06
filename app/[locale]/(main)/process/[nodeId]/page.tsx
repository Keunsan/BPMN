import { ProcessDetail } from "@/components/process/ProcessDetail";

type ProcessDetailPageProps = {
  params: Promise<{ nodeId: string }>;
};

/** 프로세스 상세 페이지 */
const ProcessDetailPage = async ({ params }: ProcessDetailPageProps) => {
  const { nodeId } = await params;
  return <ProcessDetail nodeId={Number(nodeId)} />;
};

export default ProcessDetailPage;
