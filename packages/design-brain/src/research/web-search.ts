import type { BrainResearchHit } from '@logo-platform/shared';
import { rankResearchHits } from './source-scorer';
import { searchInternetArchive } from './archive-search';

const TRUSTED_DOMAINS = [
  'wikipedia.org',
  'archive.org',
  'aiga.org',
  'design.org',
  'identitydesigned.com',
  'fonts.google.com',
  'fontsinuse.com',
  'typewolf.com',
  'practicaltypography.com',
  'smashingmagazine.com',
  'creativebloq.com',
  'logodesignlove.com',
  'underconsideration.com',
  'britannica.com',
  'nngroup.com',
];

function isTrustedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return TRUSTED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function searchTavily(
  query: string,
  maxResults: number,
  verbatim = false,
): Promise<BrainResearchHit[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query: verbatim ? query : `${query} logo design typography branding`,
      max_results: maxResults,
      search_depth: 'basic',
      include_domains: TRUSTED_DOMAINS,
    }),
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    results?: Array<{ url?: string; title?: string; content?: string }>;
  };

  return (data.results ?? [])
    .filter((row) => row.url && isTrustedUrl(row.url))
    .map((row) => ({
      url: row.url!,
      title: row.title ?? row.url!,
      snippet: (row.content ?? '').slice(0, 400),
      source: 'tavily' as const,
      searchQuery: query,
    }));
}

async function searchBrave(
  query: string,
  maxResults: number,
  verbatim = false,
): Promise<BrainResearchHit[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
  searchUrl.searchParams.set('q', verbatim ? query : `${query} logo design typography branding`);
  searchUrl.searchParams.set('count', String(Math.min(maxResults, 10)));

  const response = await fetch(searchUrl, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) return [];

  const data = (await response.json()) as {
    web?: { results?: Array<{ url?: string; title?: string; description?: string }> };
  };

  return (data.web?.results ?? [])
    .filter((row) => row.url && isTrustedUrl(row.url))
    .map((row) => ({
      url: row.url!,
      title: row.title ?? row.url!,
      snippet: (row.description ?? '').slice(0, 400),
      source: 'brave' as const,
      searchQuery: query,
    }));
}

async function searchWikipedia(
  query: string,
  maxResults: number,
  verbatim = false,
): Promise<BrainResearchHit[]> {
  const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
  searchUrl.searchParams.set('action', 'opensearch');
  searchUrl.searchParams.set('search', verbatim ? query : `${query} logo design`);
  searchUrl.searchParams.set('limit', String(maxResults));
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('origin', '*');

  const response = await fetch(searchUrl);
  if (!response.ok) return [];

  const data = (await response.json()) as [string, string[], string[], string[]];
  const titles = data[1] ?? [];
  const descriptions = data[2] ?? [];
  const urls = data[3] ?? [];

  return urls.map((url, index) => ({
    url,
    title: titles[index] ?? url,
    snippet: descriptions[index] ?? '',
    source: 'wikipedia' as const,
    searchQuery: query,
  }));
}

function mergeHits(hits: BrainResearchHit[], limit: number): BrainResearchHit[] {
  const seen = new Set<string>();
  const merged: BrainResearchHit[] = [];

  for (const hit of rankResearchHits(hits)) {
    if (merged.length >= limit) break;
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    merged.push(hit);
  }

  return merged;
}

export async function searchOpenWeb(
  query: string,
  maxResults = 5,
  options?: { verbatim?: boolean },
): Promise<BrainResearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const verbatim = options?.verbatim ?? false;
  const limit = Math.min(maxResults, 8);
  const perEngine = Math.max(2, Math.ceil(limit / 2));

  const [tavilyHits, wikiHits, braveHits, archiveHits] = await Promise.all([
    searchTavily(trimmed, perEngine, verbatim),
    searchWikipedia(trimmed, perEngine, verbatim),
    searchBrave(trimmed, perEngine, verbatim),
    searchInternetArchive(trimmed, perEngine, verbatim),
  ]);

  return mergeHits([...tavilyHits, ...wikiHits, ...braveHits, ...archiveHits], limit);
}

export function getTrustedDomains(): string[] {
  return [...TRUSTED_DOMAINS];
}
