import type { MinimalismLevel } from './types';
import { resolveColorSelections, sanitizeCompositionField } from '@logo-platform/shared';

const ERA_ALIASES: Record<string, string> = {
  swiss: 'International Typographic Style',
  bauhaus: 'Bauhaus geometric system',
  international_style: 'International Typographic Style',
  corporate_identity: 'Corporate identity modernism',
  '1960s': '1960s corporate identity',
  '1970s': '1970s systematic identity',
  mid_century: 'Mid-century modernist identity',
};

const SCORE_DUMP = /\(\d+\s*\/\s*10\)|general geometric foundation|geometry intelligence/i;
const PRINCIPLE_ID = /\b(?:geo|con|comp|cx|era|insp)-[a-z0-9-]+\b/gi;

export function sanitizeIngressText(text: string): string {
  return text
    .replace(SCORE_DUMP, '')
    .replace(PRINCIPLE_ID, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim();
}

export function canonicalizeEra(era?: string, preferredEra?: string): string {
  const raw = sanitizeIngressText(era ?? preferredEra ?? '');
  if (!raw) return 'International Typographic Style';

  const key = raw.toLowerCase().replace(/\s+/g, '_').trim();
  if (ERA_ALIASES[key]) return ERA_ALIASES[key];

  if (/bauhaus/i.test(raw)) return ERA_ALIASES.bauhaus;
  if (/1960|sixties/i.test(raw)) return ERA_ALIASES['1960s'];
  if (/1970|seventies/i.test(raw)) return ERA_ALIASES['1970s'];
  if (/corporate/i.test(raw)) return ERA_ALIASES.corporate_identity;
  if (/international|typographic|swiss/i.test(raw)) return ERA_ALIASES.swiss;
  if (/mid.?century/i.test(raw)) return ERA_ALIASES.mid_century;

  return raw.replace(/\.\s*$/,'').trim();
}

export function minimalismFromLevel(level?: number, complexity?: string): MinimalismLevel {
  if (complexity === 'minimal' || (level ?? 8) >= 9) return 'ultra';
  if (complexity === 'high' || (level ?? 8) <= 5) return 'moderate';
  return 'minimal';
}

export function normalizeShapes(...sources: Array<string | undefined>): string[] {
  const hay = sources.filter(Boolean).join(' ').toLowerCase();
  const found = new Set<string>();

  const map: Array<[RegExp, string]> = [
    [/\bcircle|circular|round|radial\b/, 'circle'],
    [/\bsquare|angular\b/, 'square'],
    [/\btriangle|triangular|chevron\b/, 'triangle'],
    [/\barch|arc\b/, 'arch'],
    [/\bline|stroke\b/, 'line'],
    [/\bhexagon|hexagonal\b/, 'hexagon'],
  ];

  for (const [pattern, shape] of map) {
    if (pattern.test(hay)) found.add(shape);
  }

  if (found.size === 0) found.add('modular geometric forms');
  return [...found];
}

export function normalizeConstruction(raw?: string): string {
  const c = sanitizeIngressText(raw ?? '');
  if (!c) return 'baseline grid for optical balance';
  if (/grid|modular/i.test(c)) return 'baseline grid for modular alignment';
  if (/radial/i.test(c)) return 'radial grid for optical balance';
  return c.replace(/^(?:utilizing|employing|using)\s+(?:a\s+)?/i, '').trim();
}

export function normalizeComposition(raw?: string): string {
  const c = sanitizeIngressText(raw ?? '');
  if (!c) return 'symmetry';
  const sanitized = sanitizeCompositionField(
    c
      .replace(/^(?:utilizing|employing|using)\s+(?:a\s+)?/i, '')
      .replace(/\s+to enhance visual clarity\b/i, '')
      .trim(),
  );
  return sanitized || 'symmetry';
}

export function parseInspirationMood(inspiration?: string, inspirationMode?: string): string {
  const raw = sanitizeIngressText(inspiration ?? inspirationMode ?? '');
  if (!raw) return '';
  if (raw.length > 80) return raw.slice(0, 77) + '…';
  return raw;
}

const FORBIDDEN_PATTERNS = [
  /\bno\s+([a-z][a-z\s-]{2,40})/gi,
  /\bavoid\s+([a-z][a-z\s-]{2,40})/gi,
  /\bwithout\s+([a-z][a-z\s-]{2,40})/gi,
  /\bnever\s+([a-z][a-z\s-]{2,40})/gi,
];

export function extractForbiddenMotifs(notes?: string, constraints?: string): string[] {
  const hay = `${notes ?? ''} ${constraints ?? ''}`;
  const found = new Set<string>();

  for (const pattern of FORBIDDEN_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(hay)) !== null) {
      const phrase = match[1]?.replace(/[.,;]+$/, '').trim().toLowerCase();
      if (phrase && phrase.length >= 3 && phrase.length <= 40) found.add(phrase);
    }
  }

  return [...found];
}

export function geometryVocabulary(shapes: string[]): string {
  if (shapes.length === 1 && shapes[0] === 'modular geometric forms') {
    return 'crafted from modular geometric forms';
  }
  return `constructed from ${shapes.join(' and ')} forms`;
}

export function eraLabel(era: string): string {
  return era.replace(/\.\s*$/, '').trim();
}

export function isMonochromePalette(palette: string): boolean {
  return palette === 'black_white' || palette === 'monochrome';
}

export function colorLine(palette: string, selections: string[]): string {
  const colors = resolveColorSelections(palette, selections);
  if (isMonochromePalette(palette)) return 'strict black and white only';
  if (palette === 'custom' && colors.length > 0) {
    return `client-selected palette (${colors.join(', ')})`;
  }
  if (palette === 'two_color' && colors.length >= 2) {
    return `two-color palette (${colors.slice(0, 2).join(' and ')})`;
  }
  if (palette === 'two_color' && colors.length === 1) {
    return `two-color palette (${colors[0]} with black or white)`;
  }
  if (palette === 'two_color') return 'controlled two-color palette';
  if (palette === 'limited' && colors.length > 0) {
    return `limited palette (${colors.join(', ')})`;
  }
  if (palette === 'multi_color' && colors.length > 0) {
    return `multi-color palette (${colors.join(', ')})`;
  }
  if (palette === 'multi_color' || palette === 'limited') return 'limited multi-color palette';
  if (palette === 'corporate_blue') return 'corporate blue palette';
  if (palette === 'red_accent') return 'red accent palette';
  return 'controlled brand palette';
}
