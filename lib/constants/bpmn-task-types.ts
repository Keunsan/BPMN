import type { BpmnMorphableTaskType } from "@/lib/utils/bpmn-xml";

/** BPMN 태스크 유형 팔레트·컨텍스트 패드 아이콘 (bpmn-font) */
export const BPMN_TASK_TYPE_ICON_CLASS: Record<BpmnMorphableTaskType, string> =
  {
    USER_TASK: "bpmn-icon-user",
    SERVICE_TASK: "bpmn-icon-service",
    MANUAL_TASK: "bpmn-icon-manual",
    SCRIPT_TASK: "bpmn-icon-script",
    SEND_TASK: "bpmn-icon-send-task",
    RECEIVE_TASK: "bpmn-icon-receive-task",
  };

/** 팔레트 항목 툴팁 */
export const BPMN_TASK_TYPE_PALETTE_TITLE: Record<BpmnMorphableTaskType, string> =
  {
    USER_TASK: "사용자 태스크 생성",
    SERVICE_TASK: "서비스 태스크 생성",
    MANUAL_TASK: "수동 태스크 생성",
    SCRIPT_TASK: "스크립트 태스크 생성",
    SEND_TASK: "Send 태스크 생성",
    RECEIVE_TASK: "Receive 태스크 생성",
  };

/** 컨텍스트 패드 유형 전환 툴팁 */
export const BPMN_TASK_TYPE_CHANGE_TITLE: Record<BpmnMorphableTaskType, string> =
  {
    USER_TASK: "사용자 태스크로 변경",
    SERVICE_TASK: "서비스 태스크로 변경",
    MANUAL_TASK: "수동 태스크로 변경",
    SCRIPT_TASK: "스크립트 태스크로 변경",
    SEND_TASK: "Send 태스크로 변경",
    RECEIVE_TASK: "Receive 태스크로 변경",
  };
