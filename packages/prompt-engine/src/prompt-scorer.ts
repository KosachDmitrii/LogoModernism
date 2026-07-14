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
  const positiveBody = extractPositiveBody(lower);
  const categories = new Set(principles.map((p) => p.category));
  const structuredCompiler = isCompilerStructuredPrompt(text);
  const labPenalty = compositionLabPenalty(lower);
  const compilerPenalties = structuredCompiler ? scoreCompilerPenalties(lower) : null;

  const modernismScore = structuredCompiler
    ? scoreCompilerModernism(lower, compilerPenalties!)
    : clamp(
        scoreCategoryPresence(categories, ['era', 'construction', 'composition', 'geometry']) * 10 +
          countMatches(positiveBody, [
            'modernist',
            'swiss',
            'bauhaus',
            'corporate identity',
            'international',
            'international typographic',
          ]) * 2,
      );

  const swissScore = clamp(
    principles.filter((p) => p.era?.includes('swiss') || p.tags.includes('swiss')).length * 2 +
      countMatches(positiveBody, [
        'swiss',
        'helvetica',
        'international style',
        'international typographic',
        'grid',
        'neo-grotesque',
      ]) * 2.5 -
      labPenalty * 0.5,
  );

  const minimalismScore = structuredCompiler
    ? scoreCompilerMinimalism(lower, dna, compilerPenalties!, labPenalty)
    : clamp(
        (dna.minimalism ?? 5) +
          countMatches(positiveBody, ['minimal', 'simple', 'reductive', 'clean', 'negative space']) * 1.5 -
          countNegativeFeatureMatches(positiveBody, ['complex', 'detailed', 'ornate', 'gradient', 'shadow']) * 2 -
          labPenalty * 0.8,
      );

  const geometryScore = clamp(
    principles.filter((p) => p.category === 'geometry' || p.category === 'construction').length * 2.5 +
      countMatches(positiveBody, ['geometric', 'grid', 'circle', 'square', 'triangle', 'modular']) * 1.5 -
      labPenalty,
  );

  const targetLength = structuredCompiler ? 950 : 200;
  const lengthTolerance = structuredCompiler ? 120 : 40;
  const readabilityScore = clamp(
    10 -
      Math.abs(text.length - targetLength) / lengthTolerance +
      (categories.has('typography') ? 1 : 0) -
      labPenalty * 1.2,
  );

  const scalabilityScore = clamp(
    countMatches(positiveBody, ['vector', 'flat', 'scalable', 'no gradient', 'no shadow', 'single color']) * 2 +
      (categories.has('rendering') ? 2 : 0),
  );

  const brandRecognitionScore = clamp(
    dna.recognition +
      countMatches(positiveBody, ['iconic', 'memorable', 'distinctive', 'monogram', 'symbol']) * 1.5 +
      principles.filter((p) => p.category === 'mark_type').length,
  );

  const cohesionScore = clamp(scoreCohesion(positiveBody) - labPenalty * 1.5);

  const identityScore = clamp(
    scoreIdentity(positiveBody) +
      countMatches(positiveBody, ['custom wordmark', 'modified glyph', 'helvetica-style']) * 1,
  );

  const characterBoost = scoreCharacter(positiveBody);
  const adjustedBrandRecognition = clamp((brandRecognitionScore + characterBoost) / 2);

  const literalPenalty = countLiteralIndustryTerms(positiveBody) * 1.2;
  const abstractBoost = Math.min(3, countAbstractFormTerms(positiveBody) * 0.6);

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
      literalPenalty -
      labPenalty) /
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

function isCompilerStructuredPrompt(text: string): boolean {
  return /(?:creative direction|geometry vocabulary|industry direction for):/i.test(text);
}

function extractPositiveBody(text: string): string {
  const avoidIndex = text.search(/\bavoid:/i);
  return avoidIndex >= 0 ? text.slice(0, avoidIndex) : text;
}

function scoreCompilerModernism(
  text: string,
  penalties: CompilerPenalties,
): number {
  let score = 0;
  if (/era:\s*/i.test(text)) score += 2;
  if (/construction:/i.test(text)) score += 1.5;
  if (/geometry vocabulary:/i.test(text)) score += 1.5;
  if (/composition:/i.test(text)) score += 1;
  if (/rendering:/i.test(text) && /flat vector/i.test(text) && /no gradients/i.test(text)) score += 1.5;
  if (/creative direction:/i.test(text)) score += 0.5;
  score +=
    countMatches(text, [
      'international typographic',
      'international style',
      'bauhaus',
      'swiss',
      'modernist',
      'corporate identity',
    ]) * 1;

  if (/crafted from modular geometric forms/i.test(text)) score -= 0.5;
  if (/geometry vocabulary:.*\b(circle|square|triangle)\b/i.test(text)) score += 0.5;

  const deduction = Math.min(
    3,
    penalties.bloat * 0.4 +
      penalties.contradiction * 0.85 +
      penalties.literalIndustry * 0.5 +
      penalties.length * 0.3 +
      penalties.noise,
  );
  score -= deduction;

  if (
    /era:/i.test(text) &&
    /international typographic/i.test(text) &&
    /flat vector/i.test(text)
  ) {
    score = Math.max(score, 5.5);
  }

  return clamp(score);
}

