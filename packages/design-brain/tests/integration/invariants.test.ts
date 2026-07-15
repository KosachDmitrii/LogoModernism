import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@logo-platform/database';
import { consolidateBrain } from '../../src/learning/consolidate';
import { ingestFeedback } from '../../src/ingest/ingest-feedback';
import { upsertLearnedPrinciple } from '../../src/storage/experience.repository';
import {
  createTestPrisma,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { sampleFeedback } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('brain invariants (integration)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetBrainTables(prisma);
  });

  it('never leaves orphan embeddings after experience deletion', async () => {
    const experience = await seedExperienceWithEmbedding(prisma, {
      title: 'Temporary',
      content: 'Temporary memory for orphan check',
    });

    await prisma.brainExperience.delete({ where: { id: experience.id } });

    const orphanRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM design_brain_experience_embeddings WHERE experience_id = $1`,
      experience.id,
    );

    expect(Number(orphanRows[0]?.count ?? 0)).toBe(0);
  });

  it(
    'maintains principle weight/confidence bounds after repeated feedback and consolidate cycles',
    async () => {
      const principle = await upsertLearnedPrinciple(prisma, {
        category: 'geometry',
        ruleText: 'Use grids.',
        promptFragment: 'strict modular grid',
        confidence: 0.5,
        sourceId: 'seed',
      });

      for (let i = 0; i < 5; i++) {
        await ingestFeedback(
          prisma,
          sampleFeedback({
            signalType: i % 2 === 0 ? 'LIKE' : 'DISLIKE',
            score: 10,
            metadata: { principleIds: [principle.id] },
          }),
        );
        await consolidateBrain(prisma);
      }

      const final = await prisma.learnedPrinciple.findUnique({ where: { id: principle.id } });
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

    await seedExperienceWithEmbedding(prisma, {
      title: sharedTitle,
      content: sharedContent,
    });
    await seedExperienceWithEmbedding(prisma, {
      title: sharedTitle,
      content: sharedContent,
    });

    const before = await prisma.brainExperience.count();
    expect(before).toBeGreaterThanOrEqual(2);

    const result = await consolidateBrain(prisma);
    const after = await prisma.brainExperience.count();

    expect(result.deduplicatedExperiences).toBeGreaterThanOrEqual(1);
    expect(after).toBeLessThan(before);
  });
});
