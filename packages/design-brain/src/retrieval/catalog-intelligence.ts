import type { BrainGenerateRequest, CatalogIntelligenceResult } from '@logo-platform/shared';
import { buildCatalogPromptContext, getCatalogRecommendations } from '@logo-platform/knowledge-base';

export function resolveCatalogIntelligence(
  request: BrainGenerateRequest,
): { request: BrainGenerateRequest; intelligence: CatalogIntelligenceResult } {
  const hasManualRefs = Boolean(request.catalogReferenceIds?.length);
  const recommendations = getCatalogRecommendations({
    industry: request.industry,
    markType: request.markType,
    era: request.preferredEra as import('@logo-platform/shared').Era | undefined,
    limit: 6,
  });

  const referenceIds = hasManualRefs
    ? request.catalogReferenceIds!
    : recommendations.slice(0, 4).map((r) => r.id);

  const catalogContext = buildCatalogPromptContext(referenceIds, {
    narrative: request.catalogNarrative,
    typographyStyle: request.typographyStyle,
  });

  // Never invent significance/score dumps into catalogNarrative — that becomes Design brief note.
  // Manual user/catalog narrative (already sanitized downstream) is the only allowed value.
  const narrative = request.catalogNarrative?.trim() || undefined;

  return {
    request: {
      ...request,
      catalogReferenceIds: referenceIds,
      catalogNarrative: narrative,
      analysisPrincipleIds: [
        ...new Set([
          ...(request.analysisPrincipleIds ?? []),
          ...(catalogContext?.principleIds ?? []),
        ]),
      ],
    },
    intelligence: {
      referenceIds,
      recommendations: recommendations.map((r) => ({
        id: r.id,
        name: r.name,
        industryScore: r.industryScore,
      })),
      narrative: narrative ?? catalogContext?.inspirationFragments.slice(0, 2).join('; ') ?? '',
      autoSelected: !hasManualRefs,
    },
  };
}
