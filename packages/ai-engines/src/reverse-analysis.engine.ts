import { designPrinciples, logoReferences } from '@logo-platform/knowledge-base';
import type { LogoDNA } from '@logo-platform/shared';

export interface ReverseAnalysisInput {
  description: string;
  observedShapes?: string[];
  observedColors?: number;
  observedStyle?: string;
}

export interface ReverseAnalysisResult {
  estimatedDNA: LogoDNA;
  matchedReferences: { id: string; name: string; similarity: number }[];
  matchedPrinciples: { id: string; name: string; confidence: number }[];
  eraEstimate: string;
  complexityEstimate: 'minimal' | 'medium' | 'high';
  constructionHypothesis: string[];
  modernismScore: number;
}

export function reverseAnalyzeLogo(input: ReverseAnalysisInput): ReverseAnalysisResult {
  const desc = input.description.toLowerCase();
  const shapes = input.observedShapes ?? extractShapes(desc);

  const matchedPrinciples = designPrinciples
    .map((p) => {
      let confidence = 0;
      if (desc.includes(p.name.toLowerCase())) confidence += 0.4;
      if (p.tags.some((t) => desc.includes(t))) confidence += 0.2;
      if (shapes.some((s) => p.tags.includes(s) || p.name.toLowerCase().includes(s))) confidence += 0.3;
      return { id: p.id, name: p.name, confidence };
    })
    .filter((p) => p.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 15);

  const matchedReferences = logoReferences
    .map((ref) => {
      let similarity = 0;
      if (input.observedStyle && ref.era.includes(input.observedStyle as never)) similarity += 0.3;
      if (shapes.some((s) => ref.geometry.includes(s) || ref.shape.includes(s))) similarity += 0.4;
      const principleOverlap = ref.principleIds.filter((id) =>
        matchedPrinciples.some((p) => p.id === id),
      ).length;
      similarity += principleOverlap * 0.1;
      return { id: ref.id, name: ref.name, similarity: Math.min(1, similarity) };
    })
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  const principleIds = matchedPrinciples.map((p) => p.id);
  const topRef = matchedReferences[0];

  const estimatedDNA: LogoDNA = {
    geometry: shapes.length ? shapes : ['circle'],
    construction: extractFromPrinciples(principleIds, 'construction'),
    balance: ['optical-balance'],
    complexity: input.observedColors && input.observedColors > 2 ? 'medium' : 'minimal',
    era: (topRef ? logoReferences.find((r) => r.id === topRef.id)?.era : 'swiss') ?? 'swiss',
    typography: extractFromPrinciples(principleIds, 'typography'),
    recognition: matchedReferences.length > 0 ? 8 : 5,
    minimalism: input.observedColors === 1 ? 9 : input.observedColors === 2 ? 7 : 5,
    visualWeight: ['medium'],
    harmony: ['geometric'],
  };

  return {
    estimatedDNA,
    matchedReferences,
    matchedPrinciples,
    eraEstimate: estimatedDNA.era.replace(/_/g, ' '),
    complexityEstimate: estimatedDNA.complexity,
    constructionHypothesis: buildHypothesis(shapes, matchedPrinciples),
    modernismScore: calculateModernismScore(matchedPrinciples, estimatedDNA),
  };
}

function extractShapes(desc: string): string[] {
  const shapeKeywords = ['circle', 'square', 'triangle', 'hexagon', 'cross', 'line', 'organic', 'diamond'];
  return shapeKeywords.filter((s) => desc.includes(s));
}

function extractFromPrinciples(ids: string[], category: string): string[] {
  return designPrinciples
    .filter((p) => ids.includes(p.id) && p.category === category)
    .map((p) => p.name)
    .slice(0, 3);
}

function buildHypothesis(shapes: string[], principles: { name: string }[]): string[] {
  const hypotheses: string[] = [];
  if (shapes.includes('circle')) hypotheses.push('Primary form derived from circular construction');
  if (principles.some((p) => p.name.includes('Grid'))) hypotheses.push('Built on modular grid system');
  if (principles.some((p) => p.name.includes('Negative'))) hypotheses.push('Negative space used for secondary symbolism');
  if (!hypotheses.length) hypotheses.push('Geometric construction with modernist simplification');
  return hypotheses;
}

function calculateModernismScore(
  principles: { confidence: number }[],
  dna: LogoDNA,
): number {
  let score = 5;
  score += principles.length * 0.3;
  if (dna.minimalism >= 7) score += 2;
  if (dna.complexity === 'minimal') score += 1.5;
  return Math.min(10, Math.round(score * 10) / 10);
}
