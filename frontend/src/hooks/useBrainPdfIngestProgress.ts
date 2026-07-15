import { useEffect, useRef, useState } from 'react';
import { getBrainPdfIngestProgress } from '../api';
import type { BrainPdfIngestJobStatus, BrainPdfIngestProgress } from '../types';
import { useBrainIngestStore } from '../stores/brain-ingest-store';

export interface PdfUploadUiProgress {
  pageCount?: number;
  percent: number;
  phase: BrainPdfIngestProgress['phase'] | BrainPdfIngestJobStatus | 'waiting';
  status: BrainPdfIngestJobStatus | 'waiting';
}

function toUiPercent(server: BrainPdfIngestProgress, resumeRatio: number | null): number | null {
  if (server.status === 'done' || server.status === 'skipped') return 100;
  if (server.phase === 'done') return 100;

  if (
    server.totalChunks != null &&
    server.totalChunks > 0 &&
    server.processedChunks != null
  ) {
    return Math.round((server.processedChunks / server.totalChunks) * 100);
  }

  if ((server.phase === 'parsing' || server.status === 'parsing') && resumeRatio != null && resumeRatio > 0) {
    return Math.round(resumeRatio * 100);
  }

  if (server.status === 'queued') return 0;

  return null;
}

export function useBrainPdfIngestProgress(
  jobId: string | null | undefined,
  enabled: boolean,
  resumeRatio: number | null,
): PdfUploadUiProgress | null {
  const [ui, setUi] = useState<PdfUploadUiProgress | null>(null);
  const maxPercentRef = useRef(0);
  const missCountRef = useRef(0);
  const applyServerJobState = useBrainIngestStore((s) => s.applyServerJobState);
  const markIngestJobLost = useBrainIngestStore((s) => s.markIngestJobLost);

  useEffect(() => {
    if (!jobId || !enabled) {
      maxPercentRef.current = 0;
      missCountRef.current = 0;
      setUi(null);
      return;
    }

    const initial =
      resumeRatio != null && resumeRatio > 0 ? Math.round(resumeRatio * 100) : 0;
    maxPercentRef.current = initial;
    setUi(
      initial > 0
        ? { percent: initial, phase: 'waiting', status: 'waiting' }
        : null,
    );

    let cancelled = false;
    let timer: number | undefined;
    let controller: AbortController | undefined;
    let delayMs = 1_000;

    const scheduleNext = () => {
      if (cancelled) return;
      timer = window.setTimeout(() => void poll(), delayMs);
      delayMs = Math.min(3_000, delayMs + 500);
    };

    const poll = async () => {
      controller = new AbortController();
      try {
        const server = await getBrainPdfIngestProgress(jobId, controller.signal);
        if (cancelled) return;

        missCountRef.current = 0;
        delayMs = 1_000;
        applyServerJobState(jobId, server);

        const next = toUiPercent(server, resumeRatio);
        const monotonic = Math.max(maxPercentRef.current, next ?? maxPercentRef.current);
        maxPercentRef.current = monotonic;

        const phase = server.phase ?? server.status;

        setUi({
          pageCount: server.pageCount,
          percent: monotonic,
          phase,
          status: server.status,
        });
        if (server.status === 'done' || server.status === 'skipped' || server.status === 'error') {
          return;
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        missCountRef.current += 1;
        if (missCountRef.current >= 45) {
          markIngestJobLost(jobId);
          return;
        }
      }
      scheduleNext();
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      controller?.abort();
    };
  }, [jobId, enabled, resumeRatio, applyServerJobState, markIngestJobLost]);

  return ui;
}
