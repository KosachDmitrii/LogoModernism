import type {
  BrainGenerateRequest,
  ComposedPrompt,
  CreativeTerritory,
  DesignCriticResult,
} from '@logo-platform/shared';
import {
  buildPolishOptionsFromRequest,
  finalizeLogoPromptText,
  resolveTerritoryColorApproach,
  appendUniqueConstraintSentences,
} from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { critiqueLogo } from '@logo-platform/ai-engines';
import { resolveCatalogIntelligence } from '../retrieval/catalog-intelligence';
import { ingestFeedback } from '../ingest/ingest-feedback';
import { storeGenerationExperience } from '../generation/critique-loop';
import {
  normalizeStructuredFeedback,
  structuredFeedbackMetadata,
} from '../learning/structured-feedback';
import {
  buildCreativeTerritories,
  selectCreativeTerritory,
} from './creative-strategy';
import {
  constraintFeedback,
  evaluateConstraintCompliance,
} from './constraint-gate';
import {
  runBrainPromptPipeline,
  type BrainPipelineResult,
} from './brain-prompt-pipeline';

function partnerMaxAttempts(): number {
  const retries = Number(process.env.BRAIN_CRITIQUE_RETRIES ?? 2);
  return Math.min(Math.max(1, retries + 1), 6);
}

function partnerQualityThreshold(): number {
  return Number(process.env.BRAIN_QUALITY_THRESHOLD ?? 7);
}

function partnerCritiqueEnabled(): boolean {
  return process.env.BRAIN_ENABLE_CRITIQUE !== 'false';
}

function territoryBriefDirective(territoryId: string): string {
  switch (territoryId) {
    case 'territory-construction':
      return 'Creative territory: Construction-led. Emphasize modular geometric construction as the hero system. Typography must be subordinate to the construction grid.';
    case 'territory-typography':
      return 'Creative territory: Typography-led. Custom letterforms are the primary recognition anchor. Lead with distinctive wordmark construction.';
    default:
      return 'Creative territory: Primary direction. Balanced mark architecture aligned to industry and brief.';
  }
}

function applyPreferredTerritoryToRequest(request: BrainGenerateRequest): BrainGenerateRequest {
  if (!request.preferredTerritoryId) return request;
  const directive = territoryBriefDirective(request.preferredTerritoryId);
  const existing = request.briefContext?.constraints ?? '';
  return {
    ...request,
    briefContext: {
      ...request.briefContext,
      constraints: [existing, directive].filter(Boolean).join('. '),
    },
  };
}

function enrichRequestWithPartnerFeedback(
  request: BrainGenerateRequest,
  constraintReport: ReturnType<typeof evaluateConstraintCompliance> | null,
  critiqueFeedback: string[],
): BrainGenerateRequest {
  const constraintText = constraintReport ? constraintFeedback(constraintReport).join('. ') : '';
  const critiqueText = critiqueFeedback.join('. ');
  const extra = [constraintText, critiqueText].filter(Boolean);
  const existing = request.briefContext?.constraints ?? '';

  return {
    ...request,
    preferredTerritoryId: request.preferredTerritoryId,
    briefContext: {
      ...request.briefContext,
      constraints: appendUniqueConstraintSentences(existing, extra),
    },
    minimalismLevel: Math.min(10, (request.minimalismLevel ?? 8) + (critiqueFeedback.length ? 1 : 0)),
  };
}

