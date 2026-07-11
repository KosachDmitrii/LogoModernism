import { describe, expect, it } from 'vitest';
import { normalizeStructuredFeedback } from '../../src/learning/structured-feedback';
import { sampleFeedback } from '../helpers/fixtures';

describe('normalizeStructuredFeedback', () => {
  it('preserves valid worked and missed tags', () => {
    const result = normalizeStructuredFeedback(sampleFeedback());
    expect(result.workedTags).toEqual(['geometry', 'typography']);
    expect(result.missedTags).toEqual([]);
  });

  it('infers scalability tag from context on dislike', () => {
    const result = normalizeStructuredFeedback(
      sampleFeedback({
        signalType: 'DISLIKE',
        context: 'Logo breaks down at 16px small size — poor scalability',
        metadata: {},
      }),
    );
    expect(result.missedTags).toContain('scalability');
  });

  it('filters unknown tags', () => {
    const result = normalizeStructuredFeedback(
      sampleFeedback({
        metadata: { workedTags: ['geometry', 'not_a_real_tag'], missedTags: ['brief_fit'] },
      }),
    );
    expect(result.workedTags).toEqual(['geometry']);
    expect(result.missedTags).toEqual(['brief_fit']);
  });
});
