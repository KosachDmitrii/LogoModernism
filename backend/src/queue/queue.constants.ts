import type {
  ConsolidationJobPayload,
  FeedbackJobPayload,
  ImageJobPayload,
  JobProgress,
  PdfJobPayload,
  PromptJobPayload,
  ResearchJobPayload,
} from '@logo-platform/shared';

export interface QueueJobHandler<Payload, Result = unknown> {
  process(payload: Payload, context: QueueJobContext): Promise<Result>;
}

export interface QueueJobContext {
  jobId: string;
  attempt: number;
  signal: AbortSignal;
  throwIfCancellationRequested(): void;
  updateProgress(progress: JobProgress): Promise<void>;
}

export const FEEDBACK_JOB_HANDLER = Symbol('FEEDBACK_JOB_HANDLER');
export const PDF_JOB_HANDLER = Symbol('PDF_JOB_HANDLER');
export const IMAGE_JOB_HANDLER = Symbol('IMAGE_JOB_HANDLER');
export const RESEARCH_JOB_HANDLER = Symbol('RESEARCH_JOB_HANDLER');
export const CONSOLIDATION_JOB_HANDLER = Symbol('CONSOLIDATION_JOB_HANDLER');
export const PROMPT_JOB_HANDLER = Symbol('PROMPT_JOB_HANDLER');

export type FeedbackJobHandler = QueueJobHandler<FeedbackJobPayload>;
export type PdfJobHandler = QueueJobHandler<PdfJobPayload>;
export type ImageJobHandler = QueueJobHandler<ImageJobPayload>;
export type ResearchJobHandler = QueueJobHandler<ResearchJobPayload>;
export type ConsolidationJobHandler = QueueJobHandler<ConsolidationJobPayload>;
export type PromptJobHandler = QueueJobHandler<PromptJobPayload>;
