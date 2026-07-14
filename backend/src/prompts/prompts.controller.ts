import { Body, Controller, Get, Logger, Param, Post, Query } from '@nestjs/common';
import type { BrainPipelineResult } from '@logo-platform/design-brain';
import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { GeneratePromptLogoDto } from './dto/generate-prompt-logo.dto';
import { PromptFeedbackDto } from './dto/prompt-feedback.dto';
import { PromptSaveDto } from './dto/prompt-save.dto';
import { LogoFeedbackDto } from './dto/logo-feedback.dto';
import { LogoTagsDto } from './dto/logo-tags.dto';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { normalizeBrandName, resolvePromptGenerateIntent } from '@logo-platform/shared';
import { slimPipelineResult } from './prompt-response';

type PipelineOutput = Awaited<ReturnType<PromptsService['generate']>>;

@Controller('prompts')
export class PromptsController {
  private readonly logger = new Logger(PromptsController.name);
  private lastResult: PipelineOutput | null = null;

  constructor(private readonly promptsService: PromptsService) {}

  @Post('generate')
  async generate(@Body() dto: GeneratePromptDto, @Query('intent') queryIntent?: string) {
    const intent = resolvePromptGenerateIntent(dto.intent, queryIntent);
    const request: PromptGenerationRequest = {
      industry: dto.industry,
      companyName: normalizeBrandName(dto.companyName),
      variationCount: dto.variationCount ?? 10,
      inspirationMode: dto.inspirationMode as PromptGenerationRequest['inspirationMode'],
      preferredEra: dto.preferredEra as PromptGenerationRequest['preferredEra'],
      minimalismLevel: dto.minimalismLevel,
      analysisPrincipleIds: dto.analysisPrincipleIds,
      catalogReferenceIds: dto.catalogReferenceIds,
      autoCatalogReferences: dto.autoCatalogReferences,
      rebusWordmark: dto.rebusWordmark,
      catalogNarrative: dto.catalogNarrative,
      markType: dto.markType,
      typographyStyle: dto.typographyStyle,
      briefContext: dto.briefContext,
      useBrain: dto.useBrain,
      preferredTerritoryId: dto.preferredTerritoryId,
      intent,
    };

    const startedAt = Date.now();
    this.logger.log(
      JSON.stringify({
        event: 'prompt.generate.start',
        intent,
        industry: request.industry,
        companyName: request.companyName ?? null,
        variationCount: request.variationCount,
        preferredTerritoryId: request.preferredTerritoryId ?? null,
      }),
    );

    try {
      const { result, promptsWithLogos } = await this.promptsService.generateAndPersist(request);
      this.lastResult = result;

      const brainResult = 'brainPowered' in result && result.brainPowered ? (result as BrainPipelineResult) : null;
      this.logger.log(
        JSON.stringify({
          event: 'prompt.generate.complete',
          intent,
          industry: request.industry,
          durationMs: Date.now() - startedAt,
          promptCount: result.prompts.length,
          brainPowered: Boolean(brainResult),
          partnerMode: Boolean(brainResult?.partnerMode),
          partnerAttempts: brainResult?.partnerAttempts ?? null,
          constraintPassed: brainResult?.constraintReport?.passed ?? null,
          constraintViolationCount: brainResult?.constraintReport?.violations.length ?? null,
        }),
      );

      const slimmed = slimPipelineResult({
        ...result,
        prompts: promptsWithLogos,
        bestPrompt: {
          ...result.bestPrompt,
          logos: promptsWithLogos.find((p) => p.id === result.bestPrompt.id)?.logos ?? [],
          feedback: promptsWithLogos.find((p) => p.id === result.bestPrompt.id)?.feedback,
          saved: promptsWithLogos.find((p) => p.id === result.bestPrompt.id)?.saved,
        },
      });

      const meta = { intent };

      if (brainResult) {
        return {
          ...slimmed,
          meta,
          brainPowered: true,
          decision: brainResult.decision,
          tasteProfile: brainResult.tasteProfile,
          retrievedExperiences: brainResult.retrievedExperiences,
          ...(brainResult.partnerMode
            ? {
                partnerMode: true,
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

      return { ...slimmed, meta };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'prompt.generate.error',
          intent,
          industry: request.industry,
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }

  @Get('recommend/:industry')
  async recommend(@Param('industry') industry: string) {
    const result = await this.promptsService.generate({
      industry,
      variationCount: 1,
    });
    return {
      industry,
      recommendations: result.recommendations,
      suggestedPrinciples: result.bestPrompt.selectedPrinciples.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
      })),
      dna: result.bestPrompt.dna,
    };
  }

  @Get('saved')
  listSaved() {
    return this.promptsService.listSavedPrompts();
  }

  @Post(':id/save')
  toggleSave(@Param('id') id: string, @Body() body: PromptSaveDto) {
    return this.promptsService.togglePromptSave(id, body.saved);
  }

  @Post(':id/logos/:logoId/feedback')
  submitLogoFeedback(
    @Param('id') id: string,
    @Param('logoId') logoId: string,
    @Body() body: LogoFeedbackDto,
  ) {
    return this.promptsService.submitLogoFeedback(id, logoId, body);
  }

  @Post(':id/logos/:logoId/tags')
  submitLogoTags(
    @Param('id') id: string,
    @Param('logoId') logoId: string,
    @Body() body: LogoTagsDto,
  ) {
    return this.promptsService.submitLogoTags(id, logoId, body);
  }

  @Get(':id')
  getPrompt(@Param('id') id: string) {
    return this.promptsService.getPrompt(id);
  }

  @Post(':id/logos/generate')
  generateLogo(@Param('id') id: string, @Body() body: GeneratePromptLogoDto) {
    return this.promptsService.generateLogoForPrompt(id, body);
  }

  @Post(':id/feedback')
  submitFeedback(@Param('id') id: string, @Body() body: PromptFeedbackDto) {
    return this.promptsService.submitPromptFeedback(id, body.signalType);
  }

  @Post(':id/critique')
  critique(@Param('id') id: string) {
    if (!this.lastResult) {
      return { error: 'Generate prompts first' };
    }
    return this.promptsService.critique(id, this.lastResult);
  }

  @Post(':id/evolve')
  evolve(@Param('id') id: string) {
    if (!this.lastResult) {
      return { error: 'Generate prompts first' };
    }
    return this.promptsService.evolve(id, this.lastResult);
  }
}
