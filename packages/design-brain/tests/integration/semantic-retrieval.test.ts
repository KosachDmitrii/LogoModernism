import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { semanticSearch, getRelatedExperiences } from '../../src/retrieval/semantic-search';
import {
  createTestDatabase,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { deterministicEmbedding } from '../helpers/embeddings';
import { SAMPLE_MASCOT_TEXT, SAMPLE_SWISS_TEXT } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('semantic retrieval (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('retrieves Swiss-related experience ahead of unrelated mascot content', async () => {
    const swiss = await seedExperienceWithEmbedding(database, {
      title: 'Swiss Grid Typography',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'PDF',
    });
    await seedExperienceWithEmbedding(database, {
      title: 'Mascot Playbook',
      content: SAMPLE_MASCOT_TEXT,
      sourceType: 'PDF',
    });

    const result = await semanticSearch(database, {
      query: 'Swiss International Typographic Style modular grid Helvetica',
      limit: 2,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.results[0]?.id).toBe(swiss.id);
    expect(result.results[0]?.similarity).toBeGreaterThan(result.results[1]?.similarity ?? 0);
  });

  it('filters retrieval by sourceType when requested', async () => {
    await seedExperienceWithEmbedding(database, {
      title: 'Feedback memory',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'FEEDBACK',
    });
    await seedExperienceWithEmbedding(database, {
      title: 'PDF memory',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'PDF',
    });

    const feedbackOnly = await semanticSearch(database, {
      query: 'Swiss grid typography',
      limit: 5,
      sourceType: 'FEEDBACK',
    });

    expect(feedbackOnly.results.every((row) => row.sourceType === 'FEEDBACK')).toBe(true);
  });

  it('finds related experiences excluding the source record', async () => {
    const anchor = await seedExperienceWithEmbedding(database, {
      title: 'Anchor Swiss',
      content: SAMPLE_SWISS_TEXT,
    });
    const related = await seedExperienceWithEmbedding(database, {
      title: 'Related Swiss',
      content: `${SAMPLE_SWISS_TEXT} Additional notes on Helvetica and grid systems.`,
    });
    await seedExperienceWithEmbedding(database, {
      title: 'Unrelated mascot',
      content: SAMPLE_MASCOT_TEXT,
    });

    const result = await getRelatedExperiences(database, anchor.id, 3);
    expect(result.results.some((row) => row.id === related.id)).toBe(true);
    expect(result.results.every((row) => row.id !== anchor.id)).toBe(true);
  });

  it('respects minSimilarity threshold', async () => {
    await seedExperienceWithEmbedding(database, {
      title: 'Swiss',
      content: SAMPLE_SWISS_TEXT,
      embedding: deterministicEmbedding(SAMPLE_SWISS_TEXT),
    });

    const strict = await semanticSearch(database, {
      query: 'quantum physics rocket science unrelated topic',
      limit: 5,
      minSimilarity: 0.95,
    });

    expect(strict.total).toBe(0);
  });
});
