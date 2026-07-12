import type {
  BrainExperienceRecord,
  BrainSourceType,
  LearnedPrincipleRecord,
  LearnedPrinciplesSort,
  PrincipleCitation,
} from '@logo-platform/shared';
import type { BrainExperience, LearnedPrinciple, Prisma, PrismaClient } from '@logo-platform/database';
import { sanitizePostgresJson, sanitizePostgresText } from './sanitize-text';

export function toExperienceRecord(
  row: BrainExperience,
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

export function toLearnedPrincipleRecord(row: LearnedPrinciple): LearnedPrincipleRecord {
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
  prisma: PrismaClient,
  input: {
    sourceType: BrainSourceType;
    title?: string;
    content: string;
    summary?: string;
    metadata?: Record<string, unknown>;
    filePath?: string;
  },
): Promise<BrainExperience> {
  return prisma.brainExperience.create({
    data: {
      sourceType: input.sourceType,
      title: sanitizePostgresText(input.title),
      content: sanitizePostgresText(input.content) ?? '',
      summary: sanitizePostgresText(input.summary),
      metadata: sanitizePostgresJson(input.metadata ?? {}) as Prisma.InputJsonValue,
      filePath: sanitizePostgresText(input.filePath),
    },
  });
}

export async function listExperiences(
  prisma: PrismaClient,
  options?: { sourceType?: BrainSourceType; limit?: number },
): Promise<BrainExperienceRecord[]> {
  const rows = await prisma.brainExperience.findMany({
    where: options?.sourceType ? { sourceType: options.sourceType } : undefined,
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 100,
  });

  return rows.map((row) => toExperienceRecord(row));
}

export async function getExperienceById(
  prisma: PrismaClient,
  id: string,
): Promise<BrainExperienceRecord | null> {
  const row = await prisma.brainExperience.findUnique({ where: { id } });
  return row ? toExperienceRecord(row) : null;
}

export async function upsertLearnedPrinciple(
  prisma: PrismaClient,
  input: {
    category: string;
    ruleText: string;
    promptFragment: string;
    confidence: number;
    sourceId: string;
    antiPatterns?: string[];
    tags?: string[];
    citation?: PrincipleCitation;
  },
): Promise<LearnedPrinciple> {
  const promptFragment = sanitizePostgresText(input.promptFragment) ?? '';
  const existing = await prisma.learnedPrinciple.findFirst({
    where: { promptFragment },
  });

  if (existing) {
    const sourceIds = existing.sourceIds.includes(input.sourceId)
      ? existing.sourceIds
      : [...existing.sourceIds, input.sourceId];

    return prisma.learnedPrinciple.update({
      where: { id: existing.id },
      data: {
        confidence: Math.min(1, (existing.confidence + input.confidence) / 2 + 0.05),
        weight: Math.min(2, existing.weight + 0.1),
        sourceIds,
        antiPatterns: [...new Set([...existing.antiPatterns, ...(input.antiPatterns ?? [])])],
        tags: [...new Set([...existing.tags, ...(input.tags ?? [])])],
        citations: sanitizePostgresJson(
          mergeCitations(parseCitations(existing.citations), input.citation),
        ) as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.learnedPrinciple.create({
    data: {
      category: sanitizePostgresText(input.category) ?? 'general',
      ruleText: sanitizePostgresText(input.ruleText) ?? '',
      promptFragment,
      confidence: input.confidence,
      sourceIds: [input.sourceId],
      antiPatterns: (input.antiPatterns ?? []).map((p) => sanitizePostgresText(p) ?? ''),
      tags: (input.tags ?? []).map((t) => sanitizePostgresText(t) ?? ''),
      citations: sanitizePostgresJson(input.citation ? [input.citation] : []) as Prisma.InputJsonValue,
    },
  });
}

export async function listLearnedPrinciples(
  prisma: PrismaClient,
  limit = 100,
  offset = 0,
  options?: { category?: string; sort?: LearnedPrinciplesSort },
): Promise<LearnedPrincipleRecord[]> {
  const where = options?.category ? { category: options.category } : undefined;
  const orderBy = principlesOrderBy(options?.sort);

  const rows = await prisma.learnedPrinciple.findMany({
    where,
    orderBy,
    take: limit,
    skip: offset,
  });
  return rows.map(toLearnedPrincipleRecord);
}

export async function countLearnedPrinciples(
  prisma: PrismaClient,
  category?: string,
): Promise<number> {
  return prisma.learnedPrinciple.count({
    where: category ? { category } : undefined,
  });
}

export async function listLearnedPrincipleCategories(
  prisma: PrismaClient,
): Promise<Array<{ category: string; count: number }>> {
  const rows = await prisma.learnedPrinciple.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { category: 'asc' },
  });
  return rows.map((row) => ({
    category: row.category,
    count: row._count.category,
  }));
}

function principlesOrderBy(sort: LearnedPrinciplesSort = 'influence_desc') {
  switch (sort) {
    case 'influence_asc':
      return [{ weight: 'asc' as const }, { confidence: 'asc' as const }];
    case 'category':
      return [
        { category: 'asc' as const },
        { weight: 'desc' as const },
        { confidence: 'desc' as const },
      ];
    case 'influence_desc':
    default:
      return [{ weight: 'desc' as const }, { confidence: 'desc' as const }];
  }
}
