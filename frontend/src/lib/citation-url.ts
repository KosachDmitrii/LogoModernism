const BROWSABLE_PROTOCOLS = new Set(['http:', 'https:']);

export interface ResolvedCitationLink {
  href: string | null;
  label: string;
  kind: 'web' | 'pdf' | 'unavailable';
}

/** Turns stored citation URLs into safe UI links (pdf:// is internal, not browsable). */
export function resolveCitationLink(url: string): ResolvedCitationLink {
  const trimmed = url.trim();
  if (!trimmed) {
    return { href: null, label: '', kind: 'unavailable' };
  }

  if (trimmed.toLowerCase().startsWith('pdf://')) {
    const title = trimmed.slice('pdf://'.length).trim() || 'PDF';
    return { href: null, label: title, kind: 'pdf' };
  }

  try {
    const parsed = new URL(trimmed);
    if (BROWSABLE_PROTOCOLS.has(parsed.protocol)) {
      return { href: parsed.href, label: parsed.hostname, kind: 'web' };
    }
  } catch {
    // fall through
  }

  return { href: null, label: trimmed, kind: 'unavailable' };
}

export function isBrowsableCitationUrl(url: string): boolean {
  return resolveCitationLink(url).href != null;
}
