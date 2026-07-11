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

  const narrative =
    request.catalogNarrative ??
    [
      `Catalog intelligence for ${request.industry}:`,
      ...recommendations.slice(0, 3).map(
        (r) => `${r.name} (score ${r.industryScore.toFixed(2)}) — ${r.significance?.slice(0, 120) ?? r.markType}`,
      ),
      catalogContext?.inspirationFragments.slice(0, 2).join('; '),
    ]
      .filter(Boolean)
      .join(' ');

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
      narrative,
      autoSelected: !hasManualRefs,
    },
  };
}
