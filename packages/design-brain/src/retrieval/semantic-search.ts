import type { BrainSearchRequest, BrainSearchResult, BrainSourceType } from '@logo-platform/shared';
import type { DatabaseClient } from '../storage/database-types';
import { embedText } from '../embedding/embedding.service';
import { getExperienceById, toExperienceRecord } from '../storage/experience.repository';
import { searchExperienceEmbeddings } from '../storage/pgvector';

export async function semanticSearch(
  client: DatabaseClient,
  request: BrainSearchRequest,
): Promise<BrainSearchResult> {
  const limit = Math.min(request.limit ?? 10, 50);
  const queryEmbedding = await embedText(request.query);
  const rows = await searchExperienceEmbeddings(
    client,
    queryEmbedding,
    limit,
    request.sourceType,
    request.organizationId,
    request.projectId,
  );

  const minSimilarity = request.minSimilarity ?? 0;
  const results = [];

  for (const row of rows) {
    if (row.similarity < minSimilarity) continue;

    const values: unknown[] = [row.experienceId];
    const filters = ['id = $1'];
    if (request.organizationId) {
      values.push(request.organizationId);
      filters.push(`organization_id = $${values.length}`);
    }
    if (request.projectId) {
      values.push(request.projectId);
      filters.push(`project_id = $${values.length}`);
    }
    const experience = await client.maybeOne<import('../storage/database-types').BrainExperienceRow>(
      `SELECT * FROM design_brain_experiences WHERE ${filters.join(' AND ')}`,
      values,
    );
    if (!experience) continue;

    results.push(toExperienceRecord(experience, row.similarity));
  }

  return {
    query: request.query,
    results,
    total: results.length,
  };
}

export async function getRelatedExperiences(
  client: DatabaseClient,
  experienceId: string,
  limit = 5,
): Promise<BrainSearchResult> {
  const experience = await getExperienceById(client, experienceId);
  if (!experience) {
    return { query: experienceId, results: [], total: 0 };
  }

  const query = [experience.title, experience.summary, experience.content.slice(0, 500)]
    .filter(Boolean)
    .join('\n');

  const search = await semanticSearch(client, {
    query,
    limit: limit + 1,
    sourceType: experience.sourceType as BrainSourceType,
  });

  return {
    query,
    results: search.results.filter((item) => item.id !== experienceId).slice(0, limit),
    total: search.results.filter((item) => item.id !== experienceId).length,
  };
}
