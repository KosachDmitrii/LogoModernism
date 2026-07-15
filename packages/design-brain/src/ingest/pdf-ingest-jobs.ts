import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type {
  BrainIngestResult,
  BrainPdfIngestJobStatus,
  BrainPdfIngestPhase,
  BrainPdfIngestProgress,
  BrainPdfIngestStartResult,
} from '@logo-platform/shared';
import { getBrainUploadsDir } from '../storage/paths';
import { hashPdfContent } from './pdf-dedup';

const FINISHED_TTL_MS = 30 * 60 * 1000;
const ACTIVE_TTL_MS = 24 * 60 * 60 * 1000;

type JobProgressPatch = {
  status?: BrainPdfIngestJobStatus;
  phase?: BrainPdfIngestPhase;
  pageCount?: number;
  totalChunks?: number;
  processedChunks?: number;
  message?: string;
  result?: BrainIngestResult;
  error?: string;
  finishedAt?: string;
};

type JobRecord = BrainPdfIngestProgress & {
  savedPath?: string;
  organizationId: string;
  projectId?: string;
};

type JobEntry = {
  record: JobRecord;
  updatedAt: number;
};

const jobs = new Map<string, JobEntry>();
const queue: string[] = [];
let processing = false;
let processHandler: ((jobId: string) => Promise<void>) | null = null;

function isTerminal(status: BrainPdfIngestJobStatus): boolean {
  return status === 'done' || status === 'skipped' || status === 'error';
}

function statusFromPhase(phase: BrainPdfIngestPhase): BrainPdfIngestJobStatus {
  if (phase === 'done') return 'done';
  if (phase === 'error') return 'error';
  return phase;
}

function scheduleCleanup(jobId: string, delayMs: number): void {
  setTimeout(() => clearPdfIngestProgress(jobId), delayMs);
}

export function registerPdfIngestProcessor(handler: (jobId: string) => Promise<void>): void {
  processHandler = handler;
}

export function setPdfIngestProgress(jobId: string, progress: JobProgressPatch): void {
  const entry = jobs.get(jobId);
  if (!entry) return;

  const nextStatus =
    progress.status ??
    (progress.phase ? statusFromPhase(progress.phase) : entry.record.status);

  entry.record = {
    ...entry.record,
    ...progress,
    status: nextStatus,
    phase: progress.phase ?? entry.record.phase,
  };
  entry.updatedAt = Date.now();
}

export function getPdfIngestProgress(jobId: string): BrainPdfIngestProgress | null {
  const entry = jobs.get(jobId);
  if (!entry) return null;

  const ttl = isTerminal(entry.record.status) ? FINISHED_TTL_MS : ACTIVE_TTL_MS;
  if (Date.now() - entry.updatedAt > ttl) {
    jobs.delete(jobId);
    return null;
  }

  return entry.record;
}

export function clearPdfIngestProgress(jobId: string): void {
  jobs.delete(jobId);
}

export function getPdfIngestJobFile(
  jobId: string,
): {
  savedPath: string;
  title: string;
  fileName: string;
  contentHash: string;
  organizationId: string;
  projectId?: string;
} | null {
  const entry = jobs.get(jobId);
  if (!entry?.record.savedPath) return null;
  return {
    savedPath: entry.record.savedPath,
    title: entry.record.title,
    fileName: entry.record.fileName,
    contentHash: entry.record.contentHash ?? '',
    organizationId: entry.record.organizationId,
    projectId: entry.record.projectId,
  };
}

export function finalizePdfIngestJob(jobId: string, patch: JobProgressPatch): void {
  const entry = jobs.get(jobId);
  if (!entry) return;

  entry.record = {
    ...entry.record,
    ...patch,
    status: patch.status ?? entry.record.status,
  };
  entry.updatedAt = Date.now();

  if (patch.status && isTerminal(patch.status)) {
    scheduleCleanup(jobId, FINISHED_TTL_MS);
  }
}

export function enqueuePdfIngest(params: {
  jobId: string;
  title: string;
  fileName: string;
  buffer: Buffer;
  organizationId: string;
  projectId?: string;
  preSkipped?: { message: string; result: BrainIngestResult };
}): BrainPdfIngestStartResult {
  const contentHash = hashPdfContent(params.buffer);
  const now = new Date().toISOString();

  if (params.preSkipped) {
    const record: JobRecord = {
      jobId: params.jobId,
      title: params.title,
      fileName: params.fileName,
      contentHash,
      organizationId: params.organizationId,
      projectId: params.projectId,
      status: 'skipped',
      phase: 'done',
      message: params.preSkipped.message,
      result: params.preSkipped.result,
      startedAt: now,
      finishedAt: now,
    };
    jobs.set(params.jobId, { record, updatedAt: Date.now() });
    scheduleCleanup(params.jobId, 5000);
    return { jobId: params.jobId, status: 'skipped', message: params.preSkipped.message };
  }

  mkdirSync(getBrainUploadsDir(), { recursive: true });
  const savedName = `${params.jobId}-${basename(params.fileName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const savedPath = join(getBrainUploadsDir(), savedName);
  writeFileSync(savedPath, params.buffer);

  const record: JobRecord = {
    jobId: params.jobId,
    title: params.title,
    fileName: params.fileName,
    contentHash,
    organizationId: params.organizationId,
    projectId: params.projectId,
    savedPath,
    status: 'queued',
    message: 'Queued for background processing…',
    startedAt: now,
  };
  jobs.set(params.jobId, { record, updatedAt: Date.now() });
  queue.push(params.jobId);
  void drainQueue();

  return { jobId: params.jobId, status: 'queued' };
}

async function drainQueue(): Promise<void> {
  if (processing || !processHandler) return;
  const jobId = queue.shift();
  if (!jobId) return;

  processing = true;
  setPdfIngestProgress(jobId, {
    status: 'parsing',
    phase: 'parsing',
    message: 'Starting background PDF processing…',
  });

  try {
    await processHandler(jobId);
  } finally {
    processing = false;
    void drainQueue();
  }
}

export function readQueuedPdfBuffer(jobId: string): Buffer | null {
  const file = getPdfIngestJobFile(jobId);
  if (!file) return null;
  return readFileSync(file.savedPath);
}
