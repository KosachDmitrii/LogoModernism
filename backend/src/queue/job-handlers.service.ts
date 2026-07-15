import { Injectable } from '@nestjs/common';
import { prisma } from '@logo-platform/database';
import { designBrain } from '@logo-platform/design-brain';
import { generateImages } from '@logo-platform/image-generator';
import {
  fetchWithDeadline,
  type ConsolidationJobPayload,
  type FeedbackJobPayload,
  type ImageJobPayload,
  type PdfJobPayload,
  type PromptJobPayload,
  type ResearchJobPayload,
} from '@logo-platform/shared';
import { ObjectStorageService } from '../storage/object-storage.service';
import type { QueueJobContext, QueueJobHandler } from './queue.constants';
import { PromptsService } from '../prompts/prompts.service';
import { getGlobalBrainScope } from '../design-brain/global-brain-scope';

@Injectable()
export class PromptJobHandlerService implements QueueJobHandler<PromptJobPayload> {
  constructor(private readonly prompts: PromptsService) {}

  async process(payload: PromptJobPayload, context: QueueJobContext) {
    await context.updateProgress(5);
    const result = await this.prompts.generateResponse(
      payload.request,
      payload.organizationId
        ? {
            userId: payload.requestedBy ?? 'worker',
            organizationId: payload.organizationId,
            projectId: payload.projectId,
          }
        : undefined,
      context.signal,
    );
    await context.updateProgress(100);
    return result;
  }
}

