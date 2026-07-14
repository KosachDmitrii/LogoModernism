import type { CatalogMarkType, Era, LogoMarkType, LogoReference, TypographyStyle } from '@logo-platform/shared';
import {
  sanitizeBriefNarrativeForPrompt,
  sanitizeCatalogTagList,
  sanitizeDesignerName,
  humanizeCatalogTag,
  isConstructedTypographyStyle,
} from '@logo-platform/shared';
import {
  isHighRiskCatalogEntry,
  sanitizeCatalogNarrativeForPrompt,
  scrubCatalogSignificanceLeaks,
  softenTrademarkLikenessLanguage,
} from './catalog-likeness';
import { getCatalogEntry } from './index';
import {
  filterStructurePrincipleIds,
  refMarkTypeMatchesBrief,
} from './catalog-structure';

const GEOMETRY_TAG_TO_PRINCIPLE: Record<string, string[]> = {
  circle: ['geo-circle', 'comp-negative-space'],
  square: ['geo-square'],
  triangle: ['geo-triangle', 'geo-angular'],
  shield: ['geo-angular'],
  bow: ['comp-negative-space', 'geo-angular'],
  hexagon: ['geo-angular'],
  cross: ['geo-angular'],
  lines: ['con-equal-width-lines'],
  'horizontal-lines': ['con-equal-width-lines'],
  lettermark: ['mark-lettermark', 'typ-geometric-sans'],
  wordmark: ['typ-wordmark', 'typ-geometric-sans'],
  arch: ['geo-circle', 'comp-negative-space'],
};

const MARK_TYPE_TO_PRINCIPLE: Record<CatalogMarkType, string[]> = {
  symbol: ['mark-iconic-symbol', 'mark-abstract-symbol'],
  wordmark: ['typ-wordmark', 'mark-symbol-only'],
  lettermark: ['mark-lettermark', 'typ-letter-combination', 'typ-geometric-sans'],
  combination: ['mark-combination-mark'],
  emblem: ['mark-emblem', 'mark-heraldic'],
};

const SECTION_TO_PRINCIPLE: Record<string, string[]> = {
  'three-letters': ['typ-letter-combination', 'mark-lettermark'],
  'two-letters': ['typ-monogram', 'typ-letter-combination'],
  'a-to-z': ['typ-geometric-sans'],
  words: ['typ-wordmark'],
};

const ERA_TRADITION_LABEL: Record<string, string> = {
  swiss: 'International Typographic Style',
  bauhaus: 'Bauhaus geometric tradition',
  corporate_identity: 'corporate identity modernism',
  '1960s': '1960s corporate identity',
  '1970s': '1970s systematic identity',
  mid_century: 'mid-century modernist identity',
  international_style: 'International Typographic Style',
};

