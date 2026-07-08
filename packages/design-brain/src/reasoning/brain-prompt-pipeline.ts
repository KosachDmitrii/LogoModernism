import { randomUUID } from 'node:crypto';
import type {
  BrainExperienceRecord,
  BrainGenerateRequest,
  ComposedPrompt,
  DesignDecision,
  DesignRule,
  Era,
  LogoDNA,
  Recommendation,
  TasteProfile,
} from '@logo-platform/shared';
import { getPrincipleById, designPrinciples } from '@logo-platform/knowledge-base';
import { scorePrompt, optimizePrompt } from '@logo-platform/prompt-engine';
import type { PrismaClient } from '@logo-platform/database';
import { computeTasteProfile } from '../learning/taste-profile';
import { listLearnedPrinciples } from '../storage/experience.repository';
import { semanticSearch } from '../retrieval/semantic-search';
import { reasonDesignDecision } from './brain-reasoning';

export interface BrainPipelineResult {
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  bestPrompt: ComposedPrompt;
  decision: DesignDecision;
  retrievedExperiences: BrainExperienceRecord[];
  tasteProfile: TasteProfile;
  brainPowered: true;
}

function buildRetrievalQuery(request: BrainGenerateRequest): string {
  const brief = request.briefContext;
  return [
    request.industry,
    request.companyName,
    request.markType,
    request.catalogNarrative,
    brief?.personality,
    brief?.narrative,
    brief?.geometry,
    brief?.typography,
    brief?.constraints,
    request.preferredEra,
  ]
    .filter(Boolean)
    .join(' ');
}

function decisionToRules(decision: DesignDecision): DesignRule[] {
  const rules: DesignRule[] = [];

  for (const principle of decision.principles) {
    if (principle.id) {
      const existing = getPrincipleById(principle.id);
      if (existing) {
        rules.push({ ...existing, weight: principle.weight || existing.weight });
        continue;
      }
    }

    const matched = designPrinciples.find(
      (p) => p.promptFragment.toLowerCase() === principle.promptFragment.toLowerCase(),
    );
    if (matched) {
      rules.push({ ...matched, weight: principle.weight || matched.weight });
      continue;
    }

    rules.push({
      id: `learned-${randomUUID().slice(0, 8)}`,
      name: principle.promptFragment,
      category: principle.category as DesignRule['category'],
      description: principle.promptFragment,
      examples: [],
      promptFragment: principle.promptFragment,
      weight: principle.weight || 1,
      compatibility: [],
      antiPatterns: decision.antiPatterns,
      tags: [principle.category],
    });
  }

  for (const id of ['render-flat-vector', 'render-no-shadows', 'color-no-gradient']) {
    const rule = getPrincipleById(id);
    if (rule && !rules.some((r) => r.id === id)) rules.push(rule);
  }

  return rules;
}

function decisionToDna(decision: DesignDecision, request: BrainGenerateRequest): LogoDNA {
  return {
    geometry: decision.geometry,
    construction: decision.construction,
    balance: decision.composition,
    complexity: request.minimalismLevel && request.minimalismLevel >= 7 ? 'minimal' : 'medium',
    era: (decision.era as Era) ?? 'swiss',
    typography: decision.typography,
    recognition: Math.round(decision.confidence * 10),
    minimalism: request.minimalismLevel ?? 8,
    visualWeight: ['medium'],
    harmony: ['geometric'],
  };
}

function decisionToComposedPrompt(
  decision: DesignDecision,
  request: BrainGenerateRequest,
  variationIndex?: number,
): ComposedPrompt {
  const principles = decisionToRules(decision);
  const dna = decisionToDna(decision, request);

  let text = decision.promptText;
  if (decision.antiPatterns.length) {
    text += `. Avoid: ${decision.antiPatterns.join(', ')}`;
  }

  const optimized = optimizePrompt(text, principles);
  const scores = scorePrompt(optimized, principles, dna);

  return {
    id: randomUUID(),
    text: optimized,
    industry: request.industry,
    selectedPrinciples: principles,
    scores,
    dna,
    metadata: {
      era: dna.era,
      variationIndex,
      markType: decision.markType,
      typographyStyle: decision.typographyStyle,
      brainPowered: true,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    },
  };
}

function buildRecommendations(
  learned: Awaited<ReturnType<typeof listLearnedPrinciples>>,
): Recommendation[] {
  return learned.slice(0, 5).map((p, i) => ({
    principleId: p.id,
    name: p.promptFragment,
    reason: p.ruleText,
    confidence: Math.min(0.95, p.confidence - i * 0.05),
  }));
}

export async function runBrainPromptPipeline(
  prisma: PrismaClient,
  request: BrainGenerateRequest,
): Promise<BrainPipelineResult> {
  const variationCount = Math.min(request.variationCount ?? 5, 20);
  const retrievalQuery = buildRetrievalQuery(request);

  const [searchResult, learned, tasteProfile] = await Promise.all([
    semanticSearch(prisma, { query: retrievalQuery, limit: 8 }),
    listLearnedPrinciples(prisma, 20),
    computeTasteProfile(prisma),
  ]);

  const decision = await reasonDesignDecision({
    industry: request.industry,
    companyName: request.companyName,
    catalogReferenceIds: request.catalogReferenceIds,
    catalogNarrative: request.catalogNarrative,
    briefContext: request.briefContext,
    retrievedExperiences: searchResult.results,
    learnedPrinciples: learned.map((p) => ({
      category: p.category,
      ruleText: p.ruleText,
      promptFragment: p.promptFragment,
      weight: p.weight,
    })),
    tasteProfile,
    markType: request.markType,
    typographyStyle: request.typographyStyle,
    preferredEra: request.preferredEra,
    minimalismLevel: request.minimalismLevel,
  });

  const prompts: ComposedPrompt[] = [];
  for (let i = 0; i < variationCount; i++) {
    const variantDecision: DesignDecision = {
      ...decision,
      promptText:
        i === 0
          ? decision.promptText
          : `${decision.promptText}. Variation ${i + 1}: emphasize ${decision.geometry[i % decision.geometry.length] ?? 'geometric clarity'}.`,
      confidence: Math.max(0.3, decision.confidence - i * 0.03),
    };
    prompts.push(decisionToComposedPrompt(variantDecision, request, i + 1));
  }

  prompts.sort((a, b) => b.scores.promptQuality - a.scores.promptQuality);

  return {
    prompts: prompts.slice(0, variationCount),
    bestPrompt: prompts[0]!,
    recommendations: buildRecommendations(learned),
    decision,
    retrievedExperiences: searchResult.results,
    tasteProfile,
    brainPowered: true,
  };
}
