import type { ComposedPrompt, DesignRule, GeneratedImage } from '@logo-platform/shared';

export function slimPrompt(
  prompt: ComposedPrompt & { logos?: GeneratedImage[]; saved?: boolean; feedback?: 'LIKE' | 'DISLIKE' },
): ComposedPrompt & { logos?: GeneratedImage[]; saved?: boolean; feedback?: 'LIKE' | 'DISLIKE' } {
  return {
    ...prompt,
    logos: prompt.logos,
    saved: prompt.saved,
    feedback: prompt.feedback,
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
  prompts: Array<ComposedPrompt & { logos?: GeneratedImage[]; saved?: boolean; feedback?: 'LIKE' | 'DISLIKE' }>;
  recommendations: unknown;
  bestPrompt: ComposedPrompt & { logos?: GeneratedImage[]; saved?: boolean; feedback?: 'LIKE' | 'DISLIKE' };
}) {
  return {
    prompts: result.prompts.map(slimPrompt),
    recommendations: result.recommendations,
    bestPrompt: slimPrompt(result.bestPrompt),
  };
}
