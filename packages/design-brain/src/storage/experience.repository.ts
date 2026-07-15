import type {
  BrainExperienceRecord,
  BrainSourceType,
  LearnedPrincipleRecord,
  LearnedPrinciplesSort,
  PrincipleCitation,
  BrainTenantScope,
} from '@logo-platform/shared';
import { randomUUID } from 'node:crypto';
import type {
  BrainExperienceRow,
  DatabaseClient,
  LearnedPrincipleRow,
} from './database-types';
import { sanitizePostgresJson, sanitizePostgresText } from './sanitize-text';

export function toExperienceRecord(
  row: BrainExperienceRow,
  similarity?: number,
): BrainExperienceRecord {
  return {
    id: row.id,
    sourceType: row.sourceType as BrainSourceType,
    title: row.title,
    content: row.content,
    summary: row.summary,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    filePath: row.filePath,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    similarity,
  };
}

export function toLearnedPrincipleRecord(row: LearnedPrincipleRow): LearnedPrincipleRecord {
  return {
    id: row.id,
    category: row.category,
    ruleText: row.ruleText,
    promptFragment: row.promptFragment,
    weight: row.weight,
    confidence: row.confidence,
    sourceIds: row.sourceIds,
    antiPatterns: row.antiPatterns,
    tags: row.tags,
    citations: parseCitations(row.citations),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseCitations(value: unknown): PrincipleCitation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is PrincipleCitation =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as PrincipleCitation).url === 'string' &&
        typeof (item as PrincipleCitation).quote === 'string',
    )
    .map((item) => ({
      url: item.url,
      quote: item.quote,
    }));
}

function mergeCitations(
  existing: PrincipleCitation[],
  incoming?: PrincipleCitation,
): PrincipleCitation[] {
  if (!incoming?.url || !incoming.quote) return existing;

  const duplicate = existing.some(
    (item) => item.url === incoming.url && item.quote === incoming.quote,
  );
  if (duplicate) return existing;

  return [...existing, incoming].slice(-5);
}

export async function createExperience(
  client: DatabaseClient,
  input: {
    sourceType: BrainSourceType;
    title?: string;
    content: string;
    summary?: string;
    metadata?: Record<string, unknown>;
    filePath?: string;
    organizationId?: string;
    projectId?: string;
  },
): Promise<BrainExperienceRow> {
  return client.one<BrainExperienceRow>(
    `INSERT INTO design_brain_experiences
       (id, source_type, title, content, summary, metadata, file_path, organization_id, project_id, created_at, updated_at)
     VALUES ($1, $2::"BrainSourceType", $3, $4, $5, $6::jsonb, $7, $8, $9, NOW(), NOW())
     RETURNING *`,
    [
      randomUUID(),
      input.sourceType,
      sanitizePostgresText(input.title),
      sanitizePostgresText(input.content) ?? '',
      sanitizePostgresText(input.summary),
      JSON.stringify(sanitizePostgresJson(input.metadata ?? {})),
      sanitizePostgresText(input.filePath),
      input.organizationId ?? null,
      input.projectId ?? null,
    ],
  );
}

export async function listExperiences(
  client: DatabaseClient,
  options?: { sourceType?: BrainSourceType; limit?: number } & BrainTenantScope,
): Promise<BrainExperienceRecord[]> {
  const values: unknown[] = [];
  const filters = scopeFilters(values, options);
  if (options?.sourceType) {
    values.push(options.sourceType);
    filters.push(`source_type = $${values.length}::"BrainSourceType"`);
  }
  values.push(options?.limit ?? 100);
  const { rows } = await client.query<BrainExperienceRow>(
    `SELECT * FROM design_brain_experiences
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT $${values.length}`,
    values,
  );

  return rows.map((row) => toExperienceRecord(row));
}

export async function getExperienceById(
  client: DatabaseClient,
  id: string,
  scope?: BrainTenantScope,
): Promise<BrainExperienceRecord | null> {
  const values: unknown[] = [id];
  const filters = ['id = $1', ...scopeFilters(values, scope)];
  const row = await client.maybeOne<BrainExperienceRow>(
    `SELECT * FROM design_brain_experiences WHERE ${filters.join(' AND ')}`,
    values,
  );
  return row ? toExperienceRecord(row) : null;
}

