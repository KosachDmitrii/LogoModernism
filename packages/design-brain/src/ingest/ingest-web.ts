import type { BrainIngestResult, BrainResearchCandidate } from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { embedText } from '../embedding/embedding.service';
import { createExperience, upsertLearnedPrinciple } from '../storage/experience.repository';
import { upsertExperienceEmbedding } from '../storage/pgvector';
import { sanitizePostgresText } from '../storage/sanitize-text';

export async function ingestWebResearch(
  prisma: PrismaClient,
  candidate: BrainResearchCandidate,
): Promise<BrainIngestResult> {
  const title = sanitizePostgresText(candidate.sourceTitle) ?? 'Web research';
  const content = sanitizePostgresText(candidate.extractedText) ?? '';
  const summary = sanitizePostgresText(candidate.summary) ?? undefined;

  const experience = await createExperience(prisma, {
    sourceType: 'TEXT',
    title,
    content,
    summary,
    metadata: {
      kind: 'web_research',
      approved: true,
      sourceUrl: candidate.sourceUrl,
      query: candidate.query,
      researchCandidateId: candidate.id,
      curated: true,
    },
  });

  const embedding = await embedText(`${title}\n${summary ?? ''}\n${content.slice(0, 800)}`);
  await upsertExperienceEmbedding(prisma, experience.id, embedding);

  let principlesExtracted = 0;
  for (const principle of candidate.principles) {
    await upsertLearnedPrinciple(prisma, {
      category: principle.category,
      ruleText: principle.ruleText,
      promptFragment: principle.promptFragment,
      confidence: principle.confidence,
      sourceId: experience.id,
      antiPatterns: principle.antiPatterns,
      tags: [...(principle.tags ?? []), 'web_research'],
      citation:
        principle.citationQuote && (principle.citationUrl || candidate.sourceUrl)
          ? {
              url: principle.citationUrl ?? candidate.sourceUrl,
              quote: principle.citationQuote,
            }
          : undefined,
    });
    principlesExtracted += 1;
  }

  return {
    experienceId: experience.id,
    sourceType: 'TEXT',
    title,
    chunksStored: 1,
    principlesExtracted,
    summary: `Approved web research from ${candidate.sourceUrl}`,
  };
}
