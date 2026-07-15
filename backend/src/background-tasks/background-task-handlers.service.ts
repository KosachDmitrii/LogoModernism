import { Injectable } from '@nestjs/common';
import { designBrain } from '@logo-platform/design-brain';
import { ObjectStorageService } from '../storage/object-storage.service';
import { getGlobalBrainScope } from '../design-brain/global-brain-scope';
import type {
  ConsolidationTaskPayload,
  NightlyResearchTaskPayload,
  PdfIngestTaskPayload,
  ResearchTaskPayload,
  BackgroundTask,
} from './background-task.types';
import { BACKGROUND_TASK_TYPES } from './background-task.types';

export type BackgroundTaskExecutionContext = {
  signal: AbortSignal;
  updateProgress(progress: number, phase?: string): Promise<void>;
};

@Injectable()
export class BackgroundTaskHandlersService {
  constructor(private readonly storage: ObjectStorageService) {}

  async execute(
    task: BackgroundTask,
    context: BackgroundTaskExecutionContext,
  ): Promise<unknown> {
    switch (task.type) {
      case BACKGROUND_TASK_TYPES.PDF_INGEST:
        return this.ingestPdf(
          task.id,
          task.payload as PdfIngestTaskPayload,
          context,
        );
      case BACKGROUND_TASK_TYPES.RESEARCH:
        return this.runResearch(
          task.payload as ResearchTaskPayload,
          context,
        );
      case BACKGROUND_TASK_TYPES.NIGHTLY_RESEARCH:
        return this.runNightlyResearch(
          task.payload as NightlyResearchTaskPayload,
          context,
        );
      case BACKGROUND_TASK_TYPES.CONSOLIDATION:
        return this.consolidate(
          task.payload as ConsolidationTaskPayload,
          context,
        );
    }
  }

  private async ingestPdf(
    taskId: string,
    payload: PdfIngestTaskPayload,
    context: BackgroundTaskExecutionContext,
  ) {
    const brainScope = await getGlobalBrainScope(payload.requestedBy);
    context.signal.throwIfAborted();
    const buffer = await this.storage.get(payload.sourceKey);
    await context.updateProgress(20, 'parsing');
    context.signal.throwIfAborted();
    const result = await designBrain.ingestPdf({
      buffer,
      originalName:
        payload.sourceKey.split('/').at(-1) ?? `${payload.documentId}.pdf`,
      title: payload.documentId,
      jobId: taskId,
      organizationId: brainScope.organizationId!,
      signal: context.signal,
      onProgress: (progress) => {
        const percent =
          progress.phase === 'done'
            ? 100
            : progress.phase === 'processing' &&
                progress.totalChunks &&
                progress.processedChunks != null
              ? 20 +
                Math.round(
                  (progress.processedChunks / progress.totalChunks) * 75,
                )
              : 20;
        void context.updateProgress(percent, progress.phase).catch(() => undefined);
      },
    });
    context.signal.throwIfAborted();
    await context.updateProgress(100, 'done');
    return result;
  }

  private async runResearch(
    payload: ResearchTaskPayload,
    context: BackgroundTaskExecutionContext,
  ) {
    const brainScope = await getGlobalBrainScope(payload.requestedBy);
    await context.updateProgress(10, 'researching');
    context.signal.throwIfAborted();
    const result = await designBrain.runResearch(
      payload.query,
      payload.maxSources,
      {
        organizationId: brainScope.organizationId,
        userId: payload.requestedBy,
      },
      context.signal,
    );
    context.signal.throwIfAborted();
    return result;
  }

  private async consolidate(
    payload: ConsolidationTaskPayload,
    context: BackgroundTaskExecutionContext,
  ) {
    await context.updateProgress(10, 'consolidating');
    const brainScope = await getGlobalBrainScope(payload.requestedBy);
    context.signal.throwIfAborted();
    return designBrain.consolidate(brainScope);
  }

  private async runNightlyResearch(
    _payload: NightlyResearchTaskPayload,
    context: BackgroundTaskExecutionContext,
  ) {
    await context.updateProgress(10, 'researching');
    context.signal.throwIfAborted();
    const result = await designBrain.runNightlyResearch();
    context.signal.throwIfAborted();
    return result;
  }
}
