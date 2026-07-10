import { describe, expect, it } from 'vitest';
import { parseDecisionJson } from '../../src/reasoning/brain-reasoning';
import { VALID_DECISION_JSON } from '../helpers/fixtures';

describe('brain-reasoning (pure)', () => {
  it('parses valid LLM decision JSON', () => {
    const decision = parseDecisionJson(VALID_DECISION_JSON);
    expect(decision).not.toBeNull();
    expect(decision?.markType).toBe('wordmark');
    expect(decision?.geometry).toContain('circle');
    expect(decision?.antiPatterns).toContain('gradients');
    expect(decision?.confidence).toBeCloseTo(0.82);
  });

  it('forces combination mark for symbol-only mode when LLM returns wordmark', () => {
    const json = VALID_DECISION_JSON.replace('"wordmark"', '"wordmark"');
    const decision = parseDecisionJson(json, true);
    expect(decision?.markType).toBe('combination');
    expect(decision?.typography).toEqual([]);
  });

  it('returns null for invalid decision payloads', () => {
    expect(parseDecisionJson('{}')).toBeNull();
    expect(parseDecisionJson('{"markType":"invalid"}')).toBeNull();
    expect(parseDecisionJson('')).toBeNull();
  });
});
