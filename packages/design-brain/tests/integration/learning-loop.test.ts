import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { consolidateBrain } from '../../src/learning/consolidate';
import { computeTasteProfile } from '../../src/learning/taste-profile';
import { ingestFeedback } from '../../src/ingest/ingest-feedback';
import { runBriefCompilerPipeline } from '../../src/reasoning/brain-compiler-pipeline';
import {
  createTestDatabase,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
  seedLearnedPrinciple,
} from '../helpers/db';
import { SAMPLE_MASCOT_TEXT, SAMPLE_SWISS_TEXT, sampleFeedback, sampleGenerateRequest } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('learning loop (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('closes the full loop: ingest → feedback → consolidate → taste shift → brain-powered generation', async () => {
    await seedExperienceWithEmbedding(database, {
      title: 'Swiss Design Manual',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'PDF',
    });
    await seedExperienceWithEmbedding(database, {
      title: 'Mascot Design Guide',
      content: SAMPLE_MASCOT_TEXT,
      sourceType: 'PDF',
    });

    await seedLearnedPrinciple(database, {
      promptFragment: 'modular grid construction',
      weight: 1,
      confidence: 0.7,
      ruleText: 'Build logos on modular grids.',
    });

    for (let i = 0; i < 4; i++) {
      await ingestFeedback(
        database,
        sampleFeedback({
          signalType: 'LIKE',
          score: 9,
          context: 'Excellent lettermark with geometric grid-based construction and flat vector rendering',
          metadata: { workedTags: ['geometry', 'typography'], missedTags: [] },
        }),
      );
    }

    for (let i = 0; i < 3; i++) {
      await ingestFeedback(
        database,
        sampleFeedback({
          signalType: 'DISLIKE',
          score: 8,
          context: 'Rejected mascot with gradients, photoreal shadows, and cluttered ornament',
          metadata: { missedTags: ['gradients', 'photoreal', 'ornament'] },
        }),
      );
    }

    const consolidateResult = await consolidateBrain(database);
    expect(consolidateResult.updatedWeights).toBeGreaterThanOrEqual(0);

    const tasteBeforeGenerate = await computeTasteProfile(database);
    expect(tasteBeforeGenerate.signalCount).toBe(7);
    expect(tasteBeforeGenerate.preferredMarkTypes).toContain('lettermark');
    expect(tasteBeforeGenerate.avoidedPatterns.length).toBeGreaterThan(0);

    const pipeline = await runBriefCompilerPipeline(
      database,
      sampleGenerateRequest({ variationCount: 2 }),
    );

    expect(pipeline.brainPowered).toBe(true);
    expect(pipeline.prompts.length).toBe(2);
    expect(pipeline.bestPrompt.text.length).toBeGreaterThan(50);
    expect(pipeline.tasteProfile.signalCount).toBe(7);
    expect(pipeline.retrievedExperiences.length).toBeGreaterThan(0);
    expect(
      pipeline.retrievedExperiences.some((exp) => /Swiss|Grid|Typography/i.test(exp.title ?? '')),
    ).toBe(true);
    expect(pipeline.decision.antiPatterns).toHaveLength(0);
    expect(pipeline.brainArchitecture.clientIntent).toBeDefined();
    expect(pipeline.brainArchitecture.designStrategy).toBeDefined();
  });

  it('persists learned state across pipeline invocations', async () => {
    await ingestFeedback(database, sampleFeedback({ signalType: 'LIKE', score: 10 }));

    const first = await computeTasteProfile(database);
    const secondPipeline = await runBriefCompilerPipeline(
      database,
      sampleGenerateRequest({ variationCount: 1 }),
    );

    expect(secondPipeline.tasteProfile.signalCount).toBe(first.signalCount);
    expect(secondPipeline.tasteProfile.summary).toBe(first.summary);
  });
});
