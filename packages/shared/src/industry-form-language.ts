import type { ClientVisualIntent } from './client-visual-intent';
import { buildIndustryDirection } from './industry-graph';

/** Penalized in prompt scoring — pulls image models toward clipart. */
export const LITERAL_INDUSTRY_PENALTY_TERMS = [
  'brick oven',
  'brick-oven',
  'pizza oven',
  'wood-fired',
  'oven arch',
  'hearth form',
  'open flame',
  'flame inside',
  'flame shape',
  'pizza slice',
  'pepperoni',
  'cheese drip',
  'food clipart',
  'pizza icon',
  'literal oven',
  'literal flame',
  'literal pizza',
];

/** Boosted in prompt scoring — abstract modernist form language. */
export const ABSTRACT_FORM_BOOST_TERMS = [
  'abstract form',
  'form language',
  'round focal',
  'quarter-circle',
  'quarter circle',
  'radial construction',
  'radial grid',
  'interlaced weave',
  'baseline grid',
  'ellipse construction',
  'bauhaus',
  'international typographic',
  'negative space',
  'neo-grotesque',
];

const LITERAL_PHRASE_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bbrick[- ]oven arch\b/gi, replacement: 'quarter-circle arc as negative space' },
  { pattern: /\bbrick[- ]oven\b/gi, replacement: 'round focal geometry' },
  { pattern: /\bpizza oven\b/gi, replacement: 'round focal geometry' },
  { pattern: /\bwood[- ]fired oven\b/gi, replacement: 'warm round focal geometry' },
  { pattern: /\boven arch\b/gi, replacement: 'quarter-circle arc' },
  { pattern: /\bround hearth geometry\b/gi, replacement: 'round focal geometry with quarter-circle arcs' },
  { pattern: /\bhearth form\b/gi, replacement: 'round focal form' },
  { pattern: /\babstract round hearth form\b/gi, replacement: 'abstract round focal form' },
  { pattern: /\bopen flame\b/gi, replacement: 'warm radial accent' },
  { pattern: /\bflame inside\b/gi, replacement: 'warm negative-space accent' },
  { pattern: /\bflame shape\b/gi, replacement: 'warm radial accent' },
  { pattern: /\bpizza slice\b/gi, replacement: 'abstract round form' },
  { pattern: /\bfood clipart\b/gi, replacement: 'literal food imagery' },
  { pattern: /\bpizza icon\b/gi, replacement: 'abstract symbol' },
  { pattern: /\bfood beverage brand\b/gi, replacement: '' },
  { pattern: /\bfood & beverage brand\b/gi, replacement: '' },
];

const MODERNIST_FORM_PHRASES = [
  'International Typographic Style with Bauhaus geometric system',
];

/** Generic modernist defaults — client-specific forbids come from DesignStrategy. */
export const DEFAULT_MODERNIST_AVOID = [
  'gradients',
  'photorealism',
  'mockups',
  'busy backgrounds',
  'stock clipart',
];

/** @deprecated Use buildClientAvoidFragments(strategy) instead */
export const ANTI_LITERAL_CLIPART_AVOID = DEFAULT_MODERNIST_AVOID;

export function buildClientAvoidFragments(
  forbiddenMotifs: string[] = [],
  extra: string[] = [],
): string[] {
  return [...new Set([...forbiddenMotifs, ...DEFAULT_MODERNIST_AVOID, ...extra])].filter(Boolean);
}

export function buildAbstractIndustryFragment(
  industry?: string,
  intent?: Pick<ClientVisualIntent, 'abstractionLevel' | 'desiredMotifs' | 'forbiddenMotifs'>,
): string {
  const label = industry?.trim() || 'the category';
  if (intent) {
    return buildIndustryDirection(
      label,
      intent.abstractionLevel,
      intent.desiredMotifs,
      intent.forbiddenMotifs,
    );
  }
  return (
    `Industry direction for ${label} (stylized): category cues through abstract form language, ` +
    'geometry, construction, and silhouette — not literal clipart'
  );
}

function isNegativeLiteralContext(text: string, index: number): boolean {
  const window = text.slice(Math.max(0, index - 40), index).toLowerCase();
  return /\b(?:no|not|never|avoid|without)\s+(?:literal\s+)?/.test(window);
}

function splitAvoidSection(text: string): { body: string; avoidSuffix: string } {
  const idx = text.search(/\bAvoid:\s*/i);
  if (idx === -1) {
    return { body: text, avoidSuffix: '' };
  }
  return {
    body: text.slice(0, idx).trim(),
    avoidSuffix: text.slice(idx).trim(),
  };
}

function sanitizeBodyLiteralLanguage(body: string): string {
  let result = body;

  for (const { pattern, replacement } of LITERAL_PHRASE_REPLACEMENTS) {
    result = result.replace(pattern, (match, ...args) => {
      const offset = typeof args[args.length - 2] === 'number' ? args[args.length - 2] : 0;
      if (isNegativeLiteralContext(result, offset)) return match;
      return replacement;
    });
  }

  return result
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,+/g, ', ')
    .replace(/\.\s*\./g, '.')
    .replace(/^\s*,\s*/, '')
    .trim();
}

export function sanitizeLiteralIndustryLanguage(text: string): string {
  const { body, avoidSuffix } = splitAvoidSection(text);
  const sanitizedBody = sanitizeBodyLiteralLanguage(body);
  if (!avoidSuffix) return sanitizedBody;
  return `${sanitizedBody} ${avoidSuffix}`.trim();
}

export function ensureModernistFormLanguage(text: string): string {
  const lower = text.toLowerCase();
  const needsModernistLayer =
    /pizza|restaurant|food|beverage|cafe|bakery|shop|dining|culinary/i.test(lower) ||
    lower.includes('combination mark') ||
    lower.includes('abstract form only') ||
    lower.includes('form language');

  if (!needsModernistLayer) return text;

  const missing = MODERNIST_FORM_PHRASES.filter((phrase) => !conceptPresent(lower, phrase));
  if (missing.length === 0) return text;

  const trimmed = text.replace(/\.\s*$/, '');
  return `${trimmed}. ${missing.slice(0, 2).join(', ')}`;
}

function conceptPresent(text: string, phrase: string): boolean {
  const tokens = phrase
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3);
  if (tokens.length === 0) return true;

  let hits = 0;
  for (const token of tokens) {
    if (text.includes(token)) hits++;
  }

  return hits / tokens.length >= 0.55;
}

export function countLiteralIndustryTerms(text: string): number {
  const lower = text.toLowerCase();
  return LITERAL_INDUSTRY_PENALTY_TERMS.filter((term) => lower.includes(term)).length;
}

export function countAbstractFormTerms(text: string): number {
  const lower = text.toLowerCase();
  return ABSTRACT_FORM_BOOST_TERMS.filter((term) => lower.includes(term)).length;
}

