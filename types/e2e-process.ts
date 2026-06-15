import type { ProcessStatus } from "./process";

export type E2eProcessStatus = ProcessStatus;

export interface E2eProcess {
  e2eProcessId: number;
  code: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  status: E2eProcessStatus;
  version: string;
  ownerOrgId: number | null;
  createdBy: number | null;
  createdAt: Date;
  updatedBy: number | null;
  updatedAt: Date | null;
}

export interface E2eProcessTreeItem extends E2eProcess {
  participantL3Count?: number;
  currentBpmnModelId?: number | null;
}

export interface E2eProcessDto extends E2eProcess {
  participantL3Count?: number;
  currentBpmnModelId?: number | null;
}

export interface E2eProcessFilters {
  search?: string;
  status?: E2eProcessStatus;
}

export interface CreateE2eProcessDto {
  code: string;
  name: string;
  description?: string | null;
  tags?: string[] | null;
  status?: E2eProcessStatus;
  version?: string;
}

export interface UpdateE2eProcessDto {
  code?: string;
  name?: string;
  description?: string | null;
  tags?: string[] | null;
  status?: E2eProcessStatus;
  version?: string;
}
