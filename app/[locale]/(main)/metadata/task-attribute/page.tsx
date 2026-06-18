import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { TaskAttributeList } from "@/components/metadata/TaskAttributeList";

/** Task 속성 목록 페이지 */
const TaskAttributeListPage = () => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TaskAttributeList />
    </Suspense>
  );
};

export default TaskAttributeListPage;
