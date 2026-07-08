import { Injectable } from '@nestjs/common';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { designBrain } from '@logo-platform/design-brain';
import { runPromptPipeline, critiqueDesign, evolvePrompt } from '@logo-platform/prompt-engine';

@Injectable()
export class PromptsService {
  async generate(request: PromptGenerationRequest) {
    if (request.useBrain) {
      return designBrain.generate({
        industry: request.industry,
        companyName: request.companyName,
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
    }

    return runPromptPipeline(request);
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
