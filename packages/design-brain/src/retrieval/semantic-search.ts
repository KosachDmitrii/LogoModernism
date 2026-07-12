import type { BrainSearchRequest, BrainSearchResult, BrainSourceType } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { embedText } from '../embedding/embedding.service';
import { getExperienceById, toExperienceRecord } from '../storage/experience.repository';
import { searchExperienceEmbeddings } from '../storage/pgvector';

export async function semanticSearch(
  prisma: PrismaClient,
  request: BrainSearchRequest,
): Promise<BrainSearchResult> {
  const limit = Math.min(request.limit ?? 10, 50);
  const queryEmbedding = await embedText(request.query);
  const rows = await searchExperienceEmbeddings(
    prisma,
    queryEmbedding,
    limit,
    request.sourceType,
  );

  const minSimilarity = request.minSimilarity ?? 0;
  const results = [];

  for (const row of rows) {
    if (row.similarity < minSimilarity) continue;

    const experience = await prisma.brainExperience.findUnique({
      where: { id: row.experience_id },
    });
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
  prisma: PrismaClient,
  experienceId: string,
  limit = 5,
): Promise<BrainSearchResult> {
  const experience = await getExperienceById(prisma, experienceId);
  if (!experience) {
    return { query: experienceId, results: [], total: 0 };
  }

  const query = [experience.title, experience.summary, experience.content.slice(0, 500)]
    .filter(Boolean)
    .join('\n');

  const search = await semanticSearch(prisma, {
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
