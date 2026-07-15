import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { JOB_PAYLOAD_VERSION, normalizeBrandName, QUEUE_NAMES } from '@logo-platform/shared';
import { designBrain } from '@logo-platform/design-brain';
import { evaluateRequestPromptCompliance } from '@logo-platform/design-brain';
import { runPromptPipeline, critiqueDesign, evolvePrompt } from '@logo-platform/prompt-engine';
import { ImagesService } from '../images/images.service';
import { PromptRecordsService } from './prompt-records.service';
import type { GeneratePromptLogoDto } from './dto/generate-prompt-logo.dto';
import type { TenantScope } from '../auth/tenant-context';
import { QueueService } from '../queue/queue.service';
import { isAsyncQueueEnabled } from '../queue/queue.config';
import type { BrainPipelineResult } from '@logo-platform/design-brain';
import { slimPipelineResult } from './prompt-response';
import { ObjectStorageService } from '../storage/object-storage.service';
import { getGlobalBrainScope } from '../design-brain/global-brain-scope';

@Injectable()
export class PromptsService {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly promptRecords: PromptRecordsService,
    private readonly queues: QueueService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async generate(request: PromptGenerationRequest, tenant?: TenantScope) {
    const caps = designBrain.getCapabilities();
    const preferBrain = request.useBrain !== false && caps.databaseConfigured;

    if (preferBrain) {
      try {
        const brainScope = await getGlobalBrainScope(tenant?.userId);
        return await designBrain.generate({
          industry: request.industry,
          companyName: normalizeBrandName(request.companyName),
          variationCount: request.variationCount,
          inspirationMode: request.inspirationMode,
          preferredEra: request.preferredEra,
          minimalismLevel: request.minimalismLevel,
          markType: request.markType,
          typographyStyle: request.typographyStyle,
          analysisPrincipleIds: request.analysisPrincipleIds,
          catalogReferenceIds: request.catalogReferenceIds,
          autoCatalogReferences: request.autoCatalogReferences,
          rebusWordmark: request.rebusWordmark,
          catalogNarrative: request.catalogNarrative,
          briefContext: request.briefContext,
          useBrain: true,
          preferredTerritoryId: request.preferredTerritoryId,
          organizationId: brainScope.organizationId,
        });
      } catch (error) {
        if (request.useBrain === true) throw error;
        console.warn('Brain prompt pipeline failed, falling back to rules:', error);
      }
    }

    return this.attachRulesCompliance(runPromptPipeline(request), request);
  }

  private attachRulesCompliance(
    result: ReturnType<typeof runPromptPipeline>,
    request: PromptGenerationRequest,
  ) {
    const constraintReport = evaluateRequestPromptCompliance(result.bestPrompt, {
      industry: request.industry,
      companyName: normalizeBrandName(request.companyName),
      variationCount: request.variationCount,
      inspirationMode: request.inspirationMode,
      preferredEra: request.preferredEra,
      minimalismLevel: request.minimalismLevel,
      markType: request.markType,
      typographyStyle: request.typographyStyle,
      analysisPrincipleIds: request.analysisPrincipleIds,
      catalogReferenceIds: request.catalogReferenceIds,
      catalogNarrative: request.catalogNarrative,
      briefContext: request.briefContext,
    });
    const bestPrompt = {
      ...result.bestPrompt,
      metadata: { ...result.bestPrompt.metadata, constraintReport },
    };
    const prompts = result.prompts.map((prompt) =>
      prompt.id === bestPrompt.id ? bestPrompt : prompt,
    );
    return { ...result, prompts, bestPrompt, constraintReport };
  }

  async generateAndPersist(request: PromptGenerationRequest, tenant?: TenantScope) {
    const result = await this.generate(request, tenant);
    if (!process.env.DATABASE_URL) {
      return {
        result,
        promptsWithLogos: this.promptRecords.attachLogosToPrompts(result.prompts),
      };
    }

    await this.promptRecords.saveBatch(request, result, tenant);
    const promptsWithLogos = await this.promptRecords.attachStoredState(result.prompts);
    return { result, promptsWithLogos };
  }

