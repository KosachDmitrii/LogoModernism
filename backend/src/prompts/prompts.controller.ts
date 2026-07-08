import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { BrainPipelineResult } from '@logo-platform/design-brain';
import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import type { PromptGenerationRequest } from '@logo-platform/shared';
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
      companyName: dto.companyName,
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

    const result = await this.promptsService.generate(request);
    this.lastResult = result;
    const slimmed = slimPipelineResult(result);

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
