import { gunzipSync } from 'node:zlib';
import { sanitizePostgresText } from '../storage/sanitize-text';
import { archiveIdentifierFromUrl, isArchiveUrl } from './archive-search';

const MAX_BYTES = 500_000;
const MAX_TEXT_LENGTH = 12_000;
const FETCH_TIMEOUT_MS = 20_000;

function stripHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const text = withoutScripts
    .replace(/<\/(p|div|h\d|li|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');

  return text.replace(/\s+/g, ' ').trim();
}

async function fetchWikipediaArticleText(url: string): Promise<string> {
  const title = decodeURIComponent(url.split('/wiki/')[1] ?? '').replace(/_/g, ' ');
  if (!title) return '';

  const apiUrl = new URL('https://en.wikipedia.org/w/api.php');
  apiUrl.searchParams.set('action', 'query');
  apiUrl.searchParams.set('prop', 'extracts');
  apiUrl.searchParams.set('explaintext', '1');
  apiUrl.searchParams.set('titles', title);
  apiUrl.searchParams.set('format', 'json');
  apiUrl.searchParams.set('origin', '*');

  const response = await fetch(apiUrl);
  if (!response.ok) return '';

  const data = (await response.json()) as {
    query?: { pages?: Record<string, { extract?: string; title?: string }> };
  };

  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.extract?.trim() ?? '';
}

interface ArchiveFile {
  name?: string;
  format?: string;
}

interface ArchiveMetadata {
  metadata?: { title?: string; description?: string };
  files?: ArchiveFile[];
}

async function fetchArchiveMetadata(identifier: string): Promise<ArchiveMetadata | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LogoModernism-DesignBrain/1.0 (research)' },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as ArchiveMetadata;
    if (!data.metadata && !data.files?.length) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function rankArchiveTextFiles(files: ArchiveFile[]): string[] {
  const names = files
    .map((file) => file.name)
    .filter((name): name is string => Boolean(name))
    .filter((name) => /\.(txt|gz)$/i.test(name));

  const score = (name: string): number => {
    const lower = name.toLowerCase();
    if (lower.includes('hocr_searchtext')) return 100;
    if (lower.endsWith('_djvu.txt')) return 90;
    if (lower.endsWith('.txt')) return 80;
    if (lower.endsWith('.txt.gz')) return 70;
    return 0;
  };

  return [...names].sort((a, b) => score(b) - score(a));
}

function decodeArchiveBuffer(buffer: ArrayBuffer, fileName: string): string {
  const bytes = Buffer.from(buffer);
  const decoded =
    fileName.toLowerCase().endsWith('.gz') ? gunzipSync(bytes) : bytes;

  return decoded
    .toString('utf-8')
    .replace(/\s+/g, ' ')
    .trim();
}

async function downloadArchiveFile(
  identifier: string,
  fileName: string,
): Promise<string | null> {
  const fileUrl = `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(fileUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LogoModernism-DesignBrain/1.0 (research)' },
      redirect: 'follow',
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const slice = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;
    const text = decodeArchiveBuffer(slice, fileName).slice(0, MAX_TEXT_LENGTH);
    return text.length >= 120 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchArchiveDetailsDescription(identifier: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`https://archive.org/details/${encodeURIComponent(identifier)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LogoModernism-DesignBrain/1.0 (research)' },
    });

    if (!response.ok) return '';

    const html = await response.text();
    const descriptionMatch = html.match(
      /<div[^>]*id="descript"[^>]*>([\s\S]*?)<\/div>/i,
    );
    if (!descriptionMatch?.[1]) {
      return stripHtml(html).slice(0, MAX_TEXT_LENGTH);
    }

    return stripHtml(descriptionMatch[1]).slice(0, MAX_TEXT_LENGTH);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function fetchArchiveText(url: string): Promise<{ title: string; text: string }> {
  const identifier = archiveIdentifierFromUrl(url);
  if (!identifier) {
    throw new Error('Could not parse Internet Archive identifier from URL');
  }

  const metadata = await fetchArchiveMetadata(identifier);
  if (!metadata) {
    throw new Error(
      `Archive item "${identifier}" was not found. Try a valid URL such as https://archive.org/details/logo-modernism`,
    );
  }

  const title =
    sanitizePostgresText(metadata.metadata?.title) ??
    sanitizePostgresText(identifier.replace(/[-_]/g, ' ')) ??
    identifier;

  const rankedFiles = rankArchiveTextFiles(metadata.files ?? []);
  for (const fileName of rankedFiles) {
    const text = await downloadArchiveFile(identifier, fileName);
    if (text) {
      return { title, text };
    }
  }

  const description =
    metadata.metadata?.description?.replace(/\s+/g, ' ').trim() ??
    (await fetchArchiveDetailsDescription(identifier));

  if (description.length >= 120) {
    return { title, text: description.slice(0, MAX_TEXT_LENGTH) };
  }

  throw new Error(
    `Archive item "${identifier}" has no OCR text files. This is likely a scan-only book — upload the PDF in the Learn tab (Google Vision OCR will run automatically). Try https://archive.org/details/logo-modernism for a version with text.`,
  );
}

export async function fetchUrlText(url: string): Promise<{ title: string; text: string }> {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP(S) URLs are supported');
  }

  if (parsed.hostname.includes('wikipedia.org')) {
    const text = await fetchWikipediaArticleText(url);
    if (!text) {
      throw new Error('Could not extract Wikipedia article text');
    }
    return {
      title: decodeURIComponent(url.split('/wiki/')[1] ?? 'Wikipedia').replace(/_/g, ' '),
      text: text.slice(0, MAX_TEXT_LENGTH),
    };
  }

  if (isArchiveUrl(url)) {
    return fetchArchiveText(url);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'LogoModernism-DesignBrain/1.0 (research; +https://github.com)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const buffer = await response.arrayBuffer();
    const truncated = buffer.byteLength > MAX_BYTES;
    const slice = truncated ? buffer.slice(0, MAX_BYTES) : buffer;

    const raw = new TextDecoder('utf-8', { fatal: false }).decode(slice);
    const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = sanitizePostgresText(titleMatch?.[1]?.trim()) ?? parsed.hostname;

    const text = contentType.includes('text/html')
      ? stripHtml(raw).slice(0, MAX_TEXT_LENGTH)
      : raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);

    if (text.length < 120) {
      throw new Error('Not enough readable text on this page');
    }

    if (truncated) {
      console.info(`[design-brain] truncated large page to ${MAX_BYTES} bytes: ${url}`);
    }

    return { title, text };
  } finally {
    clearTimeout(timer);
  }
}
