import type { CatalogMarkType, Era, LogoReference } from '@logo-platform/shared';
import { getCatalogEntry } from './index';

const GEOMETRY_TAG_TO_PRINCIPLE: Record<string, string[]> = {
  circle: ['geo-circle', 'comp-negative-space'],
  square: ['geo-square'],
  triangle: ['geo-triangle', 'geo-angular'],
  shield: ['mark-emblem', 'geo-angular'],
  bow: ['comp-negative-space', 'geo-angular'],
  hexagon: ['geo-angular'],
  cross: ['geo-angular'],
  lines: ['con-equal-width-lines'],
  'horizontal-lines': ['con-equal-width-lines'],
  lettermark: ['mark-lettermark', 'typ-geometric-sans'],
  wordmark: ['typ-wordmark', 'typ-geometric-sans'],
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

function principlesFromReference(ref: LogoReference): string[] {
  const ids = [...ref.principleIds];

  for (const g of ref.geometry) {
    for (const pid of GEOMETRY_TAG_TO_PRINCIPLE[g] ?? []) ids.push(pid);
  }

  if (ref.markType) {
    for (const pid of MARK_TYPE_TO_PRINCIPLE[ref.markType] ?? []) ids.push(pid);
  }

  if (ref.catalogSection) {
    for (const pid of SECTION_TO_PRINCIPLE[ref.catalogSection] ?? []) ids.push(pid);
  }

  if (ref.era) ids.push(`era-${ref.era.replace(/_/g, '-')}`);

  return unique(ids);
}

function referenceToFragments(ref: LogoReference): string[] {
  const parts: string[] = [];
  const header = [
    ref.name,
    ref.designer ? `by ${ref.designer}` : '',
    ref.year ? `(${ref.year})` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (ref.significance) {
    parts.push(`Catalog reference — ${header}: ${ref.significance}`);
  } else {
    parts.push(`Catalog reference — ${header}`);
  }

  if (ref.markType) {
    parts.push(`Mark type: ${ref.markType.replace(/_/g, ' ')}`);
  }

  if (ref.geometry.length) {
    parts.push(`Geometry vocabulary: ${ref.geometry.join(', ')}`);
  }

  if (ref.construction.length) {
    parts.push(`Construction: ${ref.construction.join(', ')}`);
  }

  if (ref.composition.length) {
    parts.push(`Composition: ${ref.composition.join(', ')}`);
  }

  if (ref.typography.length) {
    parts.push(`Typography: ${ref.typography.join(', ')}`);
  }

  if (ref.catalogSection) {
    parts.push(`Book section: ${ref.catalogSection.replace(/-/g, ' ')}`);
  }

  return parts;
}

export function buildCatalogPromptContext(
  referenceIds: string[],
  options?: { narrative?: string; typographyStyle?: 'standard' | 'constructed' },
): CatalogPromptContext | null {
  if (!referenceIds.length) return null;

  const references = referenceIds
    .map((id) => getCatalogEntry(id))
    .filter((ref): ref is LogoReference => Boolean(ref))
    .filter((ref) => {
      if (options?.typographyStyle !== 'constructed') return true;
      if (ref.markType === 'symbol' || ref.markType === 'emblem') return false;
      if (ref.catalogChapter === 'geometric' && ref.markType !== 'wordmark' && ref.markType !== 'lettermark') {
        return false;
      }
      return true;
    });

  if (!references.length) return null;

  const inspirationFragments = references.flatMap(referenceToFragments);

  if (options?.narrative?.trim()) {
    inspirationFragments.push(`Design brief note: ${options.narrative.trim()}`);
  }

  if (options?.typographyStyle === 'constructed') {
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
    principleIds: unique(references.flatMap(principlesFromReference)),
    inspirationFragments,
    geometry: unique(references.flatMap((r) => r.geometry)),
    construction: unique(references.flatMap((r) => r.construction)),
    composition: unique(references.flatMap((r) => r.composition)),
    typography: unique(references.flatMap((r) => r.typography)),
    markTypes: unique(references.map((r) => r.markType).filter(Boolean)) as CatalogMarkType[],
    eras: unique(references.map((r) => r.era)),
  };
}

export function getCatalogPrincipleIdsFromContext(referenceIds: string[]): string[] {
  return buildCatalogPromptContext(referenceIds)?.principleIds ?? [];
}
