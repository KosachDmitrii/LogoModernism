import { describe, expect, it } from 'vitest';
import {
  normalizeStructuredFeedback,
  sanitizeTasteMetadata,
} from '../../src/learning/structured-feedback';
import { sanitizeFeedbackContext } from '../../src/ingest/ingest-feedback';
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

  it('removes image payloads and bounds arbitrary metadata', () => {
    const result = sanitizeTasteMetadata({
      imageUrl: `data:image/png;base64,${'x'.repeat(20_000)}`,
      nested: { dataUrl: 'data:image/png;base64,abc', note: 'kept' },
      context: 'x'.repeat(10_000),
    });

    expect(result.imageUrl).toBeUndefined();
    expect(result.nested).toEqual({ note: 'kept' });
    expect(result.context).toHaveLength(4_000);
  });

  it('removes embedded image data from feedback context', () => {
    expect(
      sanitizeFeedbackContext('Useful logo feedback\nImage: data:image/png;base64,abc123'),
    ).toBe('Useful logo feedback\nImage:');
    expect(sanitizeFeedbackContext('x'.repeat(5_000))).toHaveLength(4_000);
  });
});
