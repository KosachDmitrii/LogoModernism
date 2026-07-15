import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { ingestFeedback } from '../../src/ingest/ingest-feedback';
import {
  createTestDatabase,
  getTestPrinciple,
  isBrainDbReady,
  resetBrainTables,
  seedLearnedPrinciple,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { sampleFeedback } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('ingestFeedback (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('stores feedback as FEEDBACK experience with embedding', async () => {
    const result = await ingestFeedback(database, sampleFeedback());

    expect(result.sourceType).toBe('FEEDBACK');
    expect(result.chunksStored).toBe(1);

    const experience = await database.maybeOne<{ sourceType: string }>(
      'SELECT source_type FROM design_brain_experiences WHERE id = $1',
      [result.experienceId],
    );
    expect(experience?.sourceType).toBe('FEEDBACK');

    const embeddingRows = await database.query<{ experienceId: string }>(
      `SELECT experience_id FROM design_brain_experience_embeddings WHERE experience_id = $1`,
      [result.experienceId],
    );
    expect(embeddingRows.rows).toHaveLength(1);
  });

  it('creates taste signal linked to feedback context', async () => {
    await ingestFeedback(
      database,
      sampleFeedback({ signalType: 'LIKE', score: 9, context: 'Great grid-based wordmark' }),
    );

    const signals = (await database.query<{ signalType: string; score: number }>(
      'SELECT signal_type, score FROM design_brain_taste_signals',
    )).rows;
    expect(signals).toHaveLength(1);
    expect(signals[0]?.signalType).toBe('LIKE');
    expect(signals[0]?.score).toBe(9);
  });

  it('boosts linked learned principle weights on LIKE feedback', async () => {
    const principle = await seedLearnedPrinciple(database, {
      promptFragment: 'grid-based construction',
      weight: 1,
      confidence: 0.5,
    });

    const linked = await seedExperienceWithEmbedding(database, {
      title: 'Past generation',
      content: 'Generated logo using grid-based construction',
      metadata: { principleIds: [principle.id] },
    });

    await ingestFeedback(
      database,
      sampleFeedback({
        experienceId: linked.id,
        signalType: 'LIKE',
        score: 10,
      }),
    );

    const updated = await getTestPrinciple(database, principle.id);
    expect(updated?.weight).toBeGreaterThan(1);
    expect(updated?.confidence).toBeGreaterThan(0.5);
  });

  it('reduces linked learned principle weights on DISLIKE feedback', async () => {
    const principle = await seedLearnedPrinciple(database, {
      promptFragment: 'gradient heavy style',
      weight: 1.5,
      confidence: 0.7,
    });

    const linked = await seedExperienceWithEmbedding(database, {
      title: 'Bad generation',
      content: 'Logo with heavy gradients',
      metadata: { principleIds: [principle.id] },
    });

    await ingestFeedback(
      database,
      sampleFeedback({
        experienceId: linked.id,
        signalType: 'DISLIKE',
        score: 8,
        context: 'Too many gradients and shadows',
      }),
    );

    const updated = await getTestPrinciple(database, principle.id);
    expect(updated?.weight).toBeLessThan(1.5);
  });
});
