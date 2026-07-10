import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@logo-platform/database';
import { semanticSearch, getRelatedExperiences } from '../../src/retrieval/semantic-search';
import {
  createTestPrisma,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { deterministicEmbedding } from '../helpers/embeddings';
import { SAMPLE_MASCOT_TEXT, SAMPLE_SWISS_TEXT } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('semantic retrieval (integration)', () => {
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

  it('retrieves Swiss-related experience ahead of unrelated mascot content', async () => {
    const swiss = await seedExperienceWithEmbedding(prisma, {
      title: 'Swiss Grid Typography',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'PDF',
    });
    await seedExperienceWithEmbedding(prisma, {
      title: 'Mascot Playbook',
      content: SAMPLE_MASCOT_TEXT,
      sourceType: 'PDF',
    });

    const result = await semanticSearch(prisma, {
      query: 'Swiss International Typographic Style modular grid Helvetica',
      limit: 2,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.results[0]?.id).toBe(swiss.id);
    expect(result.results[0]?.similarity).toBeGreaterThan(result.results[1]?.similarity ?? 0);
  });

  it('filters retrieval by sourceType when requested', async () => {
    await seedExperienceWithEmbedding(prisma, {
      title: 'Feedback memory',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'FEEDBACK',
    });
    await seedExperienceWithEmbedding(prisma, {
      title: 'PDF memory',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'PDF',
    });

    const feedbackOnly = await semanticSearch(prisma, {
      query: 'Swiss grid typography',
      limit: 5,
      sourceType: 'FEEDBACK',
    });

    expect(feedbackOnly.results.every((row) => row.sourceType === 'FEEDBACK')).toBe(true);
  });

  it('finds related experiences excluding the source record', async () => {
    const anchor = await seedExperienceWithEmbedding(prisma, {
      title: 'Anchor Swiss',
      content: SAMPLE_SWISS_TEXT,
    });
    const related = await seedExperienceWithEmbedding(prisma, {
      title: 'Related Swiss',
      content: `${SAMPLE_SWISS_TEXT} Additional notes on Helvetica and grid systems.`,
    });
    await seedExperienceWithEmbedding(prisma, {
      title: 'Unrelated mascot',
      content: SAMPLE_MASCOT_TEXT,
    });

    const result = await getRelatedExperiences(prisma, anchor.id, 3);
    expect(result.results.some((row) => row.id === related.id)).toBe(true);
    expect(result.results.every((row) => row.id !== anchor.id)).toBe(true);
  });

  it('respects minSimilarity threshold', async () => {
    await seedExperienceWithEmbedding(prisma, {
      title: 'Swiss',
      content: SAMPLE_SWISS_TEXT,
      embedding: deterministicEmbedding(SAMPLE_SWISS_TEXT),
    });

    const strict = await semanticSearch(prisma, {
      query: 'quantum physics rocket science unrelated topic',
      limit: 5,
      minSimilarity: 0.95,
    });

    expect(strict.total).toBe(0);
  });
});
