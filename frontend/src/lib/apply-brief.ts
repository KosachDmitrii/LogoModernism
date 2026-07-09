import type { DesignBrief } from '../types';
import { complexityToMinimalism, dedupeTags, eraToInspiration, isMultiWordCompanyName, joinTags } from './brief-mappers';

type BriefPatch = Partial<DesignBrief>;

function mergePrincipleIds(current: string[], incoming: string[]): string[] {
  return [...new Set([...current, ...incoming])].slice(0, 24);
}

const SHAPE_NAME_TO_PRINCIPLE: Record<string, string[]> = {
  circle: ['geo-circle', 'comp-negative-space'],
  square: ['geo-square'],
  triangle: ['geo-triangle', 'geo-angular'],
  hexagon: ['geo-angular'],
  cross: ['geo-angular'],
  line: ['con-equal-width-lines'],
  grid: ['con-grid-based', 'con-modular-grid'],
  modular: ['con-modular-grid'],
  symmetry: ['comp-symmetry'],
};

function principleIdsFromShapeNames(names: string[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const normalized = name.toLowerCase();
    for (const [key, principleIds] of Object.entries(SHAPE_NAME_TO_PRINCIPLE)) {
      if (normalized.includes(key)) ids.push(...principleIds);
    }
  }
  return [...new Set(ids)];
}

function mergeBrief(current: DesignBrief, patch: BriefPatch, source: string): DesignBrief {
  const sources = current.sources.includes(source)
    ? current.sources
    : [...current.sources, source];

  return {
    ...current,
    ...patch,
    sources,
  };
}

export function applyBrandDNAToBrief(
  current: DesignBrief,
  result: {
    companyName?: string;
    personality?: string;
    markType?: string;
    typographyStyle?: string;
    narrative?: string;
    principleIds?: string[];
    visualTraits?: {
      era?: string;
      complexity?: string;
      typography?: string[];
      letterformStyle?: string[];
      composition?: string[];
    };
    typography?: {
      primaryRecommendation?: { name: string; characteristics?: string[] };
      constructionRules?: string[];
    };
    letterDNA?: {
      monogramOptions?: string[];
      ligatureOpportunities?: string[];
      recommendedWeight?: string;
    };
    psychologyProfile?: { primaryEmotion?: string };
    constraints?: string[];
  },
): { brief: DesignBrief; inspirationMode: string; minimalismLevel: number } {
  const era = result.visualTraits?.era?.replace(/_/g, ' ') ?? '';
  const isWordmark = result.markType === 'wordmark';
  const isLettermark = result.markType === 'lettermark';
  const lettermarkUsesInitials =
    isLettermark && result.companyName ? isMultiWordCompanyName(result.companyName) : false;

  const typographyTags = dedupeTags([
    ...(result.visualTraits?.typography ?? []).filter(
      (line) => !(isLettermark && !lettermarkUsesInitials && /\b(monogram|initials?)\b/i.test(line)),
    ),
    result.typography?.primaryRecommendation?.name ?? '',
    ...(result.visualTraits?.letterformStyle ?? []),
    ...(lettermarkUsesInitials ? result.letterDNA?.monogramOptions?.slice(0, 2) ?? [] : []),
    ...(lettermarkUsesInitials ? result.letterDNA?.ligatureOpportunities?.slice(0, 2) ?? [] : []),
  ]);

  const compositionTags = dedupeTags([
    result.markType ? `${result.markType} mark` : '',
    ...(result.visualTraits?.composition ?? []).filter((line) => {
      if (isWordmark && /monogram/i.test(line)) return false;
      if (isLettermark && !lettermarkUsesInitials && /\b(monogram|initials?)\b/i.test(line)) return false;
      return true;
    }),
    ...(result.typography?.constructionRules?.slice(0, 2) ?? []),
  ]);

  const brief = mergeBrief(
    current,
    {
      markType: (current.markType || result.markType) as DesignBrief['markType'],
      typographyStyle:
        current.typographyStyle === 'constructed' || current.typographyStyle === 'standard'
          ? current.typographyStyle
          : result.typographyStyle === 'constructed' || result.typographyStyle === 'standard'
            ? result.typographyStyle
            : current.typographyStyle,
      personality: result.personality ?? '',
      era,
      complexity: result.visualTraits?.complexity ?? '',
      primaryEmotion: result.psychologyProfile?.primaryEmotion ?? '',
      narrative: result.narrative ?? '',
      typography: joinTags(typographyTags),
      composition: joinTags(compositionTags),
      constraints: joinTags(result.constraints ?? []),
      principleIds: mergePrincipleIds(current.principleIds ?? [], result.principleIds ?? []),
    },
    'Brand DNA',
  );

  return {
    brief,
    inspirationMode: eraToInspiration(result.visualTraits?.era ?? ''),
    minimalismLevel: complexityToMinimalism(result.visualTraits?.complexity ?? 'minimal'),
  };
}