export async function upsertLearnedPrinciple(
  client: DatabaseClient,
  input: {
    category: string;
    ruleText: string;
    promptFragment: string;
    confidence: number;
    sourceId: string;
    antiPatterns?: string[];
    tags?: string[];
    citation?: PrincipleCitation;
    organizationId?: string;
    projectId?: string;
  },
): Promise<LearnedPrincipleRow> {
  const promptFragment = sanitizePostgresText(input.promptFragment) ?? '';
  return client.transaction(async (tx) => {
    const values: unknown[] = [promptFragment];
    const filters = ['prompt_fragment = $1', ...scopeFilters(values, input)];
    const existing = await tx.maybeOne<LearnedPrincipleRow>(
      `SELECT * FROM learned_design_principles
       WHERE ${filters.join(' AND ')}
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE`,
      values,
    );

    if (existing) {
      const sourceIds = existing.sourceIds.includes(input.sourceId)
        ? existing.sourceIds
        : [...existing.sourceIds, input.sourceId];
      return tx.one<LearnedPrincipleRow>(
        `UPDATE learned_design_principles
         SET confidence = $2, weight = $3, source_ids = $4, anti_patterns = $5,
             tags = $6, citations = $7::jsonb, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          existing.id,
          Math.min(1, (existing.confidence + input.confidence) / 2 + 0.05),
          Math.min(2, existing.weight + 0.1),
          sourceIds,
          [...new Set([...existing.antiPatterns, ...(input.antiPatterns ?? [])])],
          [...new Set([...existing.tags, ...(input.tags ?? [])])],
          JSON.stringify(
            sanitizePostgresJson(mergeCitations(parseCitations(existing.citations), input.citation)),
          ),
        ],
      );
    }

    return tx.one<LearnedPrincipleRow>(
      `INSERT INTO learned_design_principles
         (id, category, rule_text, prompt_fragment, weight, confidence, source_ids,
          anti_patterns, tags, citations, organization_id, project_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9::jsonb, $10, $11, NOW(), NOW())
       RETURNING *`,
      [
        randomUUID(),
        sanitizePostgresText(input.category) ?? 'general',
        sanitizePostgresText(input.ruleText) ?? '',
        promptFragment,
        input.confidence,
        [input.sourceId],
        (input.antiPatterns ?? []).map((p) => sanitizePostgresText(p) ?? ''),
        (input.tags ?? []).map((t) => sanitizePostgresText(t) ?? ''),
        JSON.stringify(sanitizePostgresJson(input.citation ? [input.citation] : [])),
        input.organizationId ?? null,
        input.projectId ?? null,
      ],
    );
  });
}

export async function listLearnedPrinciples(
  client: DatabaseClient,
  limit = 100,
  offset = 0,
  options?: { category?: string; sort?: LearnedPrinciplesSort } & BrainTenantScope,
): Promise<LearnedPrincipleRecord[]> {
  const values: unknown[] = [];
  const filters = scopeFilters(values, options);
  if (options?.category) {
    values.push(options.category);
    filters.push(`category = $${values.length}`);
  }
  values.push(limit, offset);
  const { rows } = await client.query<LearnedPrincipleRow>(
    `SELECT * FROM learned_design_principles
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     ORDER BY ${principlesOrderBy(options?.sort)}
     LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return rows.map(toLearnedPrincipleRecord);
}

export async function countLearnedPrinciples(
  client: DatabaseClient,
  category?: string,
  scope?: BrainTenantScope,
): Promise<number> {
  const values: unknown[] = [];
  const filters = scopeFilters(values, scope);
  if (category) {
    values.push(category);
    filters.push(`category = $${values.length}`);
  }
  const row = await client.one<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM learned_design_principles
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}`,
    values,
  );
  return row.count;
}

export async function listLearnedPrincipleCategories(
  client: DatabaseClient,
  scope?: BrainTenantScope,
): Promise<Array<{ category: string; count: number }>> {
  const values: unknown[] = [];
  const filters = scopeFilters(values, scope);
  const { rows } = await client.query<{ category: string; count: number }>(
    `SELECT category, COUNT(*)::int AS count
     FROM learned_design_principles
     ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
     GROUP BY category
     ORDER BY category ASC`,
    values,
  );
  return rows;
}

function principlesOrderBy(sort: LearnedPrinciplesSort = 'influence_desc'): string {
  switch (sort) {
    case 'influence_asc':
      return 'weight ASC, confidence ASC';
    case 'category':
      return 'category ASC, weight DESC, confidence DESC';
    case 'influence_desc':
    default:
      return 'weight DESC, confidence DESC';
  }
}

function scopeFilters(
  values: unknown[],
  scope?: { organizationId?: string; projectId?: string },
): string[] {
  const filters: string[] = [];
  if (scope?.organizationId) {
    values.push(scope.organizationId);
    filters.push(`organization_id = $${values.length}`);
  }
  if (scope?.projectId) {
    values.push(scope.projectId);
    filters.push(`project_id = $${values.length}`);
  }
  return filters;
}
