import type { BrainExperienceRecord, BrainTenantScope } from '@logo-platform/shared';
import type { BrainExperienceRow, DatabaseClient } from '../storage/database-types';
import { toExperienceRecord } from '../storage/experience.repository';
import { semanticSearch } from './semantic-search';

function metadataMatches(
  metadata: Record<string, unknown>,
  companyName?: string,
  industry?: string,
): boolean {
  const metaCompany = typeof metadata.companyName === 'string' ? metadata.companyName : '';
  const metaIndustry = typeof metadata.industry === 'string' ? metadata.industry : '';
  const companyMatch =
    companyName?.trim() &&
    metaCompany.toLowerCase().includes(companyName.trim().toLowerCase());
  const industryMatch =
    industry?.trim() && metaIndustry.toLowerCase().includes(industry.trim().toLowerCase());
  return Boolean(companyMatch || industryMatch);
}

export async function searchProjectMemory(
  client: DatabaseClient,
  opts: { companyName?: string; industry?: string; limit?: number } & BrainTenantScope,
): Promise<BrainExperienceRecord[]> {
  if (!opts.organizationId) {
    throw new Error('Organization scope is required for project memory search');
  }
  const limit = opts.limit ?? 8;
  const companyName = opts.companyName?.trim();
  const industry = opts.industry?.trim();
  if (!companyName && !industry) return [];

  const query = [companyName, industry].filter(Boolean).join(' ');
  const [searchResult, feedbackRows] = await Promise.all([
    semanticSearch(client, {
      query,
      limit,
      minSimilarity: 0.4,
      organizationId: opts.organizationId,
      projectId: opts.projectId,
    }),
    findFeedbackRows(client, opts.organizationId, opts.projectId, companyName, industry, limit),
  ]);

  const seen = new Set<string>();
  const merged: BrainExperienceRecord[] = [];

  const push = (record: BrainExperienceRecord) => {
    if (seen.has(record.id)) return;
    seen.add(record.id);
    merged.push(record);
  };

  for (const row of feedbackRows) {
    push(toExperienceRecord(row));
  }

  for (const record of searchResult.results) {
    const meta = record.metadata ?? {};
    const contentHit =
      (companyName && record.content.toLowerCase().includes(companyName.toLowerCase())) ||
      (industry && record.content.toLowerCase().includes(industry.toLowerCase()));
    if (contentHit || metadataMatches(meta, companyName, industry)) {
      push(record);
    }
  }

  return merged.slice(0, limit);
}

async function findFeedbackRows(
  client: DatabaseClient,
  organizationId: string,
  projectId: string | undefined,
  companyName: string | undefined,
  industry: string | undefined,
  limit: number,
): Promise<BrainExperienceRow[]> {
  const values: unknown[] = [organizationId];
  const filters = [`source_type = 'FEEDBACK'::"BrainSourceType"`, 'organization_id = $1'];
  if (projectId) {
    values.push(projectId);
    filters.push(`project_id = $${values.length}`);
  }
  const contentFilters: string[] = [];
  for (const term of [companyName, industry]) {
    if (!term) continue;
    values.push(`%${term}%`);
    contentFilters.push(`content ILIKE $${values.length}`);
  }
  if (contentFilters.length) filters.push(`(${contentFilters.join(' OR ')})`);
  values.push(limit);
  const { rows } = await client.query<BrainExperienceRow>(
    `SELECT * FROM design_brain_experiences
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return rows;
}
