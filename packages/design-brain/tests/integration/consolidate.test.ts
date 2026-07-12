import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestPrisma,
  isBrainDbReady,
  resetBrainTables,
  seedLearnedPrinciple,
} from '../helpers/db';
import { consolidateBrain } from '../../src/learning/consolidate';
import type { PrismaClient } from '@logo-platform/database';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('consolidateBrain (integration)', () => {
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

  it('merges duplicate learned principles by promptFragment', async () => {
    await seedLearnedPrinciple(prisma, {
      promptFragment: 'modular grid construction',
      weight: 1.2,
      confidence: 0.8,
      sourceIds: ['src-a'],
    });
    await seedLearnedPrinciple(prisma, {
      promptFragment: 'Modular Grid Construction!',
      weight: 0.8,
      confidence: 0.6,
      sourceIds: ['src-b'],
    });

    const result = await consolidateBrain(prisma);
    const remaining = await prisma.learnedPrinciple.findMany();

    expect(result.mergedPrinciples).toBe(1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.sourceIds.sort()).toEqual(['src-a', 'src-b']);
    expect(remaining[0]?.weight).toBeGreaterThan(1.2);
  });

  it('prunes weak principles with low weight and confidence', async () => {
    await seedLearnedPrinciple(prisma, {
      promptFragment: 'weak principle',
      weight: 0.2,
      confidence: 0.1,
      sourceIds: ['only-one'],
    });
    await seedLearnedPrinciple(prisma, {
      promptFragment: 'strong principle',
      weight: 1.5,
      confidence: 0.9,
    });

    const result = await consolidateBrain(prisma);
    const remaining = await prisma.learnedPrinciple.findMany();

    expect(result.prunedPrinciples).toBe(1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.promptFragment).toBe('strong principle');
  });

  it('updates principle weights from taste signal metadata during consolidate', async () => {
    const principle = await seedLearnedPrinciple(prisma, {
      promptFragment: 'flat vector rendering',
      weight: 1,
      confidence: 0.5,
    });

    await prisma.brainTasteSignal.create({
      data: {
        signalType: 'LIKE',
        score: 10,
        context: 'Loved the flat vector look',
        metadata: { principleIds: [principle.id] },
      },
    });

    const result = await consolidateBrain(prisma);
    const updated = await prisma.learnedPrinciple.findUnique({ where: { id: principle.id } });

    expect(result.updatedWeights).toBeGreaterThan(0);
    expect(updated?.weight).toBeGreaterThan(1);
    expect(updated?.confidence).toBeGreaterThan(0.5);
  });

  it('keeps weights and confidence within safe bounds after consolidate', async () => {
    await seedLearnedPrinciple(prisma, { promptFragment: 'principle-a', weight: 2.9, confidence: 0.95 });
    await seedLearnedPrinciple(prisma, { promptFragment: 'principle-b', weight: 0.15, confidence: 0.15, sourceIds: ['x'] });

    await consolidateBrain(prisma);
    const principles = await prisma.learnedPrinciple.findMany();

    for (const principle of principles) {
      expect(principle.weight).toBeGreaterThanOrEqual(0.1);
      expect(principle.weight).toBeLessThanOrEqual(3);
      expect(principle.confidence).toBeGreaterThanOrEqual(0.1);
      expect(principle.confidence).toBeLessThanOrEqual(1);
    }
  });
});
