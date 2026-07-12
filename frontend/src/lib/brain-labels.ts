/** Turn brain-internal tokens (snake_case, jargon) into readable UI labels. */
export function formatBrainLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export const PRINCIPLE_MAX_WEIGHT = 3;

export type PrincipleInfluenceLevel = 'weak' | 'moderate' | 'strong' | 'veryStrong';

/** Maps backend weight (0.1–3) to a human-readable influence tier. */
export function getPrincipleInfluenceLevel(weight: number): PrincipleInfluenceLevel {
  if (weight < 1.2) return 'weak';
  if (weight < 1.8) return 'moderate';
  if (weight < 2.4) return 'strong';
  return 'veryStrong';
}
