import { TaskAttributeForm } from "@/components/metadata/TaskAttributeForm";

type TaskAttributePageProps = {
  params: Promise<{ nodeId: string }>;
};

/** Task 속성 관리 페이지 */
const TaskAttributePage = async ({
  params,
}: TaskAttributePageProps) => {
  const { nodeId } = await params;

  return <TaskAttributeForm nodeId={Number(nodeId)} />;
};

export default TaskAttributePage;
