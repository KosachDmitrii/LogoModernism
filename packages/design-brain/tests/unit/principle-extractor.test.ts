import { describe, expect, it } from 'vitest';
import {
  dedupePrinciples,
  parsePrinciples,
  rankFallback,
} from '../../src/ingest/principle-extractor';
import { PRINCIPLE_JSON_FIXTURE } from '../helpers/fixtures';

describe('principle-extractor (pure)', () => {
  it('parses valid principle JSON arrays', () => {
    const principles = parsePrinciples(PRINCIPLE_JSON_FIXTURE);
    expect(principles).toHaveLength(3);
    expect(principles[0]?.promptFragment).toBe('modular grid construction');
    expect(principles[0]?.confidence).toBe(0.9);
  });

  it('rejects malformed or incomplete principle objects', () => {
    const malformed = `[{"category":"geometry","ruleText":"x"}]`;
    expect(parsePrinciples(malformed)).toHaveLength(0);
    expect(parsePrinciples('not json at all')).toHaveLength(0);
  });

  it('deduplicates principles by normalized promptFragment', () => {
    const principles = parsePrinciples(PRINCIPLE_JSON_FIXTURE);
    const deduped = dedupePrinciples(principles);
    expect(deduped).toHaveLength(2);
    expect(deduped.map((p) => p.promptFragment)).toEqual([
      'modular grid construction',
      'flat vector rendering',
    ]);
  });

  it('rankFallback keeps highest-confidence unique principles up to MAX_SELECTED', () => {
    const candidates = Array.from({ length: 20 }, (_, i) => ({
      category: 'geometry',
      ruleText: `Rule ${i}`,
      promptFragment: `fragment-${i}`,
      confidence: i / 20,
    }));

    const ranked = rankFallback(candidates);
    expect(ranked.length).toBeLessThanOrEqual(15);
    expect(ranked[0]?.confidence).toBeGreaterThan(ranked[ranked.length - 1]?.confidence ?? 0);
  });
});
