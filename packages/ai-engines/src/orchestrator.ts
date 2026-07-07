import type { PromptGenerationRequest } from '@logo-platform/shared';
import { runPromptPipeline } from '@logo-platform/prompt-engine';
import { analyzeBrandDNA, type BrandDNAInput } from './brand-dna.engine';
import { analyzeLetterDNA } from './letter-dna.engine';
import { analyzeGeometry } from './geometry-intelligence.engine';
import { analyzeShapePsychology } from './shape-psychology.engine';
import { analyzeTypography } from './typography-intelligence.engine';
import { solveConstruction } from './construction-solver.engine';
import { analyzeComposition } from './composition-ai.engine';
import { generateSVGBlueprint } from './svg-blueprint.engine';
import { critiqueLogo } from './logo-critic.engine';
import { runEvolution } from './evolution.engine';

export interface FullPipelineInput {
  companyName: string;
  industry: string;
  variationCount?: number;
  inspirationMode?: BrandDNAInput['personality'];
  preferredEra?: BrandDNAInput['preferredEra'];
  markType?: 'symbol' | 'wordmark' | 'combination' | 'emblem';
}

export interface FullPipelineResult {
  brandDNA: ReturnType<typeof analyzeBrandDNA>;
  letterDNA: ReturnType<typeof analyzeLetterDNA>;
  geometry: ReturnType<typeof analyzeGeometry>;
  shapePsychology: ReturnType<typeof analyzeShapePsychology>;
  typography: ReturnType<typeof analyzeTypography>;
  composition: ReturnType<typeof analyzeComposition>;
  construction: ReturnType<typeof solveConstruction>;
  svgBlueprint: ReturnType<typeof generateSVGBlueprint>;
  prompts: ReturnType<typeof runPromptPipeline>;
  critique: ReturnType<typeof critiqueLogo>;
  evolution?: ReturnType<typeof runEvolution>;
}

export function runFullPipeline(input: FullPipelineInput): FullPipelineResult {
  const brandDNA = analyzeBrandDNA({
    companyName: input.companyName,
    industry: input.industry,
    preferredEra: input.preferredEra,
    personality: input.inspirationMode,
    markType: mapMarkType(input.markType),
  });

  const letterDNA = analyzeLetterDNA({ text: input.companyName, style: 'geometric' });

  const geometry = analyzeGeometry({
    industry: input.industry,
    complexity: brandDNA.visualTraits.complexity,
  });

  const shapePsychology = analyzeShapePsychology({
    shapes: geometry.recommendations.slice(0, 3).map((r) => r.name.toLowerCase()),
    industry: input.industry,
    brandPersonality: brandDNA.personality,
  });

  const typography = analyzeTypography({
    companyName: input.companyName,
    industry: input.industry,
    markType: mapMarkType(input.markType),
  });

  const composition = analyzeComposition({
    markType: mapCompositionMarkType(input.markType ?? brandDNA.markType),
    industry: input.industry,
    hasNegativeSpace: letterDNA.counterSpaceStrategy.toLowerCase().includes('negative'),
  });

  const topPrimitives = geometry.recommendations.slice(0, 2).map((r) => r.primitiveId);
  const construction = solveConstruction({
    primitiveIds: topPrimitives,
    targetComplexity: brandDNA.visualTraits.complexity,
  });

  const svgBlueprint = generateSVGBlueprint({
    primitiveIds: topPrimitives,
    construction,
  });

  const analysisPrincipleIds = [
    ...brandDNA.principleIds,
    ...composition.recommendedLayout.principleIds,
    typography.primaryRecommendation.principleId,
    ...typography.alternatives.slice(0, 2).map((a) => a.principleId),
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  const promptRequest: PromptGenerationRequest = {
    industry: input.industry,
    companyName: input.companyName,
    variationCount: input.variationCount ?? 5,
    preferredEra: input.preferredEra ?? brandDNA.visualTraits.era,
    minimalismLevel: brandDNA.visualTraits.complexity === 'minimal' ? 9 : 7,
    inspirationMode: input.inspirationMode as PromptGenerationRequest['inspirationMode'],
    analysisPrincipleIds,
  };

  const prompts = runPromptPipeline(promptRequest);
  const critique = critiqueLogo({ prompt: prompts.bestPrompt });

  let evolution;
  if (prompts.bestPrompt.scores.promptQuality < 8) {
    evolution = runEvolution({ prompt: prompts.bestPrompt, maxGenerations: 2 });
  }

  return {
    brandDNA,
    letterDNA,
    geometry,
    shapePsychology,
    typography,
    composition,
    construction,
    svgBlueprint,
    prompts,
    critique,
    evolution,
  };
}

function mapMarkType(
  markType?: FullPipelineInput['markType'],
): 'wordmark' | 'lettermark' | 'combination' | undefined {
  if (!markType) return undefined;
  if (markType === 'symbol') return 'lettermark';
  if (markType === 'emblem') return 'combination';
  return markType;
}

function mapCompositionMarkType(
  markType?: FullPipelineInput['markType'] | 'wordmark' | 'lettermark' | 'combination',
): 'symbol' | 'wordmark' | 'combination' | 'emblem' {
  if (!markType || markType === 'lettermark') return 'wordmark';
  if (markType === 'emblem') return 'emblem';
  if (markType === 'symbol') return 'symbol';
  return markType;
}
