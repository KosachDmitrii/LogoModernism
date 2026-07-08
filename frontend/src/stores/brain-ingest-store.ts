import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BrainIngestResult, BrainPdfIngestCheck } from '../types';
import { checkBrainPdfIngest, ingestBrainPdf } from '../api';

export type BrainIngestJobStatus =
  | 'checking'
  | 'uploading'
  | 'processing'
  | 'done'
  | 'skipped'
  | 'error';

export interface BrainIngestJob {
  id: string;
  type: 'pdf';
  title: string;
  fileName: string;
  contentHash: string;
  status: BrainIngestJobStatus;
  message?: string;
  startedAt: string;
  finishedAt?: string;
  result?: BrainIngestResult;
  check?: BrainPdfIngestCheck;
  error?: string;
}

interface BrainIngestState {
  jobs: BrainIngestJob[];
  activeJobId: string | null;
  startPdfIngest: (file: File, title: string) => Promise<BrainIngestJob>;
  clearFinishedJobs: () => void;
  dismissJob: (id: string) => void;
}

function updateJob(
  jobs: BrainIngestJob[],
  id: string,
  patch: Partial<BrainIngestJob>,
): BrainIngestJob[] {
  return jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const useBrainIngestStore = create<BrainIngestState>()(
  persist(
    (set) => ({
      jobs: [],
      activeJobId: null,

      startPdfIngest: async (file, title) => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
          throw new Error('Title is required');
        }

        const id = `pdf-${Date.now()}`;
        const job: BrainIngestJob = {
          id,
          type: 'pdf',
          title: trimmedTitle,
          fileName: file.name,
          contentHash: '',
          status: 'checking',
          startedAt: new Date().toISOString(),
        };

        set((state) => ({
          jobs: [job, ...state.jobs].slice(0, 10),
          activeJobId: id,
        }));

        try {
          const contentHash = await hashFile(file);
          set((state) => ({
            jobs: updateJob(state.jobs, id, { contentHash, status: 'checking' }),
          }));

          const check = await checkBrainPdfIngest(trimmedTitle, contentHash);
          set((state) => ({
            jobs: updateJob(state.jobs, id, { check, message: check.message }),
          }));

          if (check.alreadyIngested) {
            const finished: Partial<BrainIngestJob> = {
              status: 'skipped',
              finishedAt: new Date().toISOString(),
              message: check.message,
              result: {
                experienceId: '',
                sourceType: 'PDF',
                title: trimmedTitle,
                chunksStored: 0,
                principlesExtracted: 0,
                skipped: true,
                alreadyIngested: true,
                contentHash,
                summary: check.message,
              },
            };
            set((state) => ({
              jobs: updateJob(state.jobs, id, finished),
              activeJobId: state.activeJobId === id ? null : state.activeJobId,
            }));
            return { ...job, ...finished, contentHash, check } as BrainIngestJob;
          }

          set((state) => ({
            jobs: updateJob(state.jobs, id, {
              status: 'uploading',
              message: check.existingChunks > 0
                ? `Uploading — will skip ${check.existingChunks} existing chunks`
                : 'Uploading PDF…',
            }),
          }));

          set((state) => ({
            jobs: updateJob(state.jobs, id, {
              status: 'processing',
              message: 'Processing chunks (LLM + embeddings)…',
            }),
          }));

          const result = await ingestBrainPdf(file, trimmedTitle);
          const finished: Partial<BrainIngestJob> = {
            status: result.alreadyIngested || result.skipped ? 'skipped' : 'done',
            finishedAt: new Date().toISOString(),
            result,
            message: result.summary ?? 'Ingest complete',
          };

          set((state) => ({
            jobs: updateJob(state.jobs, id, finished),
            activeJobId: state.activeJobId === id ? null : state.activeJobId,
          }));

          return { ...job, ...finished, contentHash, check } as BrainIngestJob;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          set((state) => ({
            jobs: updateJob(state.jobs, id, {
              status: 'error',
              error: message,
              message,
              finishedAt: new Date().toISOString(),
            }),
            activeJobId: state.activeJobId === id ? null : state.activeJobId,
          }));
          throw error;
        }
      },

      clearFinishedJobs: () =>
        set((state) => ({
          jobs: state.jobs.filter(
            (job) => job.status === 'checking' || job.status === 'uploading' || job.status === 'processing',
          ),
        })),

      dismissJob: (id) =>
        set((state) => ({
          jobs: state.jobs.filter((job) => job.id !== id),
          activeJobId: state.activeJobId === id ? null : state.activeJobId,
        })),
    }),
    {
      name: 'logo-platform-brain-ingest',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ jobs: state.jobs, activeJobId: state.activeJobId }),
    },
  ),
);

export function useActiveBrainIngestJob(): BrainIngestJob | null {
  return useBrainIngestStore((s) => {
    if (!s.activeJobId) return null;
    return s.jobs.find((j) => j.id === s.activeJobId) ?? null;
  });
}

export function useIsBrainIngesting(): boolean {
  return useBrainIngestStore((s) =>
    s.jobs.some(
      (job) =>
        job.status === 'checking' ||
        job.status === 'uploading' ||
        job.status === 'processing',
    ),
  );
}
