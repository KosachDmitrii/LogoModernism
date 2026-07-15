import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@logo-platform/database';
import { ingestFeedback } from '../../src/ingest/ingest-feedback';
import {
  createTestPrisma,
  isBrainDbReady,
  resetBrainTables,
  seedLearnedPrinciple,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { sampleFeedback } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('ingestFeedback (integration)', () => {
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

  it('stores feedback as FEEDBACK experience with embedding', async () => {
    const result = await ingestFeedback(prisma, sampleFeedback());

    expect(result.sourceType).toBe('FEEDBACK');
    expect(result.chunksStored).toBe(1);

    const experience = await prisma.brainExperience.findUnique({ where: { id: result.experienceId } });
    expect(experience?.sourceType).toBe('FEEDBACK');

    const embeddingRows = await prisma.$queryRawUnsafe<Array<{ experience_id: string }>>(
      `SELECT experience_id FROM design_brain_experience_embeddings WHERE experience_id = $1`,
      result.experienceId,
    );
    expect(embeddingRows).toHaveLength(1);
  });

  it('creates taste signal linked to feedback context', async () => {
    await ingestFeedback(
      prisma,
      sampleFeedback({ signalType: 'LIKE', score: 9, context: 'Great grid-based wordmark' }),
    );

    const signals = await prisma.brainTasteSignal.findMany();
    expect(signals).toHaveLength(1);
    expect(signals[0]?.signalType).toBe('LIKE');
    expect(signals[0]?.score).toBe(9);
  });

  it('boosts linked learned principle weights on LIKE feedback', async () => {
    const principle = await seedLearnedPrinciple(prisma, {
      promptFragment: 'grid-based construction',
      weight: 1,
      confidence: 0.5,
    });

    const linked = await seedExperienceWithEmbedding(prisma, {
      title: 'Past generation',
      content: 'Generated logo using grid-based construction',
      metadata: { principleIds: [principle.id] },
    });

    await ingestFeedback(
      prisma,
      sampleFeedback({
        experienceId: linked.id,
        signalType: 'LIKE',
        score: 10,
      }),
    );

    const updated = await prisma.learnedPrinciple.findUnique({ where: { id: principle.id } });
    expect(updated?.weight).toBeGreaterThan(1);
    expect(updated?.confidence).toBeGreaterThan(0.5);
  });

  it('reduces linked learned principle weights on DISLIKE feedback', async () => {
    const principle = await seedLearnedPrinciple(prisma, {
      promptFragment: 'gradient heavy style',
      weight: 1.5,
      confidence: 0.7,
    });

    const linked = await seedExperienceWithEmbedding(prisma, {
      title: 'Bad generation',
      content: 'Logo with heavy gradients',
      metadata: { principleIds: [principle.id] },
    });

    await ingestFeedback(
      prisma,
      sampleFeedback({
        experienceId: linked.id,
        signalType: 'DISLIKE',
        score: 8,
        context: 'Too many gradients and shadows',
      }),
    );

    const updated = await prisma.learnedPrinciple.findUnique({ where: { id: principle.id } });
    expect(updated?.weight).toBeLessThan(1.5);
  });
});
