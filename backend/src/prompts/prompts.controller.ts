import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { BrainPipelineResult } from '@logo-platform/design-brain';
import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { GeneratePromptLogoDto } from './dto/generate-prompt-logo.dto';
import { PromptFeedbackDto } from './dto/prompt-feedback.dto';
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
  listSaved(@Query('filter') filter?: string) {
    const normalized =
      filter === 'like' || filter === 'dislike' ? filter : ('all' as const);
    return this.promptsService.listSavedPrompts(normalized);
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