@Injectable()
export class FeedbackJobHandlerService implements QueueJobHandler<FeedbackJobPayload> {
  async process(payload: FeedbackJobPayload, context: QueueJobContext) {
    const brainScope = await getGlobalBrainScope(payload.actorId);
    const prompt = payload.promptRecordId
      ? await prisma.composedPromptRecord.findUnique({
          where: {
            id: payload.promptRecordId,
            ...(payload.organizationId ? { organizationId: payload.organizationId } : {}),
          },
          select: { id: true, industry: true, companyName: true, text: true, scores: true },
        })
      : null;
    if (payload.promptRecordId && !prompt) {
      throw new Error(`Prompt not found: ${payload.promptRecordId}`);
    }
    await context.updateProgress(25);
    const score =
      payload.score ?? payload.rating ?? (payload.verdict === 'rejected' ? 2 : 7);
    const result = await designBrain.ingestFeedback({
      signalType:
        payload.signalType ??
        (payload.rating !== undefined
          ? 'RATING'
          : payload.verdict === 'rejected'
            ? 'REJECT'
            : 'APPROVE'),
      score,
      experienceId: payload.experienceId,
      context: [
        payload.context,
        payload.comments,
        prompt?.companyName ? `Company: ${prompt.companyName}` : '',
        prompt ? `Industry: ${prompt.industry}` : '',
        prompt ? `Prompt: ${prompt.text.slice(0, 600)}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      metadata: {
        kind: 'queued_prompt_feedback',
        ...payload.metadata,
        promptId: prompt?.id,
        tags: payload.tags,
        actorId: payload.actorId,
        scores: prompt?.scores,
      },
      organizationId: brainScope.organizationId,
    });
    await context.updateProgress(100);
    return result;
  }
}

@Injectable()
export class PdfJobHandlerService implements QueueJobHandler<PdfJobPayload> {
  constructor(private readonly storage: ObjectStorageService) {}

  async process(payload: PdfJobPayload, context: QueueJobContext) {
    const brainScope = await getGlobalBrainScope(payload.requestedBy);
    const buffer = await this.storage.get(payload.sourceKey);
    await context.updateProgress(20);
    const result = await designBrain.ingestPdf({
      buffer,
      originalName: payload.sourceKey.split('/').at(-1) ?? `${payload.documentId}.pdf`,
      title: payload.documentId,
      jobId: context.jobId,
      organizationId: brainScope.organizationId!,
    });
    await this.storage.put(payload.outputKey, Buffer.from(JSON.stringify(result)), {
      contentType: 'application/json',
    });
    await context.updateProgress(100);
    return { outputKey: payload.outputKey, result };
  }
}

@Injectable()
export class ImageJobHandlerService implements QueueJobHandler<ImageJobPayload> {
  constructor(private readonly storage: ObjectStorageService) {}

  async process(payload: ImageJobPayload, context: QueueJobContext) {
    const result = await generateImages({
      prompt: payload.prompt,
      provider: payload.provider === 'mock' ? 'mock' : 'openai',
      count: 1,
      signal: context.signal,
    });
    context.throwIfCancellationRequested();
    const image = result.images[0];
    if (!image) throw new Error('Image provider returned no image');
    await context.updateProgress(60);
    let publicUrl = image.url;
    let storageKey: string | undefined;
    let mimeType: string | undefined;
    if (this.storage.isConfigured()) {
      const { buffer, contentType } = await this.readImage(image.url, context.signal);
      const stored = await this.storage.storeDataUrl(
        payload.outputKey,
        `data:${contentType};base64,${buffer.toString('base64')}`,
      );
      publicUrl = stored.publicUrl;
      storageKey = stored.storageKey;
      mimeType = stored.mimeType;
    }
    context.throwIfCancellationRequested();
    await prisma.logo.updateMany({
      where: {
        id: payload.imageId,
        ...(payload.organizationId ? { organizationId: payload.organizationId } : {}),
      },
      data: {
        storageKey,
        publicUrl,
        mimeType,
        provider: image.provider,
        model: image.model,
        width: image.width,
        height: image.height,
        metadata: payload.metadata
          ? { ...payload.metadata, queued: false }
          : { queued: false },
      },
    });
    await context.updateProgress(100);
    return { imageId: payload.imageId, storageKey };
  }

  private async readImage(
    url: string,
    signal?: AbortSignal,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const dataUrl = /^data:([^;,]+);base64,(.+)$/s.exec(url);
    if (dataUrl) {
      return { buffer: Buffer.from(dataUrl[2]!, 'base64'), contentType: dataUrl[1]! };
    }
    const response = await fetchWithDeadline(url, { signal }, { timeoutMs: 60_000 });
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get('content-type') ?? 'image/png',
    };
  }
}

@Injectable()
export class ResearchJobHandlerService implements QueueJobHandler<ResearchJobPayload> {
  constructor(private readonly storage: ObjectStorageService) {}

  async process(payload: ResearchJobPayload, context: QueueJobContext) {
    const brainScope = await getGlobalBrainScope(payload.requestedBy);
    await context.updateProgress(10);
    const result = await designBrain.runResearch(
      payload.query,
      payload.depth === 'deep' ? 20 : payload.depth === 'quick' ? 5 : 10,
      {
        organizationId: brainScope.organizationId,
        userId: payload.requestedBy,
      },
    );
    if (payload.outputKey) {
      await this.storage.put(payload.outputKey, Buffer.from(JSON.stringify(result)), {
        contentType: 'application/json',
      });
    }
    await context.updateProgress(100);
    return { researchId: payload.researchId, outputKey: payload.outputKey, result };
  }
}

@Injectable()
export class ConsolidationJobHandlerService
  implements QueueJobHandler<ConsolidationJobPayload>
{
  constructor(private readonly storage: ObjectStorageService) {}

  async process(payload: ConsolidationJobPayload, context: QueueJobContext) {
    await context.updateProgress(10);
    const brainScope = await getGlobalBrainScope(payload.requestedBy);
    const result = await designBrain.consolidate(brainScope);
    if (payload.outputKey) {
      await this.storage.put(payload.outputKey, Buffer.from(JSON.stringify(result)), {
        contentType: 'application/json',
      });
    }
    await context.updateProgress(100);
    return { consolidationId: payload.consolidationId, outputKey: payload.outputKey, result };
  }

}
