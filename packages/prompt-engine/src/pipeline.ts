import type { CompileResult } from '@logo-platform/brief-compiler';
import type { ComposedPrompt, LogoDNA, PromptGenerationRequest } from '@logo-platform/shared';
import { normalizeBrandName } from '@logo-platform/shared';
import { compileBrief } from '@logo-platform/brief-compiler';
import { randomUUID } from 'node:crypto';
import { evolvePrompt, critiqueDesign } from './prompt-evolution';
import { scorePrompt } from './prompt-scorer';

export interface PipelineResult {
  prompts: ComposedPrompt[];
  recommendations: [];
  bestPrompt: ComposedPrompt;
}

function mapEra(era: string): LogoDNA['era'] {
  const lower = era.toLowerCase();
  if (lower.includes('bauhaus')) return 'bauhaus';
  if (lower.includes('1960') || lower.includes('1970') || lower.includes('corporate')) {
    return 'corporate_identity';
  }
  if (lower.includes('international') || lower.includes('swiss') || lower.includes('typographic')) {
    return 'swiss';
  }
  return 'swiss';
}

function dnaFromCompile(compile: CompileResult, request: PromptGenerationRequest): LogoDNA {
  const { resolved } = compile;
  const minimalism =
    resolved.minimalism === 'ultra' ? 9 : resolved.minimalism === 'moderate' ? 6 : 8;

  return {
    geometry: resolved.shapes,
    construction: [resolved.construction],
    balance: ['optically balanced'],
    complexity:
      resolved.minimalism === 'ultra'
        ? 'minimal'
        : resolved.minimalism === 'moderate'
          ? 'medium'
          : 'minimal',
    era: mapEra(resolved.era),
    typography: [
      resolved.typographyStyle === 'constructed'
        ? 'constructed geometric letterforms'
        : 'custom neo-grotesque',
    ],
    recognition: request.companyName ? 8 : 6,
    minimalism: request.minimalismLevel ?? minimalism,
    visualWeight: ['medium'],
    harmony: ['geometric'],
  };
}

function toComposedPrompt(
  request: PromptGenerationRequest,
  text: string,
  index: number,
  compile: CompileResult,
): ComposedPrompt {
  const dna = dnaFromCompile(compile, request);
  const scores = scorePrompt(text, [], dna);

  return {
    id: randomUUID(),
    text,
    industry: request.industry,
    selectedPrinciples: [],
    scores,
    dna,
    metadata: {
      era: dna.era,
      variationIndex: index,
      markType: request.markType,
      typographyStyle: request.typographyStyle,
      brainPowered: true,
      reasoning: 'Brief compiler v1',
      confidence: scores.promptQuality / 10,
    },
  };
}

export function runPromptPipeline(request: PromptGenerationRequest): PipelineResult {
  const companyName = normalizeBrandName(request.companyName);
  const compile = compileBrief({
    industry: request.industry,
    companyName,
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
    preferredTerritoryId: request.preferredTerritoryId,
  });

  if (!compile.validation.passed) {
    throw new Error(`Brief compiler validation failed: ${compile.validation.violations.join('; ')}`);
  }

  let prompts = compile.prompts.map((p: { positive: string }, index: number) =>
    toComposedPrompt(request, p.positive, index, compile),
  );
  let bestPrompt = prompts[0]!;

  if (bestPrompt.scores.promptQuality < 7) {
    const evolved = evolvePrompt(bestPrompt, 2);
    if (evolved[0]?.scores.promptQuality > bestPrompt.scores.promptQuality) {
      bestPrompt = evolved[0];
      prompts = [bestPrompt, ...evolved.filter((p) => p.id !== bestPrompt.id)];
    }
  }

  const variationCount = Math.min(request.variationCount ?? 5, prompts.length);
  return {
    prompts: prompts.slice(0, variationCount),
    recommendations: [],
    bestPrompt,
  };
}

export { critiqueDesign };
