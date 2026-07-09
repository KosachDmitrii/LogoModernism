import type { ComposedPrompt, PromptGenerationRequest } from '@logo-platform/shared';
import { normalizeBrandName } from '@logo-platform/shared';
import { promptTemplates, getPrincipleById } from '@logo-platform/knowledge-base';
import { selectDesignRules } from './design-rules-engine';
import { composePrompt, composePromptVariations, buildPromptFromTemplate } from './prompt-composer';
import { evolvePrompt, critiqueDesign } from './prompt-evolution';

export interface PipelineResult {
  prompts: ComposedPrompt[];
  recommendations: ReturnType<typeof selectDesignRules>['recommendations'];
  bestPrompt: ComposedPrompt;
}

export function runPromptPipeline(request: PromptGenerationRequest): PipelineResult {
  const variationCount = Math.min(request.variationCount ?? 5, 100);
  const companyName = normalizeBrandName(request.companyName);

  const sharedInput = {
    industry: request.industry,
    companyName,
    preferredEra: request.preferredEra,
    minimalismLevel: request.minimalismLevel ?? 8,
    inspirationMode: request.inspirationMode,
    analysisPrincipleIds: request.analysisPrincipleIds,
    catalogReferenceIds: request.catalogReferenceIds,
    catalogNarrative: request.catalogNarrative,
    markType: request.markType,
    typographyStyle: request.typographyStyle,
    colorPalette: request.briefContext?.colorPalette,
  };

  const baseSelection = selectDesignRules({
    ...sharedInput,
    variationSeed: 42,
  });

  const prompts = composePromptVariations(
    {
      industry: request.industry,
      companyName,
      principles: baseSelection.principles,
      dna: baseSelection.dna,
      inspirationMode: request.inspirationMode,
      catalogInspiration: baseSelection.catalogInspiration,
      markType: request.markType,
      typographyStyle: request.typographyStyle,
      briefContext: request.briefContext,
    },
    variationCount,
    (seed) =>
      selectDesignRules({
        ...sharedInput,
        variationSeed: seed * 7919 + (request.analysisPrincipleIds?.length ?? 0) * 31 + (request.catalogReferenceIds?.length ?? 0) * 17,
      }),
  );

  let bestPrompt = prompts[0];

  if (bestPrompt.scores.promptQuality < 7) {
    const evolved = evolvePrompt(bestPrompt, 2);
    if (evolved[0]?.scores.promptQuality > bestPrompt.scores.promptQuality) {
      bestPrompt = evolved[0];
      prompts.unshift(...evolved.filter((p) => p.id !== bestPrompt.id));
    }
  }

  return {
    prompts: prompts.slice(0, variationCount),
    recommendations: baseSelection.recommendations,
    bestPrompt,
  };
}

export function generateFromTemplate(templateId: string, industry: string): ComposedPrompt | null {
  const template = promptTemplates.find((t) => t.id === templateId);
  if (!template) return null;

  const principles = template.principleIds
    .map((id) => getPrincipleById(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const selection = selectDesignRules({ industry, variationSeed: 1 });

  return buildPromptFromTemplate(
    template.templateFragments,
    principles.length ? principles : selection.principles,
    industry,
    selection.dna,
  );
}

export { selectDesignRules } from './design-rules-engine';
export { composePrompt, composePromptVariations } from './prompt-composer';
export { optimizePrompt, detectPromptIssues } from './prompt-optimizer';
export { scorePrompt } from './prompt-scorer';
export { evolvePrompt, critiqueDesign, suggestMutations } from './prompt-evolution';
