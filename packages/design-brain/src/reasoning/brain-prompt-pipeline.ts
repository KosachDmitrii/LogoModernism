import { randomUUID } from 'node:crypto';
import type {
  BrainExperienceRecord,
  BrainGenerateRequest,
  BrainArchitecture,
  ComposedPrompt,
  DesignDecision,
  DesignRule,
  Era,
  LogoDNA,
  Recommendation,
  TasteProfile,
} from '@logo-platform/shared';
import {
  appendArtDirectionFragments,
  appendStylePreferenceFragments,
  stylePreferenceOverrides,
  finalizeLogoPromptText,
  buildClientAvoidFragments,
} from '@logo-platform/shared';
import { getPrincipleById, designPrinciples } from '@logo-platform/knowledge-base';
import { appendAntiPatterns, optimizePrompt, scorePrompt } from '@logo-platform/prompt-engine';
import type { PrismaClient } from '@logo-platform/database';
import { computeTasteProfile } from '../learning/taste-profile';
import { listLearnedPrinciples } from '../storage/experience.repository';
import { semanticSearch } from '../retrieval/semantic-search';
import { reasonDesignDecision } from './brain-reasoning';
import {
  buildBasePromptFromRules,
  buildVariationPrompt,
  mergePrincipleSets,
} from './prompt-enrichment';
import { buildBrainArchitecture, solveConstraints } from './brain-architecture';

export interface BrainPipelineResult {
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  bestPrompt: ComposedPrompt;
  decision: DesignDecision;
  retrievedExperiences: BrainExperienceRecord[];
  tasteProfile: TasteProfile;
  brainArchitecture: BrainArchitecture;
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
    brief?.colorPalette,
    brief?.colorSelections?.join(' '),
    brief?.allowShadows ? 'shadows allowed' : '',
    brief?.allowPhotoreal ? 'photoreal allowed' : '',
    brief?.clientNotes,
    request.preferredEra,
  ]
    .filter(Boolean)
    .join(' ');
}

function decisionToRules(
  decision: DesignDecision,
  request?: BrainGenerateRequest,
): DesignRule[] {
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

  const style = stylePreferenceOverrides(request?.briefContext);
  const defaultRuleIds = [
    !style.allowPhotoreal ? 'render-flat-vector' : undefined,
    !style.allowShadows ? 'render-no-shadows' : undefined,
    !style.allowPhotoreal ? 'color-no-gradient' : undefined,
  ].filter((id): id is string => Boolean(id));

  for (const id of defaultRuleIds) {
    const rule = getPrincipleById(id);
    if (rule && !rules.some((r) => r.id === id)) rules.push(rule);
  }

  return rules;
}

function decisionToDna(
  decision: DesignDecision,
  request: BrainGenerateRequest,
  baseDna?: LogoDNA,
): LogoDNA {
  return {
    geometry: decision.geometry.length ? decision.geometry : (baseDna?.geometry ?? []),
    construction: decision.construction.length ? decision.construction : (baseDna?.construction ?? []),
    balance: decision.composition.length ? decision.composition : (baseDna?.balance ?? []),
    complexity: request.minimalismLevel && request.minimalismLevel >= 7 ? 'minimal' : (baseDna?.complexity ?? 'medium'),
    era: (decision.era as Era) ?? baseDna?.era ?? 'swiss',
    typography: decision.typography.length ? decision.typography : (baseDna?.typography ?? []),
    recognition: Math.round(decision.confidence * 10),
    minimalism: request.minimalismLevel ?? baseDna?.minimalism ?? 8,
    visualWeight: baseDna?.visualWeight ?? ['medium'],
    harmony: baseDna?.harmony ?? ['geometric'],
  };
}

function decisionToComposedPrompt(
  decision: DesignDecision,
  request: BrainGenerateRequest,
  basePrompt: ComposedPrompt,
  architecture: BrainArchitecture,
  variationIndex?: number,
): ComposedPrompt {
  const brainRules = decisionToRules(decision, request);
  const principles = mergePrincipleSets(basePrompt.selectedPrinciples, brainRules);
  const dna = decisionToDna(decision, request, basePrompt.dna);

  const clientAvoid = buildClientAvoidFragments(architecture.clientIntent.forbiddenMotifs);
  const text = appendAntiPatterns(decision.promptText, clientAvoid);
  const styled = appendStylePreferenceFragments(text, request.briefContext);
  const directed = appendArtDirectionFragments(styled, {
    markType: decision.markType,
    industry: request.industry,
    clientIntent: architecture.clientIntent,
  });
  const optimized = optimizePrompt(directed, principles, stylePreferenceOverrides(request.briefContext));
  const finalText = finalizeLogoPromptText(optimized, {
    clientNotes: request.briefContext?.clientNotes,
    companyName: request.companyName,
    markType: decision.markType,
    colorPalette: request.briefContext?.colorPalette,
    abstractionLevel: architecture.clientIntent.abstractionLevel,
    minimalismLevel: request.minimalismLevel,
    geometry: request.briefContext?.geometry,
    preferredShapes: request.briefContext?.preferredShapes,
  });
  const scores = scorePrompt(finalText, principles, dna);

  return {
    id: randomUUID(),
    text: finalText,
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
      basePromptLength: basePrompt.text.length,
      enrichedPromptLength: optimized.length,
      stylePreferences: request.briefContext
        ? {
            colorPalette: request.briefContext.colorPalette,
            colorSelections: request.briefContext.colorSelections,
            allowShadows: request.briefContext.allowShadows,
            allowPhotoreal: request.briefContext.allowPhotoreal,
            clientNotes: request.briefContext.clientNotes,
          }
        : undefined,
      brainArchitecture: architecture,
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
  const basePrompt = buildBasePromptFromRules(request);

  const [searchResult, learned, tasteProfile] = await Promise.all([
    semanticSearch(prisma, { query: retrievalQuery, limit: 8 }),
    listLearnedPrinciples(prisma, 20),
    computeTasteProfile(prisma),
  ]);

  const architecture = await buildBrainArchitecture(prisma, request, searchResult.results);

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
    basePromptText: basePrompt.text,
    basePrinciples: basePrompt.selectedPrinciples,
    designStrategy: architecture.designStrategy,
    clientIntent: architecture.clientIntent,
  });

  const constrainedDecision = solveConstraints(
    decision,
    architecture.designStrategy,
    architecture.clientIntent.abstractionLevel,
    request.minimalismLevel,
  );

  const prompts: ComposedPrompt[] = [];
  for (let i = 0; i < variationCount; i++) {
    const variantDecision: DesignDecision = {
      ...constrainedDecision,
      promptText: buildVariationPrompt(constrainedDecision.promptText, constrainedDecision.geometry, i),
      confidence: Math.max(0.3, constrainedDecision.confidence - i * 0.03),
    };
    prompts.push(decisionToComposedPrompt(variantDecision, request, basePrompt, architecture, i + 1));
  }

  prompts.sort((a, b) => b.scores.promptQuality - a.scores.promptQuality);

  return {
    prompts: prompts.slice(0, variationCount),
    bestPrompt: prompts[0]!,
    recommendations: buildRecommendations(learned),
    decision: constrainedDecision,
    retrievedExperiences: searchResult.results,
    tasteProfile,
    brainArchitecture: architecture,
    brainPowered: true,
  };
}