  async generateResponse(request: PromptGenerationRequest, tenant?: TenantScope) {
    const { result, promptsWithLogos } = await this.generateAndPersist(request, tenant);
    const brainResult =
      'brainPowered' in result && result.brainPowered
        ? (result as BrainPipelineResult)
        : null;
    const slimmed = slimPipelineResult({
      ...result,
      prompts: promptsWithLogos,
      bestPrompt: {
        ...result.bestPrompt,
        logos: promptsWithLogos.find((prompt) => prompt.id === result.bestPrompt.id)?.logos ?? [],
        feedback: promptsWithLogos.find((prompt) => prompt.id === result.bestPrompt.id)?.feedback,
        saved: promptsWithLogos.find((prompt) => prompt.id === result.bestPrompt.id)?.saved,
      },
    });
    if (!brainResult) return slimmed;
    return {
      ...slimmed,
      brainPowered: true as const,
      decision: brainResult.decision,
      tasteProfile: brainResult.tasteProfile,
      retrievedExperiences: brainResult.retrievedExperiences,
      ...(brainResult.partnerMode
        ? {
            partnerMode: true as const,
            creativeTerritories: brainResult.creativeTerritories,
            selectedTerritoryId: brainResult.selectedTerritoryId,
            constraintReport: brainResult.constraintReport,
            critique: brainResult.critique,
            catalogIntelligence: brainResult.catalogIntelligence,
            partnerAttempts: brainResult.partnerAttempts,
          }
        : {}),
    };
  }

  async generateEphemeral(request: PromptGenerationRequest) {
    const result = await this.generate(
      {
        ...request,
        useBrain: false,
        variationCount: Math.min(3, Math.max(1, request.variationCount ?? 3)),
      },
      undefined,
    );
    return slimPipelineResult(result);
  }

  async togglePromptSave(
    promptId: string,
    saved: boolean,
    idempotencyKey?: string,
    tenant?: TenantScope,
  ) {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to save prompts');
    }

    const updated = await this.promptRecords.setSaved(promptId, saved, idempotencyKey, tenant);

