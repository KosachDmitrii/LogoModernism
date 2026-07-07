import { Injectable } from '@nestjs/common';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import { runPromptPipeline, critiqueDesign, evolvePrompt } from '@logo-platform/prompt-engine';

@Injectable()
export class PromptsService {
  generate(request: PromptGenerationRequest) {
    return runPromptPipeline(request);
  }

  critique(promptId: string, pipelineResult: ReturnType<typeof runPromptPipeline>) {
    const prompt = pipelineResult.prompts.find((p) => p.id === promptId) ?? pipelineResult.bestPrompt;
    return critiqueDesign(prompt);
  }

  evolve(promptId: string, pipelineResult: ReturnType<typeof runPromptPipeline>) {
    const prompt = pipelineResult.prompts.find((p) => p.id === promptId) ?? pipelineResult.bestPrompt;
    return evolvePrompt(prompt);
  }
}
