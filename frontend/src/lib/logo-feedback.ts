export const LOGO_RATING_LEVELS = [
  { stars: 1, score: 2, label: 'Poor' },
  { stars: 2, score: 4, label: 'Weak' },
  { stars: 3, score: 6, label: 'OK' },
  { stars: 4, score: 8, label: 'Good' },
  { stars: 5, score: 10, label: 'Excellent' },
] as const;

export const LOGO_WORKED_TAGS = ['Geometry', 'Typography', 'Color'] as const;
export const LOGO_MISSED_TAGS = ['Too literal', 'Too complex', 'Off-brand'] as const;

export function scoreToStars(score: number): number {
  const match = [...LOGO_RATING_LEVELS].reverse().find((level) => score >= level.score);
  return match?.stars ?? 0;
}

export function starsToScore(stars: number): (typeof LOGO_RATING_LEVELS)[number] {
  return LOGO_RATING_LEVELS.find((level) => level.stars === stars) ?? LOGO_RATING_LEVELS[2]!;
}
