import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@logo-platform/database';
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

function fakePrisma(): PrismaClient {
  return {
    brainResearchCandidate: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        where.id === candidate.id && where.organizationId === candidate.organizationId
          ? candidate
          : null,
      update: async () => candidate,
    },
    brainExperience: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        where.organizationId === 'org-b'
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
          : [],
    },
    brainTasteSignal: {
      findMany: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.organizationId !== 'org-b') return [];
        return [
          {
            signalType: 'LIKE',
            score: 8,
            context: 'I like geometric grids',
            metadata: { companyName: 'Acme' },
            createdAt: new Date(),
          },
        ];
      },
    },
  } as unknown as PrismaClient;
}

describe('tenant isolation', () => {
  it('does not expose or update another organization research candidate', async () => {
    const prisma = fakePrisma();
    await expect(
      getResearchCandidate(prisma, candidate.id, { organizationId: 'org-a' }),
    ).resolves.toBeNull();
    await expect(
      updateResearchCandidate(
        prisma,
        candidate.id,
        { organizationId: 'org-a', userId: 'user-a' },
        { status: 'approved' },
      ),
    ).rejects.toThrow('Research candidate not found');
  });

  it('scopes PDF deduplication to the active organization', async () => {
    const prisma = fakePrisma();
    const orgA = await checkPdfIngestStatus(
      prisma,
      'Logo Modernism',
      'same-hash',
      { organizationId: 'org-a' },
      1,
    );
    const orgB = await checkPdfIngestStatus(
      prisma,
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
    const prisma = fakePrisma();
    await expect(getResearchCandidate(prisma, candidate.id, {})).rejects.toThrow(
      'Organization scope is required',
    );
    await expect(
      checkPdfIngestStatus(prisma, 'Book', 'hash', {}),
    ).rejects.toThrow('Organization scope is required');
  });

  it('scopes project memory signals to the active organization', async () => {
    const prisma = fakePrisma();
    await expect(
      loadProjectMemory(prisma, 'Acme', { organizationId: 'org-a' }),
    ).resolves.toBeUndefined();
    await expect(
      loadProjectMemory(prisma, 'Acme', { organizationId: 'org-b' }),
    ).resolves.toMatchObject({ signalCount: 1 });
    await expect(loadProjectMemory(prisma, 'Acme')).rejects.toThrow(
      'Organization scope is required',
    );
  });
});
