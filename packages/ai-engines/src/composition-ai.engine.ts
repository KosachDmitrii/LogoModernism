import { searchPrinciples } from '@logo-platform/knowledge-base';

export interface CompositionInput {
  markType: 'symbol' | 'wordmark' | 'combination' | 'emblem';
  industry: string;
  elementCount?: number;
  hasNegativeSpace?: boolean;
}

export interface CompositionLayout {
  id: string;
  name: string;
  description: string;
  alignment: string;
  spacing: string;
  balance: string;
  score: number;
  principleIds: string[];
}

export interface CompositionAIResult {
  recommendedLayout: CompositionLayout;
  alternatives: CompositionLayout[];
  goldenRatioApplied: boolean;
  negativeSpaceStrategy?: string;
  visualHierarchy: string[];
}

const LAYOUTS: CompositionLayout[] = [
  {
    id: 'comp-centered',
    name: 'Centered Symmetry',
    description: 'Mark centered with bilateral symmetry',
    alignment: 'center',
    spacing: 'equal margins',
    balance: 'static equilibrium',
    score: 8,
    principleIds: ['comp-symmetry', 'comp-centered'],
  },
  {
    id: 'comp-negative-space',
    name: 'Negative Space Figure-Ground',
    description: 'Hidden form revealed through counter-space',
    alignment: 'optical center',
    spacing: 'tight integration',
    balance: 'figure-ground tension',
    score: 9,
    principleIds: ['comp-negative-space', 'comp-figure-ground'],
  },
  {
    id: 'comp-horizontal-lockup',
    name: 'Horizontal Lockup',
    description: 'Symbol left, wordmark right',
    alignment: 'baseline aligned',
    spacing: '1x cap height gap',
    balance: 'horizontal weight distribution',
    score: 7,
    principleIds: ['comp-horizontal', 'typ-wordmark'],
  },
  {
    id: 'comp-stacked',
    name: 'Stacked Lockup',
    description: 'Symbol above wordmark',
    alignment: 'center stacked',
    spacing: '0.5x cap height gap',
    balance: 'vertical hierarchy',
    score: 7,
    principleIds: ['comp-stacked', 'comp-vertical'],
  },
  {
    id: 'comp-dynamic-tension',
    name: 'Dynamic Tension',
    description: 'Asymmetric balance with directional energy',
    alignment: 'off-center optical',
    spacing: 'variable rhythm',
    balance: 'dynamic equilibrium',
    score: 6,
    principleIds: ['comp-dynamic-tension', 'comp-asymmetric'],
  },
  {
    id: 'comp-overlay',
    name: 'Overlay Composition',
    description: 'Intersecting elements creating new forms',
    alignment: 'shared center point',
    spacing: 'overlapping modules',
    balance: 'integrated whole',
    score: 7,
    principleIds: ['comp-overlay', 'comp-integration'],
  },
];

export function analyzeComposition(input: CompositionInput): CompositionAIResult {
  const principles = searchPrinciples({ industry: input.industry, category: 'composition' });
  const principleIds = new Set(principles.map((p) => p.id));

  const scored = LAYOUTS.map((layout) => {
    let score = layout.score;
    const matchCount = layout.principleIds.filter((id) => principleIds.has(id)).length;
    score += matchCount * 1.5;

    if (input.markType === 'wordmark' && layout.id === 'comp-horizontal-lockup') score += 2;
    if (input.markType === 'symbol' && layout.id === 'comp-centered') score += 2;
    if (input.hasNegativeSpace && layout.id === 'comp-negative-space') score += 3;
    if (input.elementCount && input.elementCount > 2 && layout.id === 'comp-overlay') score += 2;

    return { ...layout, score: Math.min(10, score) };
  }).sort((a, b) => b.score - a.score);

  const recommended = scored[0];

  return {
    recommendedLayout: recommended,
    alternatives: scored.slice(1, 4),
    goldenRatioApplied: recommended.score >= 8,
    negativeSpaceStrategy: input.hasNegativeSpace
      ? 'Exploit counter-forms for secondary meaning'
      : undefined,
    visualHierarchy: buildHierarchy(input.markType),
  };
}

function buildHierarchy(markType: CompositionInput['markType']): string[] {
  const base = ['Primary mark draws eye first', 'Secondary text supports recognition'];
  if (markType === 'combination') return [...base, 'Symbol and wordmark equal weight at large scale', 'Symbol dominates at small scale'];
  if (markType === 'wordmark') return ['Typography is the sole recognition element', 'Letterform distinctiveness is critical'];
  if (markType === 'emblem') return [...base, 'Contained within boundary shape', 'Works as stamp or seal'];
  return [...base, 'Symbol must work standalone without text'];
}
