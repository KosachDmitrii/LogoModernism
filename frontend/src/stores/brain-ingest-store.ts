import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BrainIngestResult, BrainPdfIngestCheck, BrainPdfIngestProgress } from '../types';
import { checkBrainPdfIngest, getBrainPdfIngestProgress, ingestBrainPdf } from '../api';
import { ApiError } from '../lib/api-error';
import type { MessageKey } from '../i18n';

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
  messageKey?: MessageKey;
  startedAt: string;
  finishedAt?: string;
  result?: BrainIngestResult;
  check?: BrainPdfIngestCheck;
  error?: string;
}

interface BrainIngestState {
  jobs: BrainIngestJob[];
  activeJobId: string | null;
  startPdfIngest: (file: File) => Promise<BrainIngestJob>;
  applyServerJobState: (jobId: string, server: BrainPdfIngestProgress) => void;
  markIngestJobLost: (jobId: string) => void;
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

function replaceJobId(
  jobs: BrainIngestJob[],
  currentId: string,
  serverId: string,
  patch: Partial<BrainIngestJob>,
): BrainIngestJob[] {
  return jobs.map((job) =>
    job.id === currentId ? { ...job, ...patch, id: serverId } : job,
  );
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function titleFromPdfFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  return base || fileName;
}

function mapServerStatus(status: BrainPdfIngestProgress['status']): BrainIngestJobStatus {
  switch (status) {
    case 'queued':
    case 'parsing':
    case 'processing':
      return 'processing';
    case 'done':
      return 'done';
    case 'skipped':
      return 'skipped';
    case 'error':
      return 'error';
    default:
      return 'processing';
  }
}

export const useBrainIngestStore = create<BrainIngestState>()(
  persist(
    (set) => ({
      jobs: [],
      activeJobId: null,

      startPdfIngest: async (file) => {
        const trimmedTitle = titleFromPdfFileName(file.name);

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
              messageKey: 'common.uploadingPdf',
            }),
          }));

          const queued = await ingestBrainPdf(file, trimmedTitle, id);
          const serverJobId = queued.jobId;

          if (queued.status === 'skipped') {
            const server = await getBrainPdfIngestProgress(serverJobId);
            if (server) {
              const finished: Partial<BrainIngestJob> = {
                status: 'skipped',
                finishedAt: server.finishedAt ?? new Date().toISOString(),
                message: server.message,
                result: server.result,
              };
              set((state) => ({
                jobs: replaceJobId(state.jobs, id, serverJobId, finished),
                activeJobId: null,
              }));
              return {
                ...job,
                ...finished,
                id: serverJobId,
                contentHash,
                check,
              } as BrainIngestJob;
            }
          }

          set((state) => ({
            jobs: replaceJobId(state.jobs, id, serverJobId, {
              status: 'processing',
              message: queued.message,
              messageKey: queued.message ? undefined : 'brain.ingest.queued',
            }),
            activeJobId: serverJobId,
          }));

          return {
            ...job,
            id: serverJobId,
            contentHash,
            check,
            status: 'processing',
          } as BrainIngestJob;
        } catch (error) {
          const message = error instanceof ApiError
            ? undefined
            : error instanceof Error
              ? error.message
              : String(error);
          const messageKey = error instanceof ApiError ? error.messageKey : undefined;
          set((state) => ({
            jobs: updateJob(state.jobs, id, {
              status: 'error',
              error: message,
              message,
              messageKey,
              finishedAt: new Date().toISOString(),
            }),
            activeJobId: state.activeJobId === id ? null : state.activeJobId,
          }));
          throw error;
        }
      },

      applyServerJobState: (jobId, server) =>
        set((state) => {
          const mappedStatus = mapServerStatus(server.status);
          const terminal =
            mappedStatus === 'done' || mappedStatus === 'skipped' || mappedStatus === 'error';

          return {
            jobs: updateJob(state.jobs, jobId, {
              status: mappedStatus,
              message: server.message ?? server.error,
              messageKey: undefined,
              result: server.result,
              error: server.error,
              finishedAt: terminal
                ? server.finishedAt ?? new Date().toISOString()
                : undefined,
            }),
            activeJobId: terminal && state.activeJobId === jobId ? null : state.activeJobId,
          };
        }),

      markIngestJobLost: (jobId) =>
        set((state) => ({
          jobs: updateJob(state.jobs, jobId, {
            status: 'error',
            messageKey: 'brain.ingest.jobLost',
            message: undefined,
            finishedAt: new Date().toISOString(),
          }),
          activeJobId: state.activeJobId === jobId ? null : state.activeJobId,
        })),

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
      storage: createJSONStorage(() => localStorage),
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

export function useActivePdfResumeRatio(): number | null {
  return useBrainIngestStore((s) => {
    if (!s.activeJobId) return null;
    const job = s.jobs.find((j) => j.id === s.activeJobId);
    const total = job?.check?.totalChunks;
    if (total == null || total <= 0) return null;
    return (job?.check?.existingChunks ?? 0) / total;
  });
}
