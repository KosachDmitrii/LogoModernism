import type { DesignRule, LogoDNA, PromptScores } from '@logo-platform/shared';
import {
  scoreCharacter,
  scoreCohesion,
  scoreIdentity,
  countLiteralIndustryTerms,
  countAbstractFormTerms,
} from '@logo-platform/shared';

export function scorePrompt(text: string, principles: DesignRule[], dna: LogoDNA): PromptScores {
  const lower = text.toLowerCase();
  const categories = new Set(principles.map((p) => p.category));

  const modernismScore = clamp(
    scoreCategoryPresence(categories, ['era', 'construction', 'composition', 'geometry']) * 10 +
      countMatches(lower, ['modernist', 'swiss', 'bauhaus', 'corporate identity', 'international']) * 2,
  );

  const swissScore = clamp(
    principles.filter((p) => p.era?.includes('swiss') || p.tags.includes('swiss')).length * 2 +
      countMatches(lower, ['swiss', 'helvetica', 'international style', 'grid']) * 2.5,
  );

  const minimalismScore = clamp(
    (dna.minimalism ?? 5) +
      countMatches(lower, ['minimal', 'simple', 'reductive', 'clean', 'negative space']) * 1.5 -
      countMatches(lower, ['complex', 'detailed', 'ornate', 'gradient', 'shadow']) * 2,
  );

  const geometryScore = clamp(
    principles.filter((p) => p.category === 'geometry' || p.category === 'construction').length * 2.5 +
      countMatches(lower, ['geometric', 'grid', 'circle', 'square', 'triangle', 'modular']) * 1.5,
  );

  const readabilityScore = clamp(
    10 - Math.abs(text.length - 200) / 40 + (categories.has('typography') ? 1 : 0),
  );

  const scalabilityScore = clamp(
    countMatches(lower, ['vector', 'flat', 'scalable', 'no gradient', 'no shadow', 'single color']) * 2 +
      (categories.has('rendering') ? 2 : 0),
  );

  const brandRecognitionScore = clamp(
    dna.recognition +
      countMatches(lower, ['iconic', 'memorable', 'distinctive', 'monogram', 'symbol']) * 1.5 +
      principles.filter((p) => p.category === 'mark_type').length,
  );

  const cohesionScore = clamp(
    scoreCohesion(lower) +
      countMatches(lower, ['vertical lockup', 'symbol and wordmark', 'typographic lockup']) * 1.2,
  );

  const identityScore = clamp(
    scoreIdentity(lower) +
      countMatches(lower, ['custom wordmark', 'modified glyph', 'helvetica-style']) * 1,
  );

  const characterBoost = scoreCharacter(lower);
  const adjustedBrandRecognition = clamp((brandRecognitionScore + characterBoost) / 2);

  const literalPenalty = countLiteralIndustryTerms(lower) * 1.2;
  const abstractBoost = Math.min(3, countAbstractFormTerms(lower) * 0.6);

  const promptQuality = clamp(
    (modernismScore +
      swissScore +
      minimalismScore +
      geometryScore +
      readabilityScore +
      scalabilityScore +
      adjustedBrandRecognition +
      cohesionScore +
      identityScore +
      abstractBoost -
      literalPenalty) /
      9,
  );

  return {
    modernismScore: round(modernismScore),
    swissScore: round(swissScore),
    minimalismScore: round(minimalismScore),
    geometryScore: round(geometryScore),
    readabilityScore: round(readabilityScore),
    scalabilityScore: round(scalabilityScore),
    brandRecognitionScore: round(adjustedBrandRecognition),
    cohesionScore: round(cohesionScore),
    identityScore: round(identityScore),
    promptQuality: round(promptQuality),
  };
}

function scoreCategoryPresence(categories: Set<string>, required: string[]): number {
  return required.filter((c) => categories.has(c as never)).length / required.length * 5;
}

function countMatches(text: string, terms: string[]): number {
  return terms.filter((t) => text.includes(t)).length;
}

function clamp(n: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
