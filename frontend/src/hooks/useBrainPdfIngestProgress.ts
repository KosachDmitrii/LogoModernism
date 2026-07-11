import { useEffect, useRef, useState } from 'react';
import { getBrainPdfIngestProgress } from '../api';
import type { BrainPdfIngestProgress } from '../types';

export interface PdfUploadUiProgress {
  pageCount?: number;
  percent: number;
  phase: BrainPdfIngestProgress['phase'] | 'waiting';
}

function toUiPercent(server: BrainPdfIngestProgress, resumeRatio: number | null): number | null {
  if (server.phase === 'done') return 100;

  if (
    server.totalChunks != null &&
    server.totalChunks > 0 &&
    server.processedChunks != null
  ) {
    return Math.round((server.processedChunks / server.totalChunks) * 100);
  }

  if (server.phase === 'parsing' && resumeRatio != null && resumeRatio > 0) {
    return Math.round(resumeRatio * 100);
  }

  return null;
}

export function useBrainPdfIngestProgress(
  jobId: string | null | undefined,
  enabled: boolean,
  resumeRatio: number | null,
): PdfUploadUiProgress | null {
  const [ui, setUi] = useState<PdfUploadUiProgress | null>(null);
  const maxPercentRef = useRef(0);

  useEffect(() => {
    if (!jobId || !enabled) {
      maxPercentRef.current = 0;
      setUi(null);
      return;
    }

    const initial =
      resumeRatio != null && resumeRatio > 0 ? Math.round(resumeRatio * 100) : 0;
    maxPercentRef.current = initial;
    setUi(initial > 0 ? { percent: initial, phase: 'waiting' } : null);

    let cancelled = false;
    const poll = async () => {
      try {
        const server = await getBrainPdfIngestProgress(jobId);
        if (cancelled) return;

        const next = toUiPercent(server, resumeRatio);
        const monotonic = Math.max(maxPercentRef.current, next ?? maxPercentRef.current);
        maxPercentRef.current = monotonic;

        setUi({
          pageCount: server.pageCount,
          percent: monotonic,
          phase: server.phase,
        });
      } catch {
        // Progress is unavailable until the server starts processing the upload.
      }
    };

    void poll();
    const timer = setInterval(poll, 400);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [jobId, enabled, resumeRatio]);

  return ui;
}
