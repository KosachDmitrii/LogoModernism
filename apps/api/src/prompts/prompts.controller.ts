import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { slimPipelineResult } from './prompt-response';

@Controller('prompts')
export class PromptsController {
  private lastResult: ReturnType<PromptsService['generate']> | null = null;

  constructor(private readonly promptsService: PromptsService) {}

  @Post('generate')
  generate(@Body() dto: GeneratePromptDto) {
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
    };

    this.lastResult = this.promptsService.generate(request);
    return slimPipelineResult(this.lastResult);
  }

  @Get('recommend/:industry')
  recommend(@Param('industry') industry: string) {
    const result = this.promptsService.generate({
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
