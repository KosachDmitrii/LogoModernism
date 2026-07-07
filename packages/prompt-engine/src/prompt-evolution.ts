import type { ComposedPrompt, DesignCriticResult, EvolutionMutation, LogoDNA } from '@logo-platform/shared';
import { getPrincipleById } from '@logo-platform/knowledge-base';
import { selectDesignRules } from './design-rules-engine';
import { composePrompt } from './prompt-composer';

const MUTATION_FIELDS: Array<{
  field: EvolutionMutation['field'];
  alternatives: string[];
}> = [
  { field: 'geometry', alternatives: ['geo-circle', 'geo-square', 'geo-triangle', 'geo-hexagon', 'geo-organic-round'] },
  { field: 'grid', alternatives: ['con-modular-grid', 'con-radial-grid', 'grid-8-unit', 'con-golden-ratio'] },
  { field: 'stroke', alternatives: ['stroke-single-stroke', 'stroke-equal-width-lines', 'stroke-bold-stroke', 'stroke-continuous-line'] },
  { field: 'shape', alternatives: ['mark-abstract-symbol', 'mark-pictogram', 'mark-monogram', 'mark-wordmark'] },
];

export function evolvePrompt(
  weakPrompt: ComposedPrompt,
  maxAttempts = 3,
): ComposedPrompt[] {
  const evolved: ComposedPrompt[] = [];
  const qualityThreshold = 7.5;

  if (weakPrompt.scores.promptQuality >= qualityThreshold) {
    return [weakPrompt];
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const mutations = suggestMutations(weakPrompt);
    const seed = (weakPrompt.metadata.variationIndex ?? 0) + attempt + 100;

    const selection = selectDesignRules({
      industry: weakPrompt.industry,
      preferredEra: weakPrompt.dna.era,
      minimalismLevel: Math.min(10, weakPrompt.dna.minimalism + 1),
      variationSeed: seed,
    });

    for (const mutation of mutations) {
      const altId = mutation.to[0];
      const altRule = getPrincipleById(altId);
      if (altRule && !selection.principles.find((p) => p.id === altId)) {
        selection.principles = [
          ...selection.principles.filter((p) => !mutation.from.includes(p.name)),
          altRule,
        ];
      }
    }

    const newPrompt = composePrompt({
      industry: weakPrompt.industry,
      principles: selection.principles,
      dna: selection.dna,
      variationIndex: seed,
    });

    evolved.push(newPrompt);
  }

  return evolved.sort((a, b) => b.scores.promptQuality - a.scores.promptQuality);
}

export function suggestMutations(prompt: ComposedPrompt): EvolutionMutation[] {
  const mutations: EvolutionMutation[] = [];
  const scores = prompt.scores;

  if (scores.geometryScore < 6) {
    mutations.push({
      field: 'geometry',
      from: prompt.dna.geometry,
      to: ['geo-hexagon'],
      reason: 'Low geometry score — try stronger geometric foundation',
    });
  }

  if (scores.minimalismScore < 6) {
    mutations.push({
      field: 'complexity',
      from: [prompt.dna.complexity],
      to: ['cx-high-simplicity'],
      reason: 'Increase minimalism through radical simplification',
    });
  }

  if (scores.brandRecognitionScore < 6) {
    mutations.push({
      field: 'shape',
      from: [],
      to: ['mark-iconic-symbol'],
      reason: 'Strengthen iconic recognition',
    });
  }

  if (scores.swissScore < 5) {
    mutations.push({
      field: 'era',
      from: [prompt.dna.era],
      to: ['era-swiss'],
      reason: 'Apply Swiss modernist principles',
    });
  }

  const randomMutation = MUTATION_FIELDS[Math.floor(Math.random() * MUTATION_FIELDS.length)];
  mutations.push({
    field: randomMutation.field,
    from: [],
    to: [randomMutation.alternatives[Math.floor(Math.random() * randomMutation.alternatives.length)]],
    reason: 'Exploratory variation',
  });

  return mutations;
}

export function critiqueDesign(prompt: ComposedPrompt): DesignCriticResult {
  const s = prompt.scores;
  const feedback: string[] = [];

  if (s.scalabilityScore < 7) feedback.push('Add flat vector constraints for better scalability');
  if (s.minimalismScore < 7) feedback.push('Reduce visual complexity for timeless appeal');
  if (s.brandRecognitionScore < 7) feedback.push('Strengthen distinctive mark type or monogram');
  if (s.geometryScore < 7) feedback.push('Define clearer geometric construction system');
  if (s.readabilityScore < 6) feedback.push('Balance prompt length for model clarity');

  const overallScore =
    s.brandRecognitionScore +
    s.scalabilityScore +
    s.readabilityScore +
    s.minimalismScore +
    s.modernismScore;

  return {
    recognizability: s.brandRecognitionScore,
    scalability: s.scalabilityScore,
    balance: prompt.dna.visualWeight.length > 0 ? 8 : 6,
    contrast: prompt.selectedPrinciples.some((p) => p.id.includes('contrast')) ? 9 : 7,
    simplicity: s.minimalismScore,
    modernity: s.modernismScore,
    registrability: s.minimalismScore > 7 && s.geometryScore > 6 ? 8 : 6,
    overallScore: Math.round((overallScore / 6) * 10) / 10,
    feedback,
    suggestedMutations: suggestMutations(prompt),
  };
}