function applyCreativeTerritory(
  pipeline: BrainPipelineResult,
  territory: CreativeTerritory,
  request: BrainGenerateRequest,
): BrainPipelineResult {
  const colorApproach = resolveTerritoryColorApproach(
    territory.colorApproach,
    request.briefContext?.colorPalette,
  );
  const territoryFragment = [
    `Creative direction: ${territory.thesis}`,
    `Construction focus: ${territory.constructionFocus}`,
    `Typography focus: ${territory.typographyFocus}`,
    `Color approach: ${colorApproach}`,
  ].join('. ');

  const mergedText = `${pipeline.bestPrompt.text} ${territoryFragment}`.trim();
  const polishOptions = buildPolishOptionsFromRequest(request);
  const polishedText = finalizeLogoPromptText(mergedText, {
    ...polishOptions,
    clientNotes: request.briefContext?.clientNotes,
    companyName: request.companyName,
    markType: pipeline.decision.markType,
    colorPalette: request.briefContext?.colorPalette,
    abstractionLevel: pipeline.brainArchitecture.clientIntent.abstractionLevel,
  });

  const bestPrompt: ComposedPrompt = {
    ...pipeline.bestPrompt,
    text: polishedText,
    metadata: {
      ...pipeline.bestPrompt.metadata,
      creativeTerritory: territory,
    },
  };

  const prompts = pipeline.prompts.map((prompt) =>
    prompt.id === bestPrompt.id ? bestPrompt : prompt,
  );

  return {
    ...pipeline,
    bestPrompt,
    prompts,
  };
}

function buildPartnerResult(
  pipeline: BrainPipelineResult,
  options: {
    territories: CreativeTerritory[];
    selectedTerritory: CreativeTerritory;
    constraintReport: ReturnType<typeof evaluateConstraintCompliance>;
    critique?: DesignCriticResult;
    catalogIntelligence: ReturnType<typeof resolveCatalogIntelligence>['intelligence'];
    attempts: number;
  },
): BrainPipelineResult {
  const bestPrompt: ComposedPrompt = {
    ...pipeline.bestPrompt,
    metadata: {
      ...pipeline.bestPrompt.metadata,
      constraintReport: options.constraintReport,
      partnerCritique: options.critique,
    },
  };

  const prompts = pipeline.prompts.map((prompt) =>
    prompt.id === bestPrompt.id ? bestPrompt : prompt,
  );

  return {
    ...pipeline,
    prompts,
    bestPrompt,
    partnerMode: true,
    creativeTerritories: options.territories,
    selectedTerritoryId: options.selectedTerritory.id,
    constraintReport: options.constraintReport,
    critique: options.critique,
    catalogIntelligence: options.catalogIntelligence,
    partnerAttempts: options.attempts,
  };
}

async function recordPartnerSuccess(
  prisma: PrismaClient,
  request: BrainGenerateRequest,
  pipeline: BrainPipelineResult,
  critique?: DesignCriticResult,
): Promise<string | undefined> {
  const score = critique?.overallScore ?? pipeline.bestPrompt.scores.promptQuality * 10;
  const storedExperienceId = await storeGenerationExperience(prisma, {
    companyName: request.companyName,
    industry: request.industry,
    promptText: pipeline.bestPrompt.text,
    critiqueScore: score,
    principleIds: pipeline.bestPrompt.selectedPrinciples.map((p) => p.id),
  });

  const structured = normalizeStructuredFeedback({
    signalType: 'APPROVE',
    score,
    context: `Partner pipeline success: ${pipeline.bestPrompt.text.slice(0, 300)}`,
    experienceId: storedExperienceId,
    metadata: {
      workedTags: ['brief_fit', 'construction'],
      partnerMode: true,
      markType: pipeline.decision.markType,
    },
  });

  await ingestFeedback(prisma, {
    signalType: 'APPROVE',
    score,
    context: `Partner pipeline success: ${pipeline.bestPrompt.text.slice(0, 300)}`,
    experienceId: storedExperienceId,
    metadata: structuredFeedbackMetadata(structured, {
      partnerMode: true,
      markType: pipeline.decision.markType,
      critiqueScore: critique?.overallScore,
      constraintScore: pipeline.constraintReport?.score,
    }),
  });

  return storedExperienceId;
}

