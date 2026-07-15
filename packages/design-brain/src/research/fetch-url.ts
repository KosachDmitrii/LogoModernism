import { gunzipSync } from 'node:zlib';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { Agent, fetch as undiciFetch } from 'undici';
import { fetchWithDeadline } from '@logo-platform/shared';
import { sanitizePostgresText } from '../storage/sanitize-text';
import { archiveIdentifierFromUrl, isArchiveUrl } from './archive-search';

const FETCH_TIMEOUT_MS = 60_000;
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const blockedAddresses = new BlockList();

for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['::ffff:0:0', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
] as const) {
  blockedAddresses.addSubnet(network, prefix, 'ipv6');
}

async function resolvePublicAddress(hostname: string): Promise<{
  address: string;
  family: 4 | 6;
}> {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '');
  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost')
  ) {
    throw new Error('Local network URLs are not allowed');
  }
  const literalFamily = isIP(normalizedHostname);
  const addresses = literalFamily
    ? [{ address: normalizedHostname, family: literalFamily }]
    : await lookup(normalizedHostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('URL hostname could not be resolved');
  for (const address of addresses) {
    const family = address.family === 6 ? 'ipv6' : 'ipv4';
    if (blockedAddresses.check(address.address, family)) {
      throw new Error('Private or non-routable network URLs are not allowed');
    }
  }
  return {
    address: addresses[0]!.address,
    family: addresses[0]!.family === 6 ? 6 : 4,
  };
}

async function readLimitedText(
  response: Awaited<ReturnType<typeof undiciFetch>>,
  maxBytes = MAX_PAGE_BYTES,
): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('Research page exceeds the maximum response size');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error('Research page exceeds the maximum response size');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString('utf8');
}

async function fetchPublicPage(
  initialUrl: URL,
): Promise<{ raw: string; contentType: string; finalUrl: URL }> {
  let current = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!['http:', 'https:'].includes(current.protocol) || current.username || current.password) {
      throw new Error('Only credential-free HTTP(S) URLs are supported');
    }
    const pinned = await resolvePublicAddress(current.hostname);
    const dispatcher = new Agent({
      connect: {
        lookup: (_hostname, _options, callback) =>
          callback(null, pinned.address, pinned.family),
      },
    });
    try {
      const response = await undiciFetch(current, {
        dispatcher,
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          'User-Agent': 'LogoModernism-DesignBrain/1.0 (research; +https://github.com)',
          Accept: 'text/html,application/xhtml+xml,text/plain',
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new Error('Research URL redirect has no location');
        if (redirectCount === MAX_REDIRECTS) {
          throw new Error('Research URL exceeded the redirect limit');
        }
        current = new URL(location, current);
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${current}`);
      const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (
        contentType &&
        !contentType.includes('text/html') &&
        !contentType.includes('application/xhtml+xml') &&
        !contentType.includes('text/plain')
      ) {
        await response.body?.cancel();
        throw new Error('Research URL returned an unsupported content type');
      }
      return {
        raw: await readLimitedText(response),
        contentType,
        finalUrl: current,
      };
    } finally {
      await dispatcher.close();
    }
  }
  throw new Error('Research URL exceeded the redirect limit');
}

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

  const response = await fetchWithDeadline(apiUrl, {}, { timeoutMs: FETCH_TIMEOUT_MS });
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
    const response = await fetchWithDeadline(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LogoModernism-DesignBrain/1.0 (research)' },
    }, { timeoutMs: FETCH_TIMEOUT_MS });

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
    const response = await fetchWithDeadline(fileUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LogoModernism-DesignBrain/1.0 (research)' },
      redirect: 'follow',
    }, { timeoutMs: FETCH_TIMEOUT_MS });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const text = decodeArchiveBuffer(buffer, fileName);
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
    const response = await fetchWithDeadline(`https://archive.org/details/${encodeURIComponent(identifier)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LogoModernism-DesignBrain/1.0 (research)' },
    }, { timeoutMs: FETCH_TIMEOUT_MS });

    if (!response.ok) return '';

    const html = await response.text();
    const descriptionMatch = html.match(
      /<div[^>]*id="descript"[^>]*>([\s\S]*?)<\/div>/i,
    );
    if (!descriptionMatch?.[1]) {
      return stripHtml(html);
    }

    return stripHtml(descriptionMatch[1]);
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
    return { title, text: description };
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
  if (parsed.username || parsed.password) {
    throw new Error('URLs containing credentials are not supported');
  }

  if (parsed.hostname === 'wikipedia.org' || parsed.hostname.endsWith('.wikipedia.org')) {
    const text = await fetchWikipediaArticleText(url);
    if (!text) {
      throw new Error('Could not extract Wikipedia article text');
    }
    return {
      title: decodeURIComponent(url.split('/wiki/')[1] ?? 'Wikipedia').replace(/_/g, ' '),
      text,
    };
  }

  if (isArchiveUrl(url)) {
    return fetchArchiveText(url);
  }

  const { raw, contentType, finalUrl } = await fetchPublicPage(parsed);
  const titleMatch = raw.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = sanitizePostgresText(titleMatch?.[1]?.trim()) ?? finalUrl.hostname;
  const text = contentType.includes('text/html') || contentType.includes('xhtml')
    ? stripHtml(raw)
    : raw.replace(/\s+/g, ' ').trim();

  if (text.length < 120) {
    throw new Error('Not enough readable text on this page');
  }
  return { title, text };
}
