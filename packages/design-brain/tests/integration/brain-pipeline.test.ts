import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';
import type { PrismaClient } from '@logo-platform/database';
import { runBrainPromptPipeline } from '../../src/reasoning/brain-prompt-pipeline';
import { reasonDesignDecision } from '../../src/reasoning/brain-reasoning';
import { buildBrainArchitecture } from '../../src/reasoning/brain-architecture';
import {
  createTestPrisma,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
  seedLearnedPrinciple,
} from '../helpers/db';
import { SAMPLE_SWISS_TEXT, sampleGenerateRequest } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('brain prompt pipeline (integration)', () => {
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

  it('runs end-to-end without OpenAI using fallback reasoning', async () => {
    await seedExperienceWithEmbedding(prisma, {
      title: 'Swiss Typography Notes',
      content: SAMPLE_SWISS_TEXT,
    });
    await seedLearnedPrinciple(prisma, {
      promptFragment: 'Helvetica-inspired geometric sans-serif',
      weight: 1.4,
      confidence: 0.85,
    });

    const result = await runBrainPromptPipeline(
      prisma,
      sampleGenerateRequest({ variationCount: 3 }),
    );

    expect(result.brainPowered).toBe(true);
    expect(result.prompts).toHaveLength(3);
    expect(result.bestPrompt.scores.promptQuality).toBeGreaterThan(0);
    expect(result.bestPrompt.metadata?.brainPowered).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.decision.promptText.length).toBeGreaterThan(20);
    expect(result.decision.reasoning.length).toBeGreaterThan(10);
  });

  it('uses taste profile avoided patterns in fallback decision', async () => {
    await prisma.brainTasteSignal.create({
      data: {
        signalType: 'DISLIKE',
        score: 9,
        context: 'Too much gradient and photoreal shadow clutter',
        metadata: { missedTags: ['gradients', 'photoreal'] },
      },
    });

    const taste = await import('../../src/learning/taste-profile').then((m) =>
      m.computeTasteProfile(prisma),
    );

    const decision = await reasonDesignDecision({
      industry: 'fintech',
      companyName: 'NovaPay',
      retrievedExperiences: [],
      learnedPrinciples: [],
      tasteProfile: taste,
      basePromptText: 'Base prompt with flat vector Swiss modernism for NovaPay.',
      markType: 'wordmark',
    });

    expect(decision.antiPatterns.some((p) => p.includes('gradient') || p.includes('photoreal'))).toBe(
      true,
    );
    expect(decision.promptText).toContain('NovaPay');
  });

  it('builds brain architecture from brief and retrieved memory', async () => {
    const experiences = [
      (
        await seedExperienceWithEmbedding(prisma, {
          title: 'Swiss Grid Case Study',
          content: SAMPLE_SWISS_TEXT,
        })
      ).id,
    ];

    const stored = await prisma.brainExperience.findMany({ where: { id: { in: experiences } } });
    const records = stored.map((row) => ({
      id: row.id,
      sourceType: row.sourceType,
      title: row.title,
      content: row.content,
      summary: row.summary,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      filePath: row.filePath,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    const architecture = await buildBrainArchitecture(
      prisma,
      sampleGenerateRequest(),
      records,
    );

    expect(architecture.clientIntent.abstractionLevel).toBeTruthy();
    expect(architecture.designStrategy.markArchitecture).toBeTruthy();
    expect(architecture.interviewQuestions.length).toBeGreaterThan(0);
    expect(architecture.agentContributions.length).toBeGreaterThan(0);
  });
});
