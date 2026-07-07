import type { ComposedPrompt, DesignRule } from '@logo-platform/shared';

export function slimPrompt(prompt: ComposedPrompt): ComposedPrompt {
  return {
    ...prompt,
    selectedPrinciples: prompt.selectedPrinciples.map(
      (principle): DesignRule => ({
        id: principle.id,
        name: principle.name,
        category: principle.category,
        description: principle.description,
        promptFragment: principle.promptFragment,
        examples: [],
        weight: 1,
        compatibility: [],
        antiPatterns: [],
        tags: [],
      }),
    ),
  };
}

export function slimPipelineResult(result: {
  prompts: ComposedPrompt[];
  recommendations: unknown;
  bestPrompt: ComposedPrompt;
}) {
  return {
    prompts: result.prompts.map(slimPrompt),
    recommendations: result.recommendations,
    bestPrompt: slimPrompt(result.bestPrompt),
  };
}
