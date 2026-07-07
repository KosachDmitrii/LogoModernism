import type { DesignBrief } from '../types';
import { complexityToMinimalism, eraToInspiration, joinTags } from './brief-mappers';

type BriefPatch = Partial<DesignBrief>;

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
    personality?: string;
    narrative?: string;
    visualTraits?: {
      era?: string;
      complexity?: string;
      geometry?: string[];
      construction?: string[];
      composition?: string[];
      typography?: string[];
    };
    psychologyProfile?: { primaryEmotion?: string };
    constraints?: string[];
  },
): { brief: DesignBrief; inspirationMode: string; minimalismLevel: number } {
  const era = result.visualTraits?.era?.replace(/_/g, ' ') ?? '';
  const brief = mergeBrief(
    current,
    {
      personality: result.personality ?? '',
      era,
      complexity: result.visualTraits?.complexity ?? '',
      primaryEmotion: result.psychologyProfile?.primaryEmotion ?? '',
      narrative: result.narrative ?? '',
      geometry: joinTags(result.visualTraits?.geometry ?? []),
      construction: joinTags(result.visualTraits?.construction ?? []),
      composition: joinTags(result.visualTraits?.composition ?? []),
      typography: joinTags(result.visualTraits?.typography ?? []),
      constraints: joinTags(result.constraints ?? []),
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
    constructionGrid?: string;
  },
): DesignBrief {
  const top = result.recommendations?.slice(0, 3) ?? [];
  return mergeBrief(
    current,
    {
      preferredShapes: joinTags(top.map((r) => r.name)),
      geometry: joinTags(top.map((r) => r.name)),
      construction: result.constructionGrid ?? current.construction,
      narrative: top.map((r) => `${r.name} (${r.score}/10): ${r.reason}`).join('. '),
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
    },
    'Knowledge Graph',
  );
}

export function applyPipelineToBrief(
  current: DesignBrief,
  result: {
    brandDNA?: {
      personality?: string;
      narrative?: string;
      visualTraits?: {
        era?: string;
        complexity?: string;
        geometry?: string[];
        construction?: string[];
      };
      psychologyProfile?: { primaryEmotion?: string };
      constraints?: string[];
    };
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
      typography: result.typography?.primaryRecommendation?.name ?? '',
      composition: result.composition?.recommendedLayout?.name ?? '',
      bestPromptHint: result.prompts?.bestPrompt?.text ?? '',
      critiqueNote: result.critique
        ? `${result.critique.overallScore}/10 — Grade ${result.critique.modernismGrade}`
        : '',
    },
    'Full Pipeline',
  );

  return { brief, inspirationMode: brand.inspirationMode, minimalismLevel: brand.minimalismLevel };
}
