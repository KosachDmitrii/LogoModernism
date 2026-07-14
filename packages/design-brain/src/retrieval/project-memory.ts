import type { BrainExperienceRecord } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
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
  prisma: PrismaClient,
  opts: { companyName?: string; industry?: string; limit?: number },
): Promise<BrainExperienceRecord[]> {
  const limit = opts.limit ?? 8;
  const companyName = opts.companyName?.trim();
  const industry = opts.industry?.trim();
  if (!companyName && !industry) return [];

  const query = [companyName, industry].filter(Boolean).join(' ');
  const [searchResult, feedbackRows] = await Promise.all([
    semanticSearch(prisma, { query, limit, minSimilarity: 0.4 }),
    prisma.brainExperience.findMany({
      where: {
        sourceType: 'FEEDBACK',
        OR: [
          companyName ? { content: { contains: companyName, mode: 'insensitive' } } : undefined,
          industry ? { content: { contains: industry, mode: 'insensitive' } } : undefined,
        ].filter(Boolean) as Array<{ content: { contains: string; mode: 'insensitive' } }>,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
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
