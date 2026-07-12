import { describe, expect, it } from 'vitest';
import { toVectorLiteral } from '../../src/embedding/cosine';
import { deterministicEmbedding, cosineSimilarity } from '../helpers/embeddings';
import { SAMPLE_MASCOT_TEXT, SAMPLE_SWISS_TEXT } from '../helpers/fixtures';

describe('embeddings (pure)', () => {
  it('serializes vectors for pgvector SQL literals', () => {
    const literal = toVectorLiteral([1, 2, 3]);
    expect(literal).toBe('[1,2,3]');
  });

  it('produces deterministic embeddings for the same text', () => {
    const first = deterministicEmbedding('Swiss grid typography');
    const second = deterministicEmbedding('Swiss grid typography');
    expect(first).toEqual(second);
    expect(first).toHaveLength(1536);
  });

  it('ranks semantically related text higher than unrelated text', () => {
    const query = deterministicEmbedding('Swiss International Typographic Style modular grid');
    const swiss = deterministicEmbedding(SAMPLE_SWISS_TEXT);
    const mascot = deterministicEmbedding(SAMPLE_MASCOT_TEXT);

    expect(cosineSimilarity(query, swiss)).toBeGreaterThan(cosineSimilarity(query, mascot));
  });
});
