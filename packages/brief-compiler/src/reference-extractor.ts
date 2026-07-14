import type { LogoReference } from '@logo-platform/shared';
import {
  isHighRiskCatalogEntry,
  softenTrademarkLikenessLanguage,
} from '@logo-platform/knowledge-base';
import type { ReferenceProfile } from './types';
import { normalizeComposition, normalizeConstruction, normalizeShapes } from './normalizers';

const GENERIC_SIGNIFICANCE =
  /\b(?:reflects|reflecting|captures the essence|represents the|embodies|conveys the|symbolizes the|quality of the|values of the|associated with the)\b/i;

const STRUCTURAL_SIGNIFICANCE =
  /\b(?:grid|geometric|angular|circle|triangle|modular|symmetry|negative space|letterform|construction|radial|bauhaus|swiss|striped|interlocking|crane|chevron|diamond|cross|wing|delta|monogram|lockup|emblem|silhouette)\b/i;

function structureCueFromEntry(entry: LogoReference): string {
  const geometry = entry.geometry?.[0] ?? entry.shape?.[0] ?? 'geometric';
  const construction = entry.construction?.[0] ?? 'modular';
  const cue = `${geometry} ${construction} geometric construction`.replace(/\s+/g, ' ').trim();
  return softenTrademarkLikenessLanguage(cue);
}

function significanceAsStructureCue(significance: string): string | undefined {
  const trimmed = significance.split(/[.—]/)[0]?.trim();
  if (!trimmed || trimmed.length < 12 || trimmed.length > 80) return undefined;
  if (GENERIC_SIGNIFICANCE.test(trimmed) && !STRUCTURAL_SIGNIFICANCE.test(trimmed)) {
    return undefined;
  }
  if (STRUCTURAL_SIGNIFICANCE.test(trimmed)) return trimmed;
  if (!GENERIC_SIGNIFICANCE.test(trimmed)) return trimmed;
  return undefined;
}

function attributionLabel(entry: LogoReference, likenessRisk: 'low' | 'high'): string {
  const designer = entry.designer?.trim();
  const year = entry.year ? ` (${entry.year})` : '';
  if (likenessRisk === 'high') {
    return designer ? `${designer}${year}` : 'modernist lineage';
  }
  const name = softenTrademarkLikenessLanguage(entry.name);
  if (designer) return `${name} by ${designer}${year}`;
  return `${name}${year}`;
}

function mapMarkType(entry: LogoReference): ReferenceProfile['markTypeHint'] {
  const mt = entry.markType ?? 'symbol';
  if (mt === 'emblem') return 'combination';
  return mt;
}

export function extractReferenceProfile(entry: LogoReference): ReferenceProfile {
  const likenessRisk = isHighRiskCatalogEntry(entry) ? 'high' : 'low';
  const geometry = normalizeShapes(entry.geometry?.join(' '), entry.shape?.join(' '));
  const construction = normalizeConstruction(entry.construction?.join(', '));
  const composition = normalizeComposition(entry.composition?.join(', '));

  let structureCue = structureCueFromEntry(entry);
  if (entry.significance && likenessRisk === 'low') {
    const sig = softenTrademarkLikenessLanguage(entry.significance);
    const fromSignificance = significanceAsStructureCue(sig);
    if (fromSignificance) structureCue = fromSignificance;
  }

  const eraMap: Record<string, string> = {
    swiss: 'International Typographic Style',
    bauhaus: 'Bauhaus geometric system',
    corporate_identity: 'Corporate identity modernism',
    '1960s': '1960s corporate identity',
    '1970s': '1970s systematic identity',
    mid_century: 'Mid-century modernist identity',
  };

  return {
    catalogId: entry.id,
    structureCue: softenTrademarkLikenessLanguage(structureCue),
    geometry,
    construction,
    composition,
    markTypeHint: mapMarkType(entry),
    eraHint: eraMap[entry.era] ?? 'International Typographic Style',
    designer: entry.designer,
    year: entry.year,
    attributionLabel: attributionLabel(entry, likenessRisk),
    confidence: entry.geometry?.length ? 0.85 : 0.55,
    likenessRisk,
  };
}
