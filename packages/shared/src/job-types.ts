import type { PromptGenerationRequest } from './types';

export const JOB_PAYLOAD_VERSION = 1 as const;

export const QUEUE_NAMES = {
  feedback: 'feedback',
  pdf: 'pdf',
  image: 'image',
  research: 'research',
  consolidation: 'consolidation',
  prompt: 'prompt',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_NAMES = {
  feedback: 'process-feedback',
  pdf: 'generate-pdf',
  image: 'generate-image',
  research: 'run-research',
  consolidation: 'consolidate-research',
  prompt: 'generate-prompt',
} as const;

export interface VersionedJobPayload {
  version: typeof JOB_PAYLOAD_VERSION;
  /** Stable key used to deduplicate submissions. */
  idempotencyKey: string;
  requestedAt: string;
  correlationId?: string;
  requestedBy?: string;
  organizationId?: string;
  projectId?: string;
  usageReservationId?: string;
}

export interface FeedbackJobPayload extends VersionedJobPayload {
  promptRecordId?: string;
  experienceId?: string;
  signalType?: 'LIKE' | 'DISLIKE' | 'APPROVE' | 'REJECT' | 'RATING';
  score?: number;
  context?: string;
  metadata?: Record<string, unknown>;
  rating?: number;
  verdict?: 'approved' | 'rejected' | 'needs-revision';
  comments?: string;
  tags?: string[];
  actorId?: string;
}

export interface PdfJobPayload extends VersionedJobPayload {
  documentId: string;
  sourceKey: string;
  outputKey: string;
  options?: {
    pageSize?: 'A4' | 'LETTER';
    includeMetadata?: boolean;
  };
}

export interface ImageJobPayload extends VersionedJobPayload {
  imageId: string;
  prompt: string;
  outputKey: string;
  provider?: string;
  model?: string;
  width?: number;
  height?: number;
  metadata?: Record<string, string>;
}

export interface ResearchJobPayload extends VersionedJobPayload {
  researchId: string;
  query: string;
  sources?: string[];
  depth?: 'quick' | 'standard' | 'deep';
  outputKey?: string;
}

export interface ConsolidationJobPayload extends VersionedJobPayload {
  consolidationId: string;
  researchJobIds: string[];
  outputKey?: string;
  strategy?: 'summary' | 'synthesis';
}

export interface PromptJobPayload extends VersionedJobPayload {
  request: PromptGenerationRequest;
}

export interface QueueJobPayloadMap {
  feedback: FeedbackJobPayload;
  pdf: PdfJobPayload;
  image: ImageJobPayload;
  research: ResearchJobPayload;
  consolidation: ConsolidationJobPayload;
  prompt: PromptJobPayload;
}

export type QueueJobPayload<Q extends QueueName> = QueueJobPayloadMap[Q];

export interface JobSubmission {
  id: string;
  queue: QueueName;
  deduplicated: boolean;
}

export type JobState =
  | 'active'
  | 'completed'
  | 'delayed'
  | 'failed'
  | 'paused'
  | 'prioritized'
  | 'waiting'
  | 'waiting-children'
  | 'unknown';

export type JobProgress = string | boolean | number | object;

export interface JobStatus<Result = unknown> {
  id: string;
  queue: QueueName;
  name: string;
  state: JobState;
  progress: JobProgress;
  attemptsMade: number;
  result?: Result;
  failedReason?: string;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
}
