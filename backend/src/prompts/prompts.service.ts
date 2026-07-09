import { BadRequestException, Injectable } from '@nestjs/common';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { normalizeBrandName } from '@logo-platform/shared';
import { designBrain } from '@logo-platform/design-brain';
import { runPromptPipeline, critiqueDesign, evolvePrompt } from '@logo-platform/prompt-engine';
import { ImagesService } from '../images/images.service';
import { PromptRecordsService } from './prompt-records.service';

@Injectable()
export class PromptsService {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly promptRecords: PromptRecordsService,
  ) {}

  async generate(request: PromptGenerationRequest) {
    const caps = designBrain.getCapabilities();
    const preferBrain = request.useBrain !== false && caps.databaseConfigured;

    if (preferBrain) {
      try {
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
          catalogNarrative: request.catalogNarrative,
          briefContext: request.briefContext,
          useBrain: true,
        });
      } catch (error) {
        if (request.useBrain === true) throw error;
        console.warn('Brain prompt pipeline failed, falling back to rules:', error);
      }
    }

    return runPromptPipeline(request);
  }

  async generateAndPersist(request: PromptGenerationRequest) {
    const result = await this.generate(request);
    if (!process.env.DATABASE_URL) {
      return {
        result,
        promptsWithLogos: this.promptRecords.attachLogosToPrompts(result.prompts),
      };
    }

    await this.promptRecords.saveBatch(request, result);
    const promptsWithLogos = await this.promptRecords.attachStoredState(result.prompts);
    return { result, promptsWithLogos };
  }

  async submitPromptFeedback(promptId: string, signalType: 'LIKE' | 'DISLIKE') {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to store prompt feedback');
    }

    const record = await this.promptRecords.getById(promptId);
    const updated = await this.promptRecords.setFeedback(promptId, signalType);

    try {
      await designBrain.ingestFeedback({
        signalType,
        score: signalType === 'LIKE' ? 8 : 2,
        context: [
          `Prompt feedback: ${signalType}`,
          record.companyName ? `Company: ${record.companyName}` : '',
          `Industry: ${record.industry}`,
          `Prompt ID: ${promptId}`,
          `Prompt: ${record.text}`,
        ]
          .filter(Boolean)
          .join('\n'),
        metadata: {
          kind: 'prompt_feedback',
          promptId,
          composedPromptId: promptId,
          promptQuality:
            typeof record.scores === 'object' &&
            record.scores !== null &&
            'promptQuality' in record.scores
              ? (record.scores as { promptQuality?: number }).promptQuality
              : undefined,
          era:
            typeof record.metadata === 'object' &&
            record.metadata !== null &&
            'era' in record.metadata
              ? (record.metadata as { era?: string }).era
              : undefined,
        },
      });
    } catch (error) {
      console.warn('Brain feedback ingest failed for prompt', promptId, error);
    }

    return {
      promptId,
      feedback: updated.feedback,
    };
  }

  async generateLogoForPrompt(
    promptId: string,
    body: {
      companyName?: string;
      markType?: 'wordmark' | 'lettermark' | 'combination';
      typographyStyle?: 'standard' | 'constructed';
      provider?: 'openai' | 'mock';
    },
  ) {
    if (!process.env.DATABASE_URL) {
      throw new BadRequestException('DATABASE_URL is required to store prompt logos');
    }

    const record = await this.promptRecords.getById(promptId);
    if (record.logos.length >= 3) {
      throw new BadRequestException('Maximum 3 logos per prompt');
    }

    const generation = await this.imagesService.generateFromComposedPrompt({
      text: record.text,
      companyName: normalizeBrandName(body.companyName ?? record.companyName),
      industry: record.industry,
      markType: body.markType,
      typographyStyle: body.typographyStyle,
      provider: body.provider,
    });

    const image = generation.images[0];
    if (!image) {
      throw new BadRequestException('Image generation returned no result');
    }

    const updated = await this.promptRecords.appendLogo(promptId, image);
    return {
      image,
      logos: updated.logos,
      remaining: Math.max(0, 3 - updated.logos.length),
    };
  }

  getPrompt(promptId: string) {
    return this.promptRecords.getById(promptId);
  }

  listSavedPrompts(filter: 'all' | 'like' | 'dislike' = 'all') {
    if (!process.env.DATABASE_URL) {
      return { prompts: [], total: 0 };
    }
    return this.promptRecords.listWithFeedback(filter).then((prompts) => ({
      prompts,
      total: prompts.length,
    }));
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
