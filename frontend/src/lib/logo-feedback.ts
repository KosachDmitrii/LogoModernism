import type { MessageKey } from '../i18n';

export const LOGO_RATING_LEVELS = [
  { stars: 1, score: 2, labelKey: 'feedback.rating.poor' as MessageKey },
  { stars: 2, score: 4, labelKey: 'feedback.rating.weak' as MessageKey },
  { stars: 3, score: 6, labelKey: 'feedback.rating.ok' as MessageKey },
  { stars: 4, score: 8, labelKey: 'feedback.rating.good' as MessageKey },
  { stars: 5, score: 10, labelKey: 'feedback.rating.excellent' as MessageKey },
] as const;

export const LOGO_WORKED_TAGS = ['Geometry', 'Typography', 'Color'] as const;
export const LOGO_MISSED_TAGS = ['Too literal', 'Too complex', 'Off-brand'] as const;

export const LOGO_WORKED_TAG_KEYS: Record<(typeof LOGO_WORKED_TAGS)[number], MessageKey> = {
  Geometry: 'feedback.tag.geometry',
  Typography: 'feedback.tag.typography',
  Color: 'feedback.tag.color',
};

export const LOGO_MISSED_TAG_KEYS: Record<(typeof LOGO_MISSED_TAGS)[number], MessageKey> = {
  'Too literal': 'feedback.tag.tooLiteral',
  'Too complex': 'feedback.tag.tooComplex',
  'Off-brand': 'feedback.tag.offBrand',
};

export function scoreToStars(score?: number): number {
  if (score === undefined) return 0;
  const match = [...LOGO_RATING_LEVELS].reverse().find((level) => score >= level.score);
  return match?.stars ?? 0;
}

export function starsToScore(stars: number): (typeof LOGO_RATING_LEVELS)[number] {
  return LOGO_RATING_LEVELS.find((level) => level.stars === stars) ?? LOGO_RATING_LEVELS[2]!;
}