async function recordPartnerFailure(
  prisma: PrismaClient,
  request: BrainGenerateRequest,
  pipeline: BrainPipelineResult,
  critique: DesignCriticResult,
): Promise<void> {
  const structured = normalizeStructuredFeedback({
    signalType: 'REJECT',
    score: critique.overallScore,
    context: `Partner pipeline below threshold: ${critique.feedback.join('; ')}`,
    metadata: {
      missedTags: ['brief_fit', 'scalability'],
      partnerMode: true,
      markType: pipeline.decision.markType,
    },
  });

  await ingestFeedback(prisma, {
    signalType: 'REJECT',
    score: critique.overallScore,
    context: `Partner pipeline below threshold: ${critique.feedback.join('; ')}`,
    metadata: structuredFeedbackMetadata(structured, {
      partnerMode: true,
      markType: pipeline.decision.markType,
      principleIds: pipeline.bestPrompt.selectedPrinciples.map((p) => p.id),
    }),
  });
}

export async function runBrainPartnerPipeline(
  prisma: PrismaClient,
  request: BrainGenerateRequest,
): Promise<BrainPipelineResult> {
  const maxAttempts = partnerMaxAttempts();
  const qualityThreshold = partnerQualityThreshold();
  const enableCritique = partnerCritiqueEnabled();

  const { request: catalogRequest, intelligence } = resolveCatalogIntelligence(request);
  let currentRequest = applyPreferredTerritoryToRequest(catalogRequest);

  let lastPipeline: BrainPipelineResult | null = null;
  let lastTerritories: CreativeTerritory[] = [];
  let lastTerritory: CreativeTerritory | null = null;
  let lastConstraint: ReturnType<typeof evaluateConstraintCompliance> | null = null;
  let lastCritique: DesignCriticResult | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const pipeline = await runBrainPromptPipeline(prisma, currentRequest);
    const territories = buildCreativeTerritories(pipeline.brainArchitecture, currentRequest);
    const selectedTerritory = selectCreativeTerritory(territories, currentRequest);
    const withTerritory = applyCreativeTerritory(pipeline, selectedTerritory, currentRequest);

    lastPipeline = withTerritory;
    lastTerritories = territories;
    lastTerritory = selectedTerritory;

    lastConstraint = evaluateConstraintCompliance(
      pipeline.decision,
      withTerritory.bestPrompt,
      pipeline.brainArchitecture,
      currentRequest,
    );

    if (!lastConstraint.passed) {
      if (attempt < maxAttempts) {
        currentRequest = enrichRequestWithPartnerFeedback(currentRequest, lastConstraint, []);
        continue;
      }
      break;
    }

    if (!enableCritique) {
      await recordPartnerSuccess(prisma, currentRequest, withTerritory);
      return buildPartnerResult(withTerritory, {
        territories,
        selectedTerritory,
        constraintReport: lastConstraint,
        catalogIntelligence: intelligence,
        attempts: attempt,
      });
    }

    lastCritique = critiqueLogo({ prompt: withTerritory.bestPrompt });
    if (lastCritique.overallScore >= qualityThreshold) {
      await recordPartnerSuccess(prisma, currentRequest, withTerritory, lastCritique);
      return buildPartnerResult(withTerritory, {
        territories,
        selectedTerritory,
        constraintReport: lastConstraint,
        critique: lastCritique,
        catalogIntelligence: intelligence,
        attempts: attempt,
      });
    }

    if (attempt < maxAttempts) {
      currentRequest = enrichRequestWithPartnerFeedback(currentRequest, null, lastCritique.feedback);
    }
  }

  if (!lastPipeline || !lastTerritory || !lastConstraint) {
    throw new Error('Partner pipeline failed to produce a result');
  }

  if (lastCritique) {
    await recordPartnerFailure(prisma, currentRequest, lastPipeline, lastCritique);
  }

  return buildPartnerResult(lastPipeline, {
    territories: lastTerritories,
    selectedTerritory: lastTerritory,
    constraintReport: lastConstraint,
    critique: lastCritique,
    catalogIntelligence: intelligence,
    attempts: maxAttempts,
  });
}
