import { describe, expect, it } from 'vitest';
import { normalizeTasteScore } from '../../src/learning/taste-profile';

describe('normalizeTasteScore', () => {
  it.each([
    [6, 6],
    [10, 10],
    [50, 5],
    [80, 8],
    [100, 10],
    [120, 10],
    [-2, 0],
  ])('normalizes %s to the 0–10 scale', (input, expected) => {
    expect(normalizeTasteScore(input)).toBe(expected);
  });
});
