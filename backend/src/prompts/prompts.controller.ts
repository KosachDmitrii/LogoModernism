import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { BrainPipelineResult } from '@logo-platform/design-brain';
import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { GeneratePromptLogoDto } from './dto/generate-prompt-logo.dto';
import { PromptFeedbackDto } from './dto/prompt-feedback.dto';
import { PromptSaveDto } from './dto/prompt-save.dto';
import { LogoFeedbackDto } from './dto/logo-feedback.dto';
import { LogoTagsDto } from './dto/logo-tags.dto';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { normalizeBrandName } from '@logo-platform/shared';
import { slimPipelineResult } from './prompt-response';

type PipelineOutput = Awaited<ReturnType<PromptsService['generate']>>;

@Controller('prompts')
export class PromptsController {
  private lastResult: PipelineOutput | null = null;

  constructor(private readonly promptsService: PromptsService) {}

  @Post('generate')
  async generate(@Body() dto: GeneratePromptDto) {
    const request: PromptGenerationRequest = {
      industry: dto.industry,
      companyName: normalizeBrandName(dto.companyName),
      variationCount: dto.variationCount ?? 10,
      inspirationMode: dto.inspirationMode as PromptGenerationRequest['inspirationMode'],
      preferredEra: dto.preferredEra as PromptGenerationRequest['preferredEra'],
      minimalismLevel: dto.minimalismLevel,
      analysisPrincipleIds: dto.analysisPrincipleIds,
      catalogReferenceIds: dto.catalogReferenceIds,
      catalogNarrative: dto.catalogNarrative,
      markType: dto.markType,
      typographyStyle: dto.typographyStyle,
      briefContext: dto.briefContext,
      useBrain: dto.useBrain,
      preferredTerritoryId: dto.preferredTerritoryId,
    };

    const { result, promptsWithLogos } = await this.promptsService.generateAndPersist(request);
    this.lastResult = result;

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

    if ('brainPowered' in result && result.brainPowered) {
      const brainResult = result as BrainPipelineResult;
      return {
        ...slimmed,
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

    return slimmed;
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