    return { promptId, saved: updated.saved ?? saved };
  }

  async submitLogoFeedback(
    promptId: string,
    logoId: string,
    body: {
      score: number;
      emoji: string;
    },
    tenant?: TenantScope,
  ) {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to store logo feedback');
    }
    if (!tenant) throw new BadRequestException('Organization scope is required');

    const record = await this.promptRecords.getById(promptId, tenant);
    const logo = record.logos.find((item) => item.id === logoId);
    if (!logo) {
      throw new BadRequestException(`Logo not found: ${logoId}`);
    }

    const prev = logo.feedback;
    const feedback = {
      ...prev,
      score: body.score,
      emoji: body.emoji,
      submittedAt: new Date().toISOString(),
    };

    const updated = await this.promptRecords.setLogoFeedback(
      promptId,
      logoId,
      feedback,
      tenant,
    );

    const savedLogo = updated.logos.find((item) => item.id === logoId);
    return {
      promptId,
      logoId,
      feedback: savedLogo?.feedback,
      logos: updated.logos,
    };
  }

  async submitLogoTags(
    promptId: string,
    logoId: string,
    body: {
      workedTags?: string[];
      missedTags?: string[];
    },
    tenant?: TenantScope,
  ) {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to store logo tags');
    }
    if (!tenant) throw new BadRequestException('Organization scope is required');

    const record = await this.promptRecords.getById(promptId, tenant);
    const logo = record.logos.find((item) => item.id === logoId);
    if (!logo) {
      throw new BadRequestException(`Logo not found: ${logoId}`);
    }

    const updated = await this.promptRecords.setLogoTags(promptId, logoId, body, tenant);

    const savedLogo = updated.logos.find((item) => item.id === logoId);
    return {
      promptId,
      logoId,
      feedback: savedLogo?.feedback,
      logos: updated.logos,
    };
  }

  /** @deprecated use togglePromptSave */
  async submitPromptFeedback(
    promptId: string,
    signalType: 'LIKE' | 'DISLIKE',
    tenant?: TenantScope,
  ) {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to store prompt feedback');
    }
    if (!tenant) throw new BadRequestException('Organization scope is required');

    await this.promptRecords.getById(promptId, tenant);
    const updated = await this.promptRecords.setFeedback(promptId, signalType, tenant);

    return {
      promptId,
      feedback: updated.feedback,
    };
  }

  async generateLogoForPrompt(
    promptId: string,
    body: GeneratePromptLogoDto,
    tenant?: TenantScope,
    usageReservationId?: string,
  ) {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to store prompt logos');
    }

    const record = await this.promptRecords.getById(promptId, tenant);
    const stylePreferences =
      typeof record.metadata === 'object' &&
      record.metadata !== null &&
      'stylePreferences' in record.metadata
        ? (record.metadata as {
            stylePreferences?: {
              colorPalette?: string;
              colorSelections?: string[];
              allowShadows?: boolean;
              allowPhotoreal?: boolean;
            };
          }).stylePreferences
        : undefined;
    if (record.logos.length >= 3) {
      throw new BadRequestException('Maximum 3 logos per prompt');
    }

    if (isAsyncQueueEnabled()) {
      const imageId = randomUUID();
      const reservation = await this.promptRecords.reserveLogo(
        promptId,
        imageId,
        record.text,
        tenant,
      );
      const outputKey = [
        'generated-logos',
        tenant?.organizationId ?? 'unscoped',
        `${imageId}.png`,
      ].join('/');
      const job = await this.queues.enqueue(QUEUE_NAMES.image, {
        version: JOB_PAYLOAD_VERSION,
        idempotencyKey: `prompt:${promptId}:image:${imageId}`,
        requestedAt: new Date().toISOString(),
        organizationId: tenant?.organizationId,
        projectId: tenant?.projectId,
        usageReservationId,
        imageId,
        prompt: record.text,
        outputKey,
        provider: body.provider,
      });
      return {
        status: 'queued' as const,
        jobId: job.id,
        imageId,
        remaining: reservation.remaining,
      };
    }

    const generation = await this.imagesService.generateFromComposedPrompt({
      text: record.text,
      companyName: normalizeBrandName(body.companyName ?? record.companyName),
      industry: record.industry,
      markType: body.markType,
      typographyStyle: body.typographyStyle,
      provider: body.provider,
      colorPalette: stylePreferences?.colorPalette,
      colorSelections: stylePreferences?.colorSelections,
      allowShadows: stylePreferences?.allowShadows,
      allowPhotoreal: stylePreferences?.allowPhotoreal,
    });

    let image = generation.images[0];
    if (!image) {
      throw new BadRequestException('Image generation returned no result');
    }

    let storage: { storageKey: string; mimeType: string } | undefined;
    if (image.url.startsWith('data:')) {
      const stored = await this.objectStorage.storeDataUrl(
        `generated-logos/${tenant?.organizationId ?? 'unscoped'}/${image.id}.png`,
        image.url,
      );
      image = { ...image, url: stored.publicUrl };
      storage = { storageKey: stored.storageKey, mimeType: stored.mimeType };
    }

    const updated = await this.promptRecords.appendLogo(promptId, image, tenant, storage);
    return {
      image,
      logos: updated.logos,
      remaining: Math.max(0, 3 - updated.logos.length),
    };
  }

  getPrompt(promptId: string, tenant?: TenantScope) {
    return this.promptRecords.getById(promptId, tenant);
  }

  listSavedPrompts(limit?: number, cursor?: string, tenant?: TenantScope) {
    if (!process.env.DATABASE_URL) {
      return { prompts: [], nextCursor: null };
    }
    return this.promptRecords.listSaved(limit, cursor, tenant);
  }

  critique(promptId: string, pipelineResult: Awaited<ReturnType<typeof this.generate>>) {
    const prompt = pipelineResult.prompts.find((p) => p.id === promptId) ?? pipelineResult.bestPrompt;
    return critiqueDesign(prompt);
  }

  evolve(promptId: string, pipelineResult: Awaited<ReturnType<typeof this.generate>>) {
    const prompt = pipelineResult.prompts.find((p) => p.id === promptId) ?? pipelineResult.bestPrompt;
    return evolvePrompt(prompt);
  }
}
