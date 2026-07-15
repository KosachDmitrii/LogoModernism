import { describe, expect, it } from 'vitest';
import type { DatabaseClient } from '@logo-platform/database';
import {
  getResearchCandidate,
  updateResearchCandidate,
} from '../../src/research/candidates';
import { checkPdfIngestStatus } from '../../src/ingest/pdf-dedup';
import { loadProjectMemory } from '../../src/learning/project-memory';

const candidate = {
  id: 'candidate-b',
  organizationId: 'org-b',
  projectId: null,
  createdBy: 'user-b',
  reviewedBy: null,
  query: 'logos',
  status: 'pending',
  sourceUrl: 'https://example.com',
  sourceTitle: 'Example',
  snippet: 'Snippet',
  summary: 'Summary',
  extractedText: 'Text',
  principles: [],
  sourceScore: 0.8,
  ingestResult: null,
  createdAt: new Date(),
  reviewedAt: null,
};

function fakeDatabase(): DatabaseClient {
  return {
    async query<T>(text: string, values: readonly unknown[] = []) {
      if (text.includes('FROM design_brain_experiences')) {
        const rows =
          values.includes('org-b')
            ? [
                {
                  id: 'pdf-b',
                  metadata: {
                    bookTitle: 'Logo Modernism',
                    contentHash: 'same-hash',
                    chunkIndex: 0,
                    totalChunks: 1,
                  },
                },
              ]
            : [];
        return { rows: rows as T[], rowCount: rows.length };
      }
      if (text.includes('FROM design_brain_taste_signals')) {
        const rows =
          values.includes('org-b')
            ? [
                {
                  signalType: 'LIKE',
                  score: 8,
                  context: 'I like geometric grids',
                  metadata: { companyName: 'Acme' },
                  createdAt: new Date(),
                },
              ]
            : [];
        return { rows: rows as T[], rowCount: rows.length };
      }
      return { rows: [], rowCount: 0 };
    },
    async one<T>() {
      return candidate as T;
    },
    async maybeOne<T>(text: string, values: readonly unknown[] = []) {
      if (
        text.includes('brain_research_candidates') &&
        values.includes(candidate.id) &&
        values.includes(candidate.organizationId)
      ) {
        return candidate as T;
      }
      return null;
    },
    async transaction<T>(fn: (tx: DatabaseClient) => Promise<T>) {
      return fn(this);
    },
  };
}

describe('tenant isolation', () => {
  it('does not expose or update another organization research candidate', async () => {
    const database = fakeDatabase();
    await expect(
      getResearchCandidate(database, candidate.id, { organizationId: 'org-a' }),
    ).resolves.toBeNull();
    await expect(
      updateResearchCandidate(
        database,
        candidate.id,
        { organizationId: 'org-a', userId: 'user-a' },
        { status: 'approved' },
      ),
    ).rejects.toThrow('Research candidate not found');
  });

  it('scopes PDF deduplication to the active organization', async () => {
    const database = fakeDatabase();
    const orgA = await checkPdfIngestStatus(
      database,
      'Logo Modernism',
      'same-hash',
      { organizationId: 'org-a' },
      1,
    );
    const orgB = await checkPdfIngestStatus(
      database,
      'Logo Modernism',
      'same-hash',
      { organizationId: 'org-b' },
      1,
    );

    expect(orgA.alreadyIngested).toBe(false);
    expect(orgA.existingChunks).toBe(0);
    expect(orgB.alreadyIngested).toBe(true);
  });

  it('rejects unscoped research and PDF state access', async () => {
    const database = fakeDatabase();
    await expect(getResearchCandidate(database, candidate.id, {})).rejects.toThrow(
      'Organization scope is required',
    );
    await expect(
      checkPdfIngestStatus(database, 'Book', 'hash', {}),
    ).rejects.toThrow('Organization scope is required');
  });

  it('scopes project memory signals to the active organization', async () => {
    const database = fakeDatabase();
    await expect(
      loadProjectMemory(database, 'Acme', { organizationId: 'org-a' }),
    ).resolves.toBeUndefined();
    await expect(
      loadProjectMemory(database, 'Acme', { organizationId: 'org-b' }),
    ).resolves.toMatchObject({ signalCount: 1 });
    await expect(loadProjectMemory(database, 'Acme')).rejects.toThrow(
      'Organization scope is required',
    );
  });
});
