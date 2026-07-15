import type { BrainResearchHit } from '@logo-platform/shared';
import { fetchWithDeadline } from '@logo-platform/shared';

function archiveDetailsUrl(identifier: string): string {
  return `https://archive.org/details/${identifier}`;
}

export async function searchInternetArchive(
  query: string,
  maxResults: number,
  verbatim = false,
): Promise<BrainResearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const searchQuery = verbatim
    ? trimmed
    : `${trimmed} logo design typography identity`;

  const url = new URL('https://archive.org/advancedsearch.php');
  url.searchParams.set('q', `(${searchQuery}) AND mediatype:texts`);
  url.searchParams.set('fl[]', 'identifier');
  url.searchParams.set('fl[]', 'title');
  url.searchParams.set('fl[]', 'description');
  url.searchParams.set('rows', String(Math.min(maxResults, 8)));
  url.searchParams.set('output', 'json');

  const response = await fetchWithDeadline(url, {}, { timeoutMs: 10_000 });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    response?: {
      docs?: Array<{ identifier?: string; title?: string; description?: string }>;
    };
  };

  return (data.response?.docs ?? [])
    .filter((doc) => doc.identifier)
    .map((doc) => ({
      url: archiveDetailsUrl(doc.identifier!),
      title: doc.title ?? doc.identifier!,
      snippet: (doc.description ?? '').slice(0, 400),
      source: 'archive' as const,
      searchQuery: query,
    }));
}

export function isArchiveUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'archive.org';
  } catch {
    return false;
  }
}

export function archiveIdentifierFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] === 'details' || parts[0] === 'stream' || parts[0] === 'download') {
      return parts[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
