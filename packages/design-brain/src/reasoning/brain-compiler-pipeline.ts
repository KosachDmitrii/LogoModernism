import { randomUUID } from 'node:crypto';
import type {
  BrainArchitecture,
  BrainExperienceRecord,
  BrainGenerateRequest,
  CatalogIntelligenceResult,
  ComposedPrompt,
  ConstraintReport,
  CreativeTerritory,
  DesignCriticResult,
  DesignDecision,
  Recommendation,
  TasteProfile,
} from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { compileBrief, createPromptExperience } from '@logo-platform/brief-compiler';
import { buildTerritoriesFromCompile } from './compiler-territories';
import { dnaFromCompile, scoreCompiledPrompt } from './compiler-scoring';
import { selectCreativeTerritory } from './creative-strategy';
import { buildBrainArchitecture } from './brain-architecture';
import { computeTasteProfile } from '../learning/taste-profile';
import { semanticSearch } from '../retrieval/semantic-search';
import { resolveCatalogIntelligence } from '../retrieval/catalog-intelligence';
import { ingestFeedback } from '../ingest/ingest-feedback';

export interface BrainPipelineResult {
  prompts: ComposedPrompt[];
  recommendations: Recommendation[];
  bestPrompt: ComposedPrompt;
  decision: DesignDecision;
  retrievedExperiences: BrainExperienceRecord[];
  tasteProfile: TasteProfile;
  brainArchitecture: BrainArchitecture;
  brainPowered: true;
  partnerMode?: boolean;
  creativeTerritories?: CreativeTerritory[];
  selectedTerritoryId?: string;
  constraintReport?: ConstraintReport;
  critique?: DesignCriticResult;
  catalogIntelligence?: CatalogIntelligenceResult;
  partnerAttempts?: number;
}

function toComposedPrompt(
  request: BrainGenerateRequest,
  positive: string,
  negative: string,
  index: number,
  compile: ReturnType<typeof compileBrief>,
  constraintReport?: ConstraintReport,
): ComposedPrompt {
  const scores = scoreCompiledPrompt(positive, compile, request);
  const dna = dnaFromCompile(compile, request);

  return {
    id: randomUUID(),
    text: positive,
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
      constraintReport,
      reasoning: 'Brief compiler v1',
      confidence: scores.promptQuality / 10,
      negativePrompt: negative,
    },
  };
}

function buildConstraintReport(
  compile: ReturnType<typeof compileBrief>,
): ConstraintReport {
  const violations = [
    ...compile.resolved.blocks.map((b) => ({
      id: randomUUID(),
      code: b.code,
      severity: 'error' as const,
      message: b.summary,
      suggestion: b.suggestion,
    })),
    ...compile.validation.violations.map((v) => ({
      id: randomUUID(),
      code: 'compiler_violation',
      severity: 'error' as const,
      message: v,
    })),
    ...compile.resolved.overrides.map((o) => ({
      id: randomUUID(),
      code: `override_${o.field}`,
      severity: 'warning' as const,
      message: o.summary,
    })),
  ];

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const passed = compile.validation.passed && compile.resolved.blocks.length === 0;
  const readinessFactor = compile.readiness.score / 100;
  const score = passed
    ? Math.min(1, readinessFactor * (1 - warnings * 0.04))
    : Math.max(0, 1 - errors * 0.25 - warnings * 0.08);

  return {
    passed,
    score,
    violations,
  };
}

export async function runBriefCompilerPipeline(
  prisma: PrismaClient,
  request: BrainGenerateRequest,
): Promise<BrainPipelineResult> {
  const { request: catalogRequest, intelligence } = resolveCatalogIntelligence(request);
  const compile = compileBrief(catalogRequest);
  const constraintReport = buildConstraintReport(compile);

  if (!compile.validation.passed) {
    throw new Error(`Brief compiler validation failed: ${compile.validation.violations.join('; ')}`);
  }

  const retrievalQuery = [
    catalogRequest.industry,
    catalogRequest.companyName,
    catalogRequest.markType,
    catalogRequest.briefContext?.geometry,
    catalogRequest.briefContext?.colorPalette,
  ]
    .filter(Boolean)
    .join(' ');

  const [searchResult, tasteProfile, architecture] = await Promise.all([
    semanticSearch(prisma, { query: retrievalQuery, limit: 4 }),
    computeTasteProfile(prisma),
    buildBrainArchitecture(prisma, catalogRequest, []),
  ]);

  const territories = buildTerritoriesFromCompile(compile, catalogRequest);
  const selectedTerritory = selectCreativeTerritory(territories, catalogRequest);

  const prompts = compile.prompts.map((p, index) =>
    toComposedPrompt(catalogRequest, p.positive, p.negative, index, compile, constraintReport),
  );

  const bestPrompt = [...prompts].sort(
    (a, b) => (b.scores?.promptQuality ?? 0) - (a.scores?.promptQuality ?? 0),
  )[0]!;

  for (const compiled of compile.prompts) {
    const experience = createPromptExperience(compiled, 'generated');
    await ingestFeedback(prisma, {
      signalType: 'APPROVE',
      score: Math.round(scoreCompiledPrompt(compiled.positive, compile, catalogRequest).promptQuality),
      context: `Brief compiler generated: ${experience.positive.slice(0, 200)}`,
      metadata: {
        briefCompiler: true,
        briefHash: experience.briefHash,
        schemaVersion: experience.schemaVersion,
        variantAxis: experience.variantAxis,
        overrides: compile.resolved.overrides,
        readiness: compile.readiness,
      },
    }).catch(() => undefined);
  }

  return {
    prompts,
    recommendations: [],
    bestPrompt,
    decision: {
      markType: compile.resolved.markType,
      typographyStyle: compile.resolved.typographyStyle,
      geometry: compile.resolved.shapes,
      construction: [compile.resolved.construction],
      composition: [compile.resolved.composition],
      typography: [],
      era: compile.resolved.era,
      principles: [],
      antiPatterns: [],
      catalogReferences: compile.resolved.reference ? [compile.resolved.reference.catalogId] : [],
      reasoning: 'Compiled deterministically from canonical brief',
      promptText: bestPrompt.text,
      confidence: bestPrompt.scores.promptQuality / 10,
    },
    retrievedExperiences: searchResult.results,
    tasteProfile,
    brainArchitecture: architecture,
    brainPowered: true,
    partnerMode: true,
    creativeTerritories: territories,
    selectedTerritoryId: selectedTerritory.id,
    constraintReport,
    catalogIntelligence: intelligence,
    partnerAttempts: 1,
  };
}
