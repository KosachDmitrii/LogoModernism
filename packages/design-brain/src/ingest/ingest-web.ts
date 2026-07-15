import type {
  BrainIngestResult,
  BrainResearchCandidate,
  BrainTenantScope,
} from '@logo-platform/shared';
import type { DatabaseClient } from '../storage/database-types';
import { embedText } from '../embedding/embedding.service';
import { createExperience, upsertLearnedPrinciple } from '../storage/experience.repository';
import { upsertExperienceEmbedding } from '../storage/pgvector';
import { sanitizePostgresText } from '../storage/sanitize-text';

export async function ingestWebResearch(
  client: DatabaseClient,
  candidate: BrainResearchCandidate,
  scope?: BrainTenantScope,
): Promise<BrainIngestResult> {
  const title = sanitizePostgresText(candidate.sourceTitle) ?? 'Web research';
  const content = sanitizePostgresText(candidate.extractedText) ?? '';
  const summary = sanitizePostgresText(candidate.summary) ?? undefined;

  const experience = await createExperience(client, {
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
    organizationId: scope?.organizationId,
    projectId: scope?.projectId,
  });

  const embedding = await embedText(`${title}\n${summary ?? ''}\n${content.slice(0, 800)}`);
  await upsertExperienceEmbedding(client, experience.id, embedding);

  let principlesExtracted = 0;
  for (const principle of candidate.principles) {
    await upsertLearnedPrinciple(client, {
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
      organizationId: scope?.organizationId,
      projectId: scope?.projectId,
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
