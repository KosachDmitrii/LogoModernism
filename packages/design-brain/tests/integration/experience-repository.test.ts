import { describe, expect, it, beforeAll, beforeEach } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import { upsertLearnedPrinciple } from '../../src/storage/experience.repository';
import {
  createTestDatabase,
  getTestPrinciple,
  isBrainDbReady,
  resetBrainTables,
  listTestPrinciples,
} from '../helpers/db';

const describeIntegration = isBrainDbReady() ? describe : describe.skip;

describeIntegration('experience.repository (integration)', () => {
  let database: DatabaseClient;

  beforeAll(async () => {
    database = createTestDatabase();
  });

  beforeEach(async () => {
    await resetBrainTables(database);
  });

  it('upserts learned principles instead of duplicating identical fragments', async () => {
    const first = await upsertLearnedPrinciple(database, {
      category: 'geometry',
      ruleText: 'Use modular grids.',
      promptFragment: 'modular grid construction',
      confidence: 0.8,
      sourceId: 'exp-1',
      tags: ['grid'],
    });

    const second = await upsertLearnedPrinciple(database, {
      category: 'geometry',
      ruleText: 'Build on modular grids.',
      promptFragment: 'modular grid construction',
      confidence: 0.9,
      sourceId: 'exp-2',
      antiPatterns: ['freehand'],
    });

    expect(second.id).toBe(first.id);

    const all = await listTestPrinciples(database);
    expect(all).toHaveLength(1);
    expect(all[0]?.sourceIds.sort()).toEqual(['exp-1', 'exp-2']);
    expect(all[0]?.weight).toBeGreaterThan(1);
    expect(all[0]?.antiPatterns).toContain('freehand');
  });

  it('merges citations without duplicates', async () => {
    const created = await upsertLearnedPrinciple(database, {
      category: 'process',
      ruleText: 'Start with grid.',
      promptFragment: 'start with construction grid',
      confidence: 0.7,
      sourceId: 'exp-a',
      citation: { url: 'https://example.com/swiss', quote: 'Grid first.' },
    });

    await upsertLearnedPrinciple(database, {
      category: 'process',
      ruleText: 'Start with grid.',
      promptFragment: 'start with construction grid',
      confidence: 0.75,
      sourceId: 'exp-b',
      citation: { url: 'https://example.com/swiss', quote: 'Grid first.' },
    });

    const row = await getTestPrinciple(database, created.id);
    const citations = row?.citations as Array<{ url: string; quote: string }>;
    expect(citations).toHaveLength(1);
  });
});