export function applyGeometryToBrief(
  current: DesignBrief,
  result: {
    recommendations?: Array<{ name: string; score: number; reason: string }>;
    selectedRecommendations?: Array<{ name: string; score?: number; reason: string }>;
    constructionGrid?: string;
    symmetryType?: string;
  },
): DesignBrief {
  const selected = result.selectedRecommendations
    ?? result.recommendations
    ?? [];
  if (selected.length === 0) return current;

  const shapeNames = joinTags(selected.map((r) => r.name));

  return mergeBrief(
    current,
    {
      preferredShapes: shapeNames,
      geometry: shapeNames,
      construction: [
        result.constructionGrid,
        result.symmetryType ? `${result.symmetryType} symmetry` : '',
      ]
        .filter(Boolean)
        .join(', '),
      narrative: selected
        .map((r) =>
          r.score != null ? `${r.name} (${r.score}/10): ${r.reason}` : `${r.name}: ${r.reason}`,
        )
        .join('. '),
      principleIds: mergePrincipleIds(
        current.principleIds ?? [],
        principleIdsFromShapeNames(selected.map((r) => r.name)),
      ),
    },
    'Geometry',
  );
}

export function applyKnowledgeGraphToBrief(
  current: DesignBrief,
  data: {
    clusters?: Array<{ name: string; nodeIds: string[] }>;
    edges?: Array<{ from: string; to: string; relation: string }>;
  },
): DesignBrief {
  const topClusters = data.clusters?.slice(0, 4).map((c) => `${c.name} (${c.nodeIds.length})`) ?? [];
  const worksWith = data.edges
    ?.filter((e) => e.relation === 'works_with')
    .slice(0, 5)
    .map((e) => `${e.from} + ${e.to}`) ?? [];

  return mergeBrief(
    current,
    {
      knowledgeInsights: [...topClusters, ...worksWith].join('; '),
      principleIds: mergePrincipleIds(
        current.principleIds ?? [],
        data.clusters?.flatMap((c) => c.nodeIds).slice(0, 12) ?? [],
      ),
    },
    'Knowledge Graph',
  );
}

export function applyPipelineToBrief(
  current: DesignBrief,
  result: {
    brandDNA?: Parameters<typeof applyBrandDNAToBrief>[1];
    typography?: { primaryRecommendation?: { name: string } };
    composition?: { recommendedLayout?: { name: string } };
    prompts?: { bestPrompt?: { text: string } };
    critique?: { overallScore?: number; modernismGrade?: string };
  },
): { brief: DesignBrief; inspirationMode: string; minimalismLevel: number } {
  const brand = applyBrandDNAToBrief(current, result.brandDNA ?? {});
  const brief = mergeBrief(
    brand.brief,
    {
      typography: result.typography?.primaryRecommendation?.name
        ? joinTags([brand.brief.typography, result.typography.primaryRecommendation.name])
        : brand.brief.typography,
      composition: result.composition?.recommendedLayout?.name
        ? joinTags([brand.brief.composition, result.composition.recommendedLayout.name])
        : brand.brief.composition,
      bestPromptHint: result.prompts?.bestPrompt?.text ?? '',
      critiqueNote: result.critique
        ? `${result.critique.overallScore}/10 — Grade ${result.critique.modernismGrade}`
        : '',
    },
    'Full Pipeline',
  );

  return { brief, inspirationMode: brand.inspirationMode, minimalismLevel: brand.minimalismLevel };
}
