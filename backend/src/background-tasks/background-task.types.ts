export const BACKGROUND_TASK_TYPES = {
  PDF_INGEST: 'PDF_INGEST',
  RESEARCH: 'RESEARCH',
  NIGHTLY_RESEARCH: 'NIGHTLY_RESEARCH',
  CONSOLIDATION: 'CONSOLIDATION',
} as const;

export type BackgroundTaskType =
  (typeof BACKGROUND_TASK_TYPES)[keyof typeof BACKGROUND_TASK_TYPES];

export const BACKGROUND_TASK_STATUSES = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type BackgroundTaskStatus =
  (typeof BACKGROUND_TASK_STATUSES)[keyof typeof BACKGROUND_TASK_STATUSES];

export type BackgroundTask = {
  id: string;
  type: BackgroundTaskType;
  status: BackgroundTaskStatus;
  organizationId: string | null;
  projectId: string | null;
  requestedBy: string | null;
  idempotencyKey: string;
  payload: unknown;
  result: unknown | null;
  error: string | null;
  progress: number;
  phase: string | null;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  startedAt: Date | null;
  heartbeatAt: Date | null;
  finishedAt: Date | null;
  cancelRequestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PdfIngestTaskPayload = {
  sourceKey: string;
  outputKey?: string;
  documentId: string;
  requestedBy?: string;
};

export type ResearchTaskPayload = {
  researchId: string;
  query: string;
  maxSources: number;
  requestedBy?: string;
};

export type ConsolidationTaskPayload = {
  consolidationId: string;
  requestedBy?: string;
};

export type NightlyResearchTaskPayload = {
  requestedBy?: string;
};

export type BackgroundTaskPayload =
  | PdfIngestTaskPayload
  | ResearchTaskPayload
  | NightlyResearchTaskPayload
  | ConsolidationTaskPayload;
