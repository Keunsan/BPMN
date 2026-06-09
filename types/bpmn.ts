import type { ProcessStatus } from "./process";



export type BpmnModelStatus = ProcessStatus;



export type BpmnElementType =

  | "START_EVENT"

  | "END_EVENT"

  | "INTERMEDIATE_EVENT"

  | "USER_TASK"

  | "SERVICE_TASK"

  | "MANUAL_TASK"

  | "SCRIPT_TASK"

  | "EXCLUSIVE_GATEWAY"

  | "PARALLEL_GATEWAY"

  | "INCLUSIVE_GATEWAY"

  | "POOL"

  | "LANE"

  | "SEQUENCE_FLOW"

  | "MESSAGE_FLOW"

  | "SUBPROCESS";



export interface BpmnModel {

  modelId: number;

  nodeId: number;

  modelName: string;

  version: string;

  bpmnXml: string | null;

  svgContent: string | null;

  thumbnailPath: string | null;

  status: BpmnModelStatus;

  isCurrent: boolean;

  createdBy: number | null;

  createdAt: Date;

  updatedBy: number | null;

  updatedAt: Date | null;

}



export interface BpmnElement {

  elementId: number;

  modelId: number;

  elementType: BpmnElementType;

  elementBpmnId: string;

  elementName: string | null;

  linkedNodeId: number | null;

  properties: Record<string, unknown> | null;

  createdAt: Date;

}



export interface BpmnFilters {

  nodeId?: number;

  linkedNodeId?: number;

  status?: BpmnModelStatus;

  isCurrent?: boolean;

  search?: string;

  sort?: "updated" | "name";

}



export interface BpmnElementDto extends BpmnElement {

  linkedProcessName?: string | null;

  linkedProcessCode?: string | null;

}



export interface BpmnModelDto extends BpmnModel {

  processName?: string;

  processCode?: string;

  elements?: BpmnElementDto[];

}



export interface CreateBpmnDto {

  nodeId: number;

  modelName: string;

  bpmnXml?: string;

}



export interface UpdateBpmnDto {

  modelName?: string;

  bpmnXml?: string;

  svgContent?: string;

  status?: BpmnModelStatus;

  elements?: BpmnElementLinkDto[];

  createNewVersion?: boolean;

  changeReason?: string;

}



export interface BpmnElementLinkDto {

  elementBpmnId: string;

  elementType: BpmnElementType;

  elementName?: string | null;

  linkedNodeId?: number | null;

  properties?: Record<string, unknown> | null;

}

export interface LinkOrCreateBpmnTaskDto {

  elementBpmnId: string;

  elementType: BpmnElementType;

  elementName?: string | null;

}

export interface BpmnTaskProcessLinkDto {

  elementBpmnId: string;

  nodeId: number;

  code: string;

  name: string;

}



export type BpmnDiffChangeType = "added" | "removed" | "modified";



export interface BpmnElementDiff {

  elementBpmnId: string;

  elementType?: string;

  elementName?: string | null;

  changeType: BpmnDiffChangeType;

  field?: string;

  oldValue?: string | null;

  newValue?: string | null;

}



export interface BpmnCompareResult {

  left: BpmnModelDto;

  right: BpmnModelDto;

  diff: BpmnElementDiff[];

}



export interface BpmnCompareRequest {

  leftModelId: number;

  rightModelId: number;

}


