import { GEOMETRY_PRIMITIVES, getPrimitiveById } from './geometry-primitives';
import { searchPrinciples } from '@logo-platform/knowledge-base';

export interface GeometryAnalysisInput {
  industry: string;
  preferredShapes?: string[];
  complexity?: 'minimal' | 'medium' | 'high';
}

export interface GeometryRecommendation {
  primitiveId: string;
  name: string;
  score: number;
  reason: string;
  constructionSystem: string[];
  svgPreview: string;
}

export interface GeometryIntelligenceResult {
  recommendations: GeometryRecommendation[];
  constructionGrid: string;
  symmetryType: string;
  moduleSize: string;
  compatiblePrimitives: string[][];
}

export function analyzeGeometry(input: GeometryAnalysisInput): GeometryIntelligenceResult {
  const principles = searchPrinciples({ industry: input.industry, category: 'geometry' });
  const principleTags = new Set(principles.flatMap((p) => p.tags));

  const recommendations: GeometryRecommendation[] = GEOMETRY_PRIMITIVES.map((prim) => {
    let score = 5;
    const reasons: string[] = [];

    for (const tag of prim.psychologyTags) {
      if (principleTags.has(tag) || input.industry.toLowerCase().includes(tag)) {
        score += 2;
        reasons.push(`Aligns with ${tag} for ${input.industry}`);
      }
    }

    if (input.preferredShapes?.some((s) => prim.name.toLowerCase().includes(s.toLowerCase()))) {
      score += 3;
      reasons.push('Matches preferred shape');
    }

    if (input.complexity === 'minimal' && prim.category !== 'compound') score += 1;
    if (input.complexity === 'high' && prim.category === 'compound') score += 2;

    return {
      primitiveId: prim.id,
      name: prim.name,
      score: Math.min(10, score),
      reason: reasons.join('; ') || 'General geometric foundation',
      constructionSystem: prim.constructionSteps,
      svgPreview: prim.svgPath,
    };
  }).sort((a, b) => b.score - a.score);

  const top = recommendations[0];
  const topPrim = getPrimitiveById(top.primitiveId);

  return {
    recommendations: recommendations.slice(0, 6),
    constructionGrid: topPrim?.gridAlignment[0] ?? 'modular-grid',
    symmetryType: top.score >= 8 ? 'bilateral' : 'radial',
    moduleSize: input.complexity === 'minimal' ? '8-unit grid' : '12-unit grid',
    compatiblePrimitives: topPrim
      ? topPrim.compatibleWith.map((id) => [top.primitiveId, id])
      : [],
  };
}
