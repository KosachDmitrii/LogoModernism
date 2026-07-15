import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { designBrain } from '../../src/brain.service';
import { ingestFeedback } from '../../src/ingest/ingest-feedback';
import {
  createTestDatabase,
  isBrainDbReady,
  resetBrainTables,
  seedExperienceWithEmbedding,
} from '../helpers/db';
import { SAMPLE_SWISS_TEXT, sampleFeedback } from '../helpers/fixtures';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('DesignBrainService (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('reports capabilities and stats accurately', async () => {
    const caps = designBrain.getCapabilities();
    expect(caps.databaseConfigured).toBe(true);
    expect(caps.embeddingConfigured).toBe(true);

    await seedExperienceWithEmbedding(database, {
      title: 'Stats test',
      content: SAMPLE_SWISS_TEXT,
    });
    await ingestFeedback(database, sampleFeedback());

    const stats = await designBrain.getStats();
    expect(stats.experiences).toBeGreaterThanOrEqual(2);
    expect(stats.tasteSignals).toBeGreaterThanOrEqual(1);
    expect(stats.pgvectorEnabled).toBe(true);
    expect(stats.embeddingDimensions).toBe(1536);
  });

  it('lists experiences and principles after learning', async () => {
    await seedExperienceWithEmbedding(database, {
      title: 'Listed experience',
      content: SAMPLE_SWISS_TEXT,
      sourceType: 'TEXT',
    });

    const experiences = await designBrain.listExperiences({ limit: 10 });
    expect(experiences.some((exp) => exp.title === 'Listed experience')).toBe(true);

    const principles = await designBrain.listPrinciples(10);
    expect(Array.isArray(principles.items)).toBe(true);
    expect(principles.total).toBeGreaterThanOrEqual(0);
  });

  it('computes taste profile through service API', async () => {
    await ingestFeedback(database, sampleFeedback({ signalType: 'APPROVE', score: 9 }));

    const taste = await designBrain.getTasteProfile();
    expect(taste.signalCount).toBe(1);
    expect(taste.summary).not.toMatch(/defaults/i);
  });

  it('generates brain-powered prompts through service API', async () => {
    const result = await designBrain.generate({
      industry: 'fintech',
      companyName: 'NovaPay',
      variationCount: 2,
      markType: 'wordmark',
      minimalismLevel: 8,
      useBrain: true,
    });

    expect(result.brainPowered).toBe(true);
    expect(result.prompts).toHaveLength(2);
  });
});
