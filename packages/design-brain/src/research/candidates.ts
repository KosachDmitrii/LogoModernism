import { randomUUID } from 'node:crypto';
import type {
  BrainResearchCandidate,
  BrainResearchCandidateStatus,
  BrainTenantScope,
} from '@logo-platform/shared';
import type { Prisma, PrismaClient } from '@logo-platform/database';

function tenantWhere(scope?: BrainTenantScope): { organizationId: string; projectId?: string } {
  if (!scope?.organizationId) {
    throw new Error('Organization scope is required for research candidates');
  }
  return {
    organizationId: scope.organizationId,
    ...(scope.projectId ? { projectId: scope.projectId } : {}),
  };
}

type CandidateRow = Awaited<ReturnType<PrismaClient['brainResearchCandidate']['findFirst']>>;

function toCandidate(row: NonNullable<CandidateRow>): BrainResearchCandidate {
  return {
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId ?? undefined,
    createdBy: row.createdBy ?? undefined,
    reviewedBy: row.reviewedBy ?? undefined,
    query: row.query,
    status: row.status as BrainResearchCandidateStatus,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    snippet: row.snippet,
    summary: row.summary,
    extractedText: row.extractedText,
    principles: row.principles as unknown as BrainResearchCandidate['principles'],
    sourceScore: row.sourceScore ?? undefined,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString(),
    ingestResult: row.ingestResult as unknown as BrainResearchCandidate['ingestResult'],
  };
}

export async function listResearchCandidates(
  prisma: PrismaClient,
  scope: BrainTenantScope,
  status?: BrainResearchCandidateStatus,
): Promise<BrainResearchCandidate[]> {
  const rows = await prisma.brainResearchCandidate.findMany({
    where: { ...tenantWhere(scope), ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toCandidate);
}

export async function getResearchCandidate(
  prisma: PrismaClient,
  id: string,
  scope: BrainTenantScope,
): Promise<BrainResearchCandidate | null> {
  const row = await prisma.brainResearchCandidate.findFirst({
    where: { id, ...tenantWhere(scope) },
  });
  return row ? toCandidate(row) : null;
}

export async function findCandidateByUrl(
  prisma: PrismaClient,
  url: string,
  scope: BrainTenantScope,
): Promise<BrainResearchCandidate | null> {
  const row = await prisma.brainResearchCandidate.findFirst({
    where: {
      ...tenantWhere(scope),
      sourceUrl: { equals: url.trim(), mode: 'insensitive' },
    },
  });
  return row ? toCandidate(row) : null;
}

export async function saveResearchCandidate(
  prisma: PrismaClient,
  scope: BrainTenantScope,
  input: Omit<
    BrainResearchCandidate,
    'id' | 'createdAt' | 'status' | 'organizationId' | 'projectId' | 'createdBy' | 'reviewedBy'
  > & {
    id?: string;
    status?: BrainResearchCandidateStatus;
  },
): Promise<BrainResearchCandidate> {
  const tenant = tenantWhere(scope);
  const row = await prisma.brainResearchCandidate.create({
    data: {
      id: input.id ?? randomUUID(),
      ...tenant,
      createdBy: scope.userId,
      query: input.query,
      status: input.status ?? 'pending',
      sourceUrl: input.sourceUrl,
      sourceTitle: input.sourceTitle,
      snippet: input.snippet,
      summary: input.summary,
      extractedText: input.extractedText,
      principles: input.principles as unknown as Prisma.InputJsonValue,
      sourceScore: input.sourceScore,
    },
  });
  return toCandidate(row);
}

export async function updateResearchCandidate(
  prisma: PrismaClient,
  id: string,
  scope: BrainTenantScope,
  patch: Partial<BrainResearchCandidate>,
): Promise<BrainResearchCandidate> {
  const existing = await prisma.brainResearchCandidate.findFirst({
    where: { id, ...tenantWhere(scope) },
  });
  if (!existing) {
    throw new Error(`Research candidate not found: ${id}`);
  }
  const updated = await prisma.brainResearchCandidate.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.reviewedAt ? { reviewedAt: new Date(patch.reviewedAt) } : {}),
      ...(patch.reviewedBy ? { reviewedBy: patch.reviewedBy } : {}),
      ...(patch.ingestResult
        ? { ingestResult: patch.ingestResult as unknown as Prisma.InputJsonValue }
        : {}),
    },
  });
  return toCandidate(updated);
}
