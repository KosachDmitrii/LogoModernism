/**
 * Convert polluted catalog / brief tags into prompt-safe human language.
 * Imported catalog often stores principle IDs (geo-angular, con-grid-based) in
 * geometry/construction/composition arrays — those must never reach image prompts.
 */

const PRINCIPLE_ID =
  /^(?:geo|con|comp|typ|era|mark|cx|col|fx|bal|insp|color|render)-[\w-]+$/i;

/** Map known principle IDs → short human vocabulary for Geometry / Construction / Composition. */
const PRINCIPLE_ID_TO_HUMAN: Record<string, string> = {
  'geo-circle': 'circle',
  'geo-square': 'square',
  'geo-triangle': 'triangle',
  'geo-angular': 'angular modular',
  'geo-concentric': 'concentric rings',
  'geo-interlocking': 'interlocking modules',
  'geo-fragmented': 'fragmented modular segments',
  'con-grid-based': 'modular grid',
  'con-modular-grid': 'modular grid',
  'con-equal-width-lines': 'equal-width lines',
  'comp-overlay': 'overlay composition',
  'comp-negative-space': 'negative space',
  'comp-symmetry': 'symmetry',
  'comp-integration': 'integrated lockup',
  'comp-stacked': 'stacked lockup',
  'typ-geometric-sans': 'geometric sans',
  'typ-custom-letterform': 'custom letterform',
  'typ-wordmark': 'wordmark',
  'typ-letter-combination': 'letter combination',
  'mark-combination-mark': 'combination mark',
  'mark-iconic-symbol': 'abstract symbol',
  'mark-lettermark': 'lettermark',
  'mark-emblem': 'emblem structure',
};

const NOISE_DESIGNERS = /^(unknown|n\/?a|none|anonymous|-)$/i;

export function isPrincipleIdToken(token: string): boolean {
  return PRINCIPLE_ID.test(token.trim());
}

export function humanizeCatalogTag(token: string): string | null {
  const raw = token.trim();
  if (!raw) return null;
  if (NOISE_DESIGNERS.test(raw)) return null;

  const lower = raw.toLowerCase();
  if (PRINCIPLE_ID_TO_HUMAN[lower]) return PRINCIPLE_ID_TO_HUMAN[lower];

  // Soft remap unknown principle-like ids: geo-foo → foo with spaces
  if (isPrincipleIdToken(raw)) {
    const body = raw.replace(/^(?:geo|con|comp|typ|era|mark|cx|col|fx|bal|insp|color|render)-/i, '');
    return body.replace(/-/g, ' ').trim() || null;
  }

  return raw;
}

export function sanitizeCatalogTagList(tags: string[] | undefined | null): string[] {
  if (!tags?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const human = humanizeCatalogTag(tag);
    if (!human) continue;
    const key = human.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(human);
  }
  return out;
}

/** Comma/space separated brief field → sanitized human tags string. */
export function sanitizeBriefTagField(value: string | undefined | null): string {
  if (!value?.trim()) return '';
  const parts = value
    .split(/[,;|]/)
    .flatMap((part) => part.trim().split(/\s{2,}/))
    .map((part) => part.trim())
    .filter(Boolean);
  return sanitizeCatalogTagList(parts).join(', ');
}

export function sanitizeDesignerName(designer: string | undefined | null): string | undefined {
  if (!designer?.trim()) return undefined;
  if (NOISE_DESIGNERS.test(designer.trim())) return undefined;
  return designer.trim();
}

/**
 * Strip labeled prompt sections that dump raw principle IDs
 * e.g. "Construction: con-grid-based." / "Composition: comp-overlay"
 */
export function stripPrincipleIdLabeledSections(text: string): string {
  let result = text
    .replace(/\s+by Unknown\b/gi, '')
    .replace(/\bInspired by\s+([\w-]+)\s+geometric construction\b/gi, (_m, token: string) => {
      const human = humanizeCatalogTag(token) ?? 'modular';
      return `Inspired by ${human} geometric construction`;
    })
    .replace(/\bcrafted from\s+([\w-]+)\s+shapes\b/gi, (_m, token: string) => {
      const human = humanizeCatalogTag(token) ?? 'modular geometric';
      return `crafted from ${human} shapes`;
    })
    .replace(/\bGeometry vocabulary:\s*([^.]+)\./gi, (_full, content: string) => {
      const cleaned = String(content)
        .split(/,\s*/)
        .map((part) => {
          const tokens = part.trim().split(/\s+/);
          return tokens
            .map((t) => (isPrincipleIdToken(t) ? humanizeCatalogTag(t) : t))
            .filter(Boolean)
            .join(' ');
        })
        .map((part) => part.trim())
        .filter(Boolean)
        .join(', ');
      return cleaned ? `Geometry vocabulary: ${cleaned}.` : '';
    })
    .replace(
      /\b(Construction|Composition):\s*([^.]+?)(?:\.|$)/gi,
      (full, label: string, content: string) => {
        const items = String(content)
          .split(/\s*,\s*/)
          .map((item) => item.trim())
          .filter(Boolean);
        // Only drop pure principle-ID dumps like "Construction: con-grid-based."
        if (items.length > 0 && items.every((item) => isPrincipleIdToken(item))) {
          return '';
        }
        // Leave human prose intact; preserve trailing period when present.
        return full.endsWith('.') ? full : `${label}: ${content.trim()}.`;
      },
    );

  return result.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').trim();
}

/**
 * Drop duplicate labeled Construction / Composition / Geometry vocabulary sections —
 * keep the first (usually richer) occurrence of each label.
 */
export function dedupeLabeledPromptSections(text: string): string {
  const labels = ['Geometry vocabulary', 'Construction', 'Composition', 'Typography', 'Color'];
  let result = text;
  for (const label of labels) {
    const re = new RegExp(`\\b${label}:\\s*[^.]+\\.`, 'gi');
    let seen = false;
    result = result.replace(re, (match) => {
      if (seen) return '';
      seen = true;
      return match;
    });
  }
  return result.replace(/\s{2,}/g, ' ').replace(/\s+\./g, '.').trim();
}
