import { randomUUID } from 'node:crypto';
import type {
  BrainResearchCandidate,
  BrainResearchCandidateStatus,
  BrainTenantScope,
} from '@logo-platform/shared';
import type { DatabaseClient, ResearchCandidateRow } from '../storage/database-types';

function tenantWhere(scope?: BrainTenantScope): { organizationId: string; projectId?: string } {
  if (!scope?.organizationId) {
    throw new Error('Organization scope is required for research candidates');
  }
  return {
    organizationId: scope.organizationId,
    ...(scope.projectId ? { projectId: scope.projectId } : {}),
  };
}

function toCandidate(row: ResearchCandidateRow): BrainResearchCandidate {
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
  client: DatabaseClient,
  scope: BrainTenantScope,
  status?: BrainResearchCandidateStatus,
): Promise<BrainResearchCandidate[]> {
  const tenant = tenantWhere(scope);
  const values: unknown[] = [tenant.organizationId];
  const filters = ['organization_id = $1'];
  if (tenant.projectId) {
    values.push(tenant.projectId);
    filters.push(`project_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`status = $${values.length}`);
  }
  const { rows } = await client.query<ResearchCandidateRow>(
    `SELECT * FROM brain_research_candidates
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC`,
    values,
  );
  return rows.map(toCandidate);
}

export async function getResearchCandidate(
  client: DatabaseClient,
  id: string,
  scope: BrainTenantScope,
): Promise<BrainResearchCandidate | null> {
  const { clause, values } = candidateIdentity(id, scope);
  const row = await client.maybeOne<ResearchCandidateRow>(
    `SELECT * FROM brain_research_candidates WHERE ${clause}`,
    values,
  );
  return row ? toCandidate(row) : null;
}

export async function findCandidateByUrl(
  client: DatabaseClient,
  url: string,
  scope: BrainTenantScope,
): Promise<BrainResearchCandidate | null> {
  const tenant = tenantWhere(scope);
  const values: unknown[] = [tenant.organizationId, url.trim()];
  const filters = ['organization_id = $1', 'LOWER(source_url) = LOWER($2)'];
  if (tenant.projectId) {
    values.push(tenant.projectId);
    filters.push(`project_id = $${values.length}`);
  }
  const row = await client.maybeOne<ResearchCandidateRow>(
    `SELECT * FROM brain_research_candidates
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 1`,
    values,
  );
  return row ? toCandidate(row) : null;
}

export async function saveResearchCandidate(
  client: DatabaseClient,
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
  const row = await client.one<ResearchCandidateRow>(
    `INSERT INTO brain_research_candidates
       (id, organization_id, project_id, created_by, query, status, source_url,
        source_title, snippet, summary, extracted_text, principles, source_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, NOW())
     RETURNING *`,
    [
      input.id ?? randomUUID(),
      tenant.organizationId,
      tenant.projectId ?? null,
      scope.userId ?? null,
      input.query,
      input.status ?? 'pending',
      input.sourceUrl,
      input.sourceTitle,
      input.snippet,
      input.summary,
      input.extractedText,
      JSON.stringify(input.principles),
      input.sourceScore ?? null,
    ],
  );
  return toCandidate(row);
}

export async function updateResearchCandidate(
  client: DatabaseClient,
  id: string,
  scope: BrainTenantScope,
  patch: Partial<BrainResearchCandidate>,
): Promise<BrainResearchCandidate> {
  const identity = candidateIdentity(id, scope);
  const existing = await client.maybeOne<ResearchCandidateRow>(
    `SELECT * FROM brain_research_candidates WHERE ${identity.clause}`,
    identity.values,
  );
  if (!existing) {
    throw new Error(`Research candidate not found: ${id}`);
  }
  const updated = await client.one<ResearchCandidateRow>(
    `UPDATE brain_research_candidates
     SET status = CASE WHEN $2 THEN $3 ELSE status END,
         reviewed_at = CASE WHEN $4 THEN $5 ELSE reviewed_at END,
         reviewed_by = CASE WHEN $6 THEN $7 ELSE reviewed_by END,
         ingest_result = CASE WHEN $8 THEN $9::jsonb ELSE ingest_result END
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      Boolean(patch.status),
      patch.status ?? null,
      Boolean(patch.reviewedAt),
      patch.reviewedAt ? new Date(patch.reviewedAt) : null,
      Boolean(patch.reviewedBy),
      patch.reviewedBy ?? null,
      Boolean(patch.ingestResult),
      patch.ingestResult ? JSON.stringify(patch.ingestResult) : null,
    ],
  );
  return toCandidate(updated);
}

function candidateIdentity(
  id: string,
  scope: BrainTenantScope,
): { clause: string; values: unknown[] } {
  const tenant = tenantWhere(scope);
  const values: unknown[] = [id, tenant.organizationId];
  const filters = ['id = $1', 'organization_id = $2'];
  if (tenant.projectId) {
    values.push(tenant.projectId);
    filters.push(`project_id = $${values.length}`);
  }
  return { clause: filters.join(' AND '), values };
}
