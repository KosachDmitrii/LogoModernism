import type { CatalogChapter, CatalogMarkType, Era } from '@logo-platform/shared';
import { designPrinciples } from '@logo-platform/knowledge-base';

const VALID_ERAS: Era[] = [
  'swiss',
  'bauhaus',
  'international_style',
  'corporate_identity',
  '1960s',
  '1970s',
  'mid_century',
];

const SECTION_TO_CHAPTER: Record<string, CatalogChapter> = {
  angular: 'geometric',
  arrow: 'geometric',
  'basic-forms': 'geometric',
  circle: 'geometric',
  cross: 'geometric',
  dots: 'geometric',
  figurative: 'geometric',
  lines: 'geometric',
  round: 'geometric',
  skewed: 'geometric',
  square: 'geometric',
  triangle: 'geometric',
  'cut-off': 'effect',
  duplication: 'effect',
  grid: 'effect',
  outline: 'effect',
  overlay: 'effect',
  'positive-negative': 'effect',
  reflection: 'effect',
  rotation: 'effect',
  split: 'effect',
  'three-dimensional': 'effect',
  'white-on-black': 'effect',
  'a-to-z': 'typographic',
  'opened-up-letters': 'typographic',
  'three-letters': 'typographic',
  'two-letters': 'typographic',
  words: 'typographic',
};

export interface VisionLogoEntry {
  name: string;
  industry?: string;
  designer?: string;
  year?: number;
  country?: string;
  section_hint?: string;
  page_section?: string;
  geometry?: string[];
  composition?: string[];
  construction?: string[];
  typography?: string[];
  mark_type?: string;
  era?: string;
  minimalism_level?: number;
  visual_complexity?: string;
  color_count?: number;
  significance?: string;
  keywords?: string[];
}

export function normalizeSection(raw?: string): string | undefined {
  if (!raw) return undefined;
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeEra(raw?: string, year?: number): Era {
  if (raw) {
    const e = raw.toLowerCase().replace(/\s+/g, '_') as Era;
    if (VALID_ERAS.includes(e)) return e;
    if (e.includes('swiss')) return 'swiss';
    if (e.includes('bauhaus')) return 'bauhaus';
    if (e.includes('corporate')) return 'corporate_identity';
    if (e.includes('international')) return 'international_style';
    if (e.includes('mid')) return 'mid_century';
  }
  if (year) {
    if (year < 1955) return 'mid_century';
    if (year < 1965) return 'corporate_identity';
    if (year < 1975) return '1960s';
    return '1970s';
  }
  return 'international_style';
}

export function normalizeMarkType(raw?: string): CatalogMarkType | undefined {
  if (!raw) return undefined;
  const m = raw.toLowerCase();
  if (m.includes('word')) return 'wordmark';
  if (m.includes('letter')) return 'lettermark';
  if (m.includes('combo') || m.includes('combination')) return 'combination';
  if (m.includes('emblem')) return 'emblem';
  if (m.includes('symbol')) return 'symbol';
  return 'symbol';
}

export function inferPrincipleIds(entry: VisionLogoEntry): string[] {
  const ids = new Set<string>(['render-flat-vector', 'cx-minimal-complexity']);
  const text = [
    entry.name,
    entry.industry,
    ...(entry.geometry ?? []),
    ...(entry.composition ?? []),
    ...(entry.construction ?? []),
    entry.section_hint,
    entry.significance,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const p of designPrinciples) {
    if (p.id.startsWith('ent-')) continue;
    const hit =
      p.tags.some((t) => text.includes(t)) ||
      p.name.toLowerCase().split(' ').some((w) => w.length > 3 && text.includes(w));
    if (hit) ids.add(p.id);
    if (ids.size >= 12) break;
  }

  const section = normalizeSection(entry.section_hint ?? entry.page_section);
  if (section?.includes('circle')) ids.add('geo-circle');
  if (section?.includes('triangle')) ids.add('geo-triangle');
  if (section?.includes('square')) ids.add('geo-square');
  if (section?.includes('line')) ids.add('con-equal-width-lines');
  if (section?.includes('negative') || text.includes('negative')) ids.add('comp-negative-space');
  if (section?.includes('grid')) ids.add('con-modular-grid');
  if (section?.includes('overlay')) ids.add('comp-overlay');

  const era = normalizeEra(entry.era, entry.year);
  ids.add(`era-${era.replace(/_/g, '-')}`);

  return [...ids].slice(0, 16);
}

export function chapterFromSection(section?: string): CatalogChapter | undefined {
  if (!section) return undefined;
  const norm = normalizeSection(section) ?? section;
  return SECTION_TO_CHAPTER[norm];
}

export function parseVisionResponse(content: string): VisionLogoEntry[] {
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]) as VisionLogoEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e?.name?.trim()) : [];
  } catch {
    return [];
  }
}