interface CompilerPenalties {
  bloat: number;
  contradiction: number;
  literalIndustry: number;
  length: number;
  noise: number;
}

function scoreCompilerPenalties(text: string): CompilerPenalties {
  const positive = extractPositiveBody(text);
  let bloat = 0;
  let contradiction = 0;
  let literalIndustry = 0;
  let noise = 0;

  if (/prior direction:/i.test(positive)) bloat += 1;
  if (/design principles:/i.test(positive)) {
    const fragmentCount = (positive.match(/design principles:\s*([^.]+)/i)?.[1]?.split(',') ?? []).length;
    bloat += Math.min(1.5, 0.5 + Math.max(0, fragmentCount - 2) * 0.35);
  }
  if (/industry direction for/i.test(positive)) bloat += 0.35;

  if (
    /\bwordmark\b/i.test(positive) &&
    /combination lockup|symbol and wordmark/i.test(positive)
  ) {
    contradiction += 1.5;
  }

  if (/industry direction for/i.test(positive)) {
    if (countMatches(positive, ['pixel', 'chip', 'data stream', 'stream curves', 'cluster mark']) > 0) {
      literalIndustry += 0.75;
    }
  }

  if (countMatches(positive, ['generated logo', 'successful generation', 'prompt:']) > 0) {
    noise += 1.5;
  }

  const lengthPenalty = positive.length > 1100 ? Math.min(1.25, (positive.length - 1100) / 500) : 0;

  return {
    bloat,
    contradiction,
    literalIndustry,
    length: lengthPenalty,
    noise,
  };
}

function scoreCompilerMinimalism(
  text: string,
  dna: LogoDNA,
  penalties: CompilerPenalties,
  labPenalty: number,
): number {
  const positive = extractPositiveBody(text);
  let score = 4;

  if (/ultra minimal/i.test(positive)) score += 2;
  else if (/radically simplified/i.test(positive)) score += 1.5;
  else if (/moderate complexity/i.test(positive)) score -= 1;

  if (/strict black and white only/i.test(positive)) score += 1;
  if (/no shadows/i.test(positive) && /no gradients/i.test(positive)) score += 0.75;

  const sliderBoost = Math.max(0, ((dna.minimalism ?? 5) - 5) * 0.25);
  score += sliderBoost;

  if (positive.length <= 900) score += 1.5;
  else if (positive.length <= 1050) score += 0.5;
  else if (positive.length > 1200) score -= 1.5;
  else if (positive.length > 1000) score -= 0.75;

  if (/composition:\s*(symmetry|negative space)\b/i.test(positive)) score += 0.5;
  if (/crafted from modular geometric forms/i.test(positive)) score -= 0.35;

  const deduction = Math.min(
    3.2,
    penalties.bloat * 0.65 +
      penalties.contradiction * 0.55 +
      penalties.literalIndustry * 0.4 +
      penalties.length * 0.45 +
      penalties.noise * 0.85,
  );
  score -= deduction;
  score -= labPenalty * 0.35;

  if (/ultra minimal/i.test(positive) && /strict black and white only/i.test(positive)) {
    score = Math.max(score, 4.5);
  } else if (/radically simplified/i.test(positive) && /strict black and white only/i.test(positive)) {
    score = Math.max(score, 4.5);
  }

  return clamp(score);
}

function compositionLabPenalty(text: string): number {
  let penalty = 0;
  if (/tracking\s*[+-]?\d+/i.test(text)) penalty += 1.5;
  if (/\b(?:medium to bold|bold to black|tagline:\s*regular)\b/i.test(text)) penalty += 1;
  if (/\bx-height across weights\b/i.test(text)) penalty += 0.8;
  return penalty;
}

function scoreCategoryPresence(categories: Set<string>, required: string[]): number {
  return (required.filter((c) => categories.has(c as never)).length / required.length) * 5;
}

function countNegativeFeatureMatches(text: string, terms: string[]): number {
  return terms.filter((term) => {
    if (new RegExp(`\\bno\\s+${term}s?\\b`, 'i').test(text)) return false;
    if (term === 'complex' && /\bminimal complexity\b/i.test(text)) return false;
    return text.includes(term);
  }).length;
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
