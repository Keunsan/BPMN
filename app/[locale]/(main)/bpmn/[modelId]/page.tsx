import { BpmnEditorPage } from "@/components/bpmn/BpmnEditorPage";

type BpmnEditorRouteProps = {
  params: Promise<{ modelId: string }>;
};

/** BPMN 에디터 라우트 */
const BpmnEditorRoute = async ({ params }: BpmnEditorRouteProps) => {
  const { modelId } = await params;
  return <BpmnEditorPage modelId={Number(modelId)} />;
};

export default BpmnEditorRoute;
