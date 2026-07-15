import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { consolidateBrain } from '../../src/learning/consolidate';
import { ingestFeedback } from '../../src/ingest/ingest-feedback';
import { upsertLearnedPrinciple } from '../../src/storage/experience.repository';
import {
  createTestDatabase,
  getTestPrinciple,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { sampleFeedback } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('brain invariants (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('never leaves orphan embeddings after experience deletion', async () => {
    const experience = await seedExperienceWithEmbedding(database, {
      title: 'Temporary',
      content: 'Temporary memory for orphan check',
    });

    await database.query('DELETE FROM design_brain_experiences WHERE id = $1', [experience.id]);

    const orphanRows = await database.query<{ count: bigint }>(
      `SELECT COUNT(*)::bigint AS count FROM design_brain_experience_embeddings WHERE experience_id = $1`,
      [experience.id],
    );

    expect(Number(orphanRows.rows[0]?.count ?? 0)).toBe(0);
  });

  it(
    'maintains principle weight/confidence bounds after repeated feedback and consolidate cycles',
    async () => {
      const principle = await upsertLearnedPrinciple(database, {
        category: 'geometry',
        ruleText: 'Use grids.',
        promptFragment: 'strict modular grid',
        confidence: 0.5,
        sourceId: 'seed',
      });

      for (let i = 0; i < 5; i++) {
        await ingestFeedback(
          database,
          sampleFeedback({
            signalType: i % 2 === 0 ? 'LIKE' : 'DISLIKE',
            score: 10,
            metadata: { principleIds: [principle.id] },
          }),
        );
        await consolidateBrain(database);
      }

      const final = await getTestPrinciple(database, principle.id);
      expect(final?.weight).toBeGreaterThanOrEqual(0.1);
      expect(final?.weight).toBeLessThanOrEqual(3);
      expect(final?.confidence).toBeGreaterThanOrEqual(0.1);
      expect(final?.confidence).toBeLessThanOrEqual(1);
    },
    120_000,
  );

  it('deduplicates near-identical experiences during consolidate when embeddings match', async () => {
    const sharedContent = 'Identical Swiss grid typography content for deduplication test';
    const sharedTitle = 'Shared Swiss Grid Notes';

    await seedExperienceWithEmbedding(database, {
      title: sharedTitle,
      content: sharedContent,
    });
    await seedExperienceWithEmbedding(database, {
      title: sharedTitle,
      content: sharedContent,
    });

    const before = (await database.one<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM design_brain_experiences',
    )).count;
    expect(before).toBeGreaterThanOrEqual(2);

    const result = await consolidateBrain(database);
    const after = (await database.one<{ count: number }>(
      'SELECT COUNT(*)::int AS count FROM design_brain_experiences',
    )).count;

    expect(result.deduplicatedExperiences).toBeGreaterThanOrEqual(1);
    expect(after).toBeLessThan(before);
  });
});
