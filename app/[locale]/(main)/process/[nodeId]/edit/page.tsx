import ProcessEditClient from "./ProcessEditClient";

type ProcessEditPageProps = {
  params: Promise<{ nodeId: string }>;
};

/** 프로세스 수정 페이지 */
const ProcessEditPage = async ({ params }: ProcessEditPageProps) => {
  const { nodeId } = await params;
  return <ProcessEditClient nodeId={Number(nodeId)} />;
};

export default ProcessEditPage;