export interface CatalogPromptContext {
  referenceIds: string[];
  references: LogoReference[];
  principleIds: string[];
  inspirationFragments: string[];
  geometry: string[];
  construction: string[];
  composition: string[];
  typography: string[];
  markTypes: CatalogMarkType[];
  eras: Era[];
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function principlesFromReference(ref: LogoReference, briefMarkType?: LogoMarkType): string[] {
  const ids = [...(ref.principleIds ?? [])];

  for (const g of ref.geometry ?? []) {
    if (/^geo-|^comp-|^con-|^mark-|^typ-/i.test(g)) {
      ids.push(g);
      continue;
    }
    for (const pid of GEOMETRY_TAG_TO_PRINCIPLE[g] ?? []) ids.push(pid);
  }

  if (ref.markType && refMarkTypeMatchesBrief(ref.markType, briefMarkType)) {
    for (const pid of MARK_TYPE_TO_PRINCIPLE[ref.markType] ?? []) ids.push(pid);
  }

  if (ref.catalogSection && refMarkTypeMatchesBrief(ref.markType, briefMarkType)) {
    for (const pid of SECTION_TO_PRINCIPLE[ref.catalogSection] ?? []) ids.push(pid);
  }

  return filterStructurePrincipleIds(unique(ids), briefMarkType);
}

function referenceHeader(ref: LogoReference): string {
  const designer = sanitizeDesignerName(ref.designer);
  return [
    ref.name,
    designer ? `by ${designer}` : '',
    ref.year ? `(${ref.year})` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function abstractGeometryCue(ref: LogoReference): string {
  const geometry = sanitizeCatalogTagList(ref.geometry);
  if (ref.geometry.includes('arch') || geometry.some((g) => /arch/i.test(g))) {
    return 'arch-based geometric construction and silhouette';
  }
  if (ref.geometry.includes('interlocking') || geometry.some((g) => /interlock/i.test(g))) {
    return 'modular interlocking geometric construction';
  }
  if (ref.geometry.includes('circle') || geometry.some((g) => /circle|circular|concentric/i.test(g))) {
    return 'circular geometric construction and silhouette';
  }
  if (
    ref.geometry.includes('square') ||
    ref.geometry.includes('triangle') ||
    geometry.some((g) => /square|triangle|angular/i.test(g))
  ) {
    return 'angular modular geometric construction';
  }
  if (geometry.length) {
    const lead = humanizeCatalogTag(geometry[0]) ?? geometry[0];
    return `${lead}-led geometric construction`;
  }
  return 'balanced geometric construction and silhouette';
}

function sanitizeSignificance(significance: string): string {
  return softenTrademarkLikenessLanguage(
    significance
      .replace(/^(?:The\s+)?(?:logo|design)\s+(?:employs|uses|utilizes|features|reflects|combines|integrates)\s+/i, '')
      .replace(/\bto convey\b[\s\S]*$/i, '')
      .replace(/\bstability and professionalism(?:\s+in\s+\w+)?/gi, '')
      .replace(/\bevok(?:e|ing)\s+(?:a\s+sense\s+of\s+)?freshness and quality(?:\s+in\s+the\s+food\s+industry)?/gi, 'balanced geometric construction')
      .replace(/\bplayful and inviting nature of the food industry\b/gi, 'balanced geometric construction')
      .replace(/\bartisanal quality of the food products\b/gi, 'balanced geometric construction')
      .replace(/\s{2,}/g, ' ')
      .trim(),
  );
}

function inspirationSentence(ref: LogoReference): string {
  const highRisk = isHighRiskCatalogEntry(ref);
  const designer = sanitizeDesignerName(ref.designer);
  const structureCue = abstractGeometryCue(ref);

  if (highRisk) {
    const tradition = designer
      ? `${designer}${ref.year ? ` (${ref.year})` : ''}`
      : ref.era
        ? (ERA_TRADITION_LABEL[ref.era] ?? 'modernist corporate identity')
        : 'modernist corporate identity';
    return (
      `Inspired by ${structureCue} from ${tradition} — structure and construction principles only, not a visual copy`
    );
  }

  const header = referenceHeader(ref);
  const significance = ref.significance ? sanitizeSignificance(ref.significance) : '';
  if (significance && /geometric|construction|modular|silhouette|grid|form|letterform|approach/i.test(significance)) {
    const cleaned = significance
      .replace(/^The logo['’]?s design reflects the\s+/i, '')
      .replace(/^The design employs\s+/i, '')
      .replace(/^The logo['’]?s\s+/i, '')
      .replace(/\.$/, '');
    return (
      `Inspired by ${cleaned} associated with ${header}, ` +
      'structure and principles only, not a visual copy'
    );
  }

  return (
    `Inspired by ${structureCue} associated with ${header}, ` +
    'structure and principles only, not a visual copy'
  );
}

function referenceToFragments(ref: LogoReference): string[] {
  return [inspirationSentence(ref)];
}

export function buildCatalogPromptContext(
  referenceIds: string[],
  options?: {
    narrative?: string;
    typographyStyle?: TypographyStyle;
    briefMarkType?: LogoMarkType;
  },
): CatalogPromptContext | null {
  if (!referenceIds.length) return null;

  const references = referenceIds
    .map((id) => getCatalogEntry(id))
    .filter((ref): ref is LogoReference => Boolean(ref))
    .filter((ref) => {
      if (!isConstructedTypographyStyle(options?.typographyStyle)) return true;
      if (ref.markType === 'symbol' || ref.markType === 'emblem') return false;
      if (ref.catalogChapter === 'geometric' && ref.markType !== 'wordmark' && ref.markType !== 'lettermark') {
        return false;
      }
      return true;
    });

  if (!references.length) return null;

  const inspirationFragments = references.flatMap(referenceToFragments);

  const narrative = sanitizeCatalogNarrativeForPrompt(
    sanitizeBriefNarrativeForPrompt(options?.narrative ?? ''),
  );
  if (narrative) {
    inspirationFragments.push(`Design brief note: ${narrative}`);
  }

  if (isConstructedTypographyStyle(options?.typographyStyle)) {
    inspirationFragments.push(
      'Catalog lineage for constructive typography — geometric letterforms from primitives, not a separate pictorial symbol',
    );
  }

  inspirationFragments.push(
    'Create an original mark in this modernist lineage — inspired by structure and principles, not a copy of the reference',
  );

  return {
    referenceIds,
    references,
    principleIds: unique(references.flatMap((r) => principlesFromReference(r, options?.briefMarkType))),
    inspirationFragments,
    geometry: unique(references.flatMap((r) => r.geometry)),
    construction: unique(references.flatMap((r) => r.construction)),
    composition: unique(references.flatMap((r) => r.composition)),
    typography: unique(references.flatMap((r) => r.typography)),
    markTypes: unique(references.map((r) => r.markType).filter(Boolean)) as CatalogMarkType[],
    eras: unique(references.map((r) => r.era).filter(Boolean) as Era[]),
  };
}

export function getCatalogPrincipleIdsFromContext(referenceIds: string[]): string[] {
  return buildCatalogPromptContext(referenceIds)?.principleIds ?? [];
}
