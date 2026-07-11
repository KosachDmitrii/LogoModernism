import type { BrainPdfIngestProgress } from '@logo-platform/shared';

const TTL_MS = 30 * 60 * 1000;

type ProgressEntry = {
  progress: BrainPdfIngestProgress;
  updatedAt: number;
};

const store = new Map<string, ProgressEntry>();

export function setPdfIngestProgress(jobId: string, progress: BrainPdfIngestProgress): void {
  store.set(jobId, { progress, updatedAt: Date.now() });
}

export function getPdfIngestProgress(jobId: string): BrainPdfIngestProgress | null {
  const entry = store.get(jobId);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    store.delete(jobId);
    return null;
  }
  return entry.progress;
}

export function clearPdfIngestProgress(jobId: string): void {
  store.delete(jobId);
}
