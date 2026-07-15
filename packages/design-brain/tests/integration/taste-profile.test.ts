import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { computeTasteProfile } from '../../src/learning/taste-profile';
import {
  createTestDatabase,
  isBrainDbReady,
  resetBrainTables,
  seedTasteSignal,
} from '../helpers/db';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('computeTasteProfile (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('returns modernist defaults when no taste signals exist', async () => {
    const profile = await computeTasteProfile(database);
    expect(profile.signalCount).toBe(0);
    expect(profile.preferredMarkTypes).toContain('wordmark');
    expect(profile.avoidedPatterns).toContain('gradients');
    expect(profile.summary).toMatch(/defaults/i);
  });

  it('learns preferred mark types from positive feedback', async () => {
    await Promise.all(
      Array.from({ length: 5 }, () => seedTasteSignal(database, {
        signalType: 'LIKE',
        score: 9,
        context: 'Excellent lettermark with geometric construction and grid-based layout',
        metadata: { workedTags: ['typography', 'geometry'] },
      })),
    );

    const profile = await computeTasteProfile(database);
    expect(profile.signalCount).toBe(5);
    expect(profile.preferredMarkTypes).toContain('lettermark');
    expect(profile.preferredGeometry.length).toBeGreaterThan(0);
    expect(profile.averageScore).toBeCloseTo(9);
  });

  it('learns avoided patterns from negative feedback', async () => {
    await Promise.all(
      [
        seedTasteSignal(database, {
          signalType: 'DISLIKE',
          score: 8,
          context: 'Too much gradient and photoreal shadow effects, cluttered ornament',
          metadata: { missedTags: ['gradients', 'photoreal'] },
        }),
        seedTasteSignal(database, {
          signalType: 'REJECT',
          score: 7,
          context: 'Rejected because of 3d photoreal rendering and complex ornament',
          metadata: { missedTags: ['3d effects'] },
        }),
      ],
    );

    const profile = await computeTasteProfile(database);
    expect(profile.avoidedPatterns.length).toBeGreaterThan(0);
    expect(profile.summary).toMatch(/Avoids/i);
  });
});
