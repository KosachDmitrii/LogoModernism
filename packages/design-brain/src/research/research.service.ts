import type {
  BrainIngestResult,
  BrainResearchCandidate,
  BrainResearchHit,
  BrainResearchPrinciplePreview,
  BrainResearchRunResult,
} from '@logo-platform/shared';
import type { PrismaClient } from '@logo-platform/database';
import { extractPrinciplesFromText, summarizeText } from '../ingest/principle-extractor';
import { ingestWebResearch } from '../ingest/ingest-web';
import { expandResearchQueries } from './query-expander';
import { searchOpenWeb } from './web-search';
import { fetchUrlText } from './fetch-url';
import { rankResearchHits, scoreResearchHit } from './source-scorer';
import {
  findCandidateByUrl,
  getResearchCandidate,
  listResearchCandidates,
  saveResearchCandidate,
  updateResearchCandidate,
} from './candidates';

function withCitations(
  principles: BrainResearchPrinciplePreview[],
  sourceUrl: string,
  sourceText: string,
): BrainResearchPrinciplePreview[] {
  return principles.map((principle) => ({
    ...principle,
    citationUrl: sourceUrl,
    citationQuote:
      principle.citationQuote?.trim() ||
      findSupportingQuote(sourceText, principle.ruleText, principle.promptFragment),
  }));
}

function findSupportingQuote(
  sourceText: string,
  ruleText: string,
  promptFragment: string,
): string {
  const sentences = sourceText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 40);

  const keywords = `${ruleText} ${promptFragment}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4);

  let best = '';
  let bestScore = 0;

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const score = keywords.reduce((total, word) => (lower.includes(word) ? total + 1 : total), 0);
    if (score > bestScore) {
      bestScore = score;
      best = sentence;
    }
  }

  return best.slice(0, 220);
}

async function buildCandidateFromUrl(
  topic: string,
  url: string,
  searchQuery: string,
  fallbackTitle?: string,
  fallbackSnippet?: string,
  initialScore?: number,
): Promise<BrainResearchCandidate> {
  const existing = findCandidateByUrl(url);
  if (existing && existing.status === 'pending') {
    return existing;
  }
  if (existing && existing.status === 'approved') {
    return existing;
  }

  const fetched = await fetchUrlText(url);
  const text = fetched.text;
  const summary = await summarizeText(text, fetched.title);
  const extracted = await extractPrinciplesFromText(
    text,
    `Web research topic: ${topic}. Search phrase: ${searchQuery}`,
  );
  const principles = withCitations(extracted, url, text);
  const sourceScore = scoreResearchHit(
    {
      url,
      title: fetched.title || fallbackTitle || url,
      snippet: fallbackSnippet || summary.slice(0, 280),
      source: 'tavily',
      searchQuery,
    },
    text,
  );

  return saveResearchCandidate({
    query: topic,
    sourceUrl: url,
    sourceTitle: fetched.title || fallbackTitle || url,
    snippet: fallbackSnippet || summary.slice(0, 280),
    summary,
    extractedText: text,
    principles,
    sourceScore: initialScore ?? sourceScore,
    status: 'pending',
  });
}

async function collectHitsFromQueries(
  generatedQueries: string[],
  maxSources: number,
): Promise<BrainResearchHit[]> {
  const seenUrls = new Set<string>();
  const allHits: BrainResearchHit[] = [];
  const perQuery = Math.max(1, Math.ceil(maxSources / Math.max(generatedQueries.length, 1)));

  for (const searchQuery of generatedQueries) {
    if (allHits.length >= maxSources) break;

    const hits = await searchOpenWeb(searchQuery, perQuery, { verbatim: true });
    for (const hit of hits) {
      if (allHits.length >= maxSources * 2) break;
      if (seenUrls.has(hit.url)) continue;
      seenUrls.add(hit.url);
      allHits.push(hit);
    }
  }

  return rankResearchHits(allHits).slice(0, maxSources);
}

export async function runWebResearch(
  topic: string,
  maxSources = 30,
): Promise<BrainResearchRunResult> {
  const trimmedTopic = topic.trim();
  if (!trimmedTopic) {
    return {
      topic: '',
      query: '',
      generatedQueries: [],
      discoveredQueries: [],
      hits: [],
      candidates: [],
      skippedUrls: [],
    };
  }

  const { selectedQueries, discoveredQueries } = await expandResearchQueries(trimmedTopic);
  const hits = await collectHitsFromQueries(
    selectedQueries,
    Math.min(maxSources, 35),
  );
  const candidates: BrainResearchCandidate[] = [];
  const skippedUrls: string[] = [];
  const seenCandidateIds = new Set<string>();

  for (const hit of hits) {
    const existing = findCandidateByUrl(hit.url);
    if (existing?.status === 'approved' || existing?.status === 'pending') {
      skippedUrls.push(hit.url);
      if (existing.status === 'pending' && !seenCandidateIds.has(existing.id)) {
        candidates.push(existing);
        seenCandidateIds.add(existing.id);
      }
      continue;
    }

    try {
      const candidate = await buildCandidateFromUrl(
        trimmedTopic,
        hit.url,
        hit.searchQuery ?? trimmedTopic,
        hit.title,
        hit.snippet,
        hit.sourceScore,
      );
      if (!seenCandidateIds.has(candidate.id)) {
        candidates.push(candidate);
        seenCandidateIds.add(candidate.id);
      }
    } catch (error) {
      skippedUrls.push(hit.url);
      console.warn('[design-brain] research fetch failed:', hit.url, error);
    }
  }

  return {
    topic: trimmedTopic,
    query: trimmedTopic,
    generatedQueries: selectedQueries,
    discoveredQueries,
    hits,
    candidates,
    skippedUrls,
  };
}

export async function previewWebResearch(
  query: string,
  url: string,
): Promise<BrainResearchCandidate> {
  return buildCandidateFromUrl(query, url, query);
}

export function listCandidates(status?: BrainResearchCandidate['status']) {
  return listResearchCandidates(status);
}

export function getCandidate(id: string) {
  return getResearchCandidate(id);
}

export async function approveResearchCandidate(
  prisma: PrismaClient,
  id: string,
): Promise<{ candidate: BrainResearchCandidate; ingest: BrainIngestResult }> {
  const candidate = getResearchCandidate(id);
  if (!candidate) {
    throw new Error(`Research candidate not found: ${id}`);
  }
  if (candidate.status === 'approved') {
    throw new Error('Candidate is already approved');
  }

  const ingest = await ingestWebResearch(prisma, candidate);
  const updated = updateResearchCandidate(id, {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    ingestResult: ingest,
  });

  return { candidate: updated, ingest };
}

export function rejectResearchCandidate(id: string): BrainResearchCandidate {
  const candidate = getResearchCandidate(id);
  if (!candidate) {
    throw new Error(`Research candidate not found: ${id}`);
  }

  return updateResearchCandidate(id, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
  });
}
