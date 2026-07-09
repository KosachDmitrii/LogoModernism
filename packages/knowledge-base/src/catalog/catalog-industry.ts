import type { CatalogMarkType, Era, LogoReference } from '@logo-platform/shared';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGO_CATALOG as CURATED_CATALOG } from './entries';
import { resolveRepoRoot } from './repo-root';

const IMPORTED_FILE = 'data/catalog-pipeline/imported-catalog.json';

function loadAllCatalogEntries(): LogoReference[] {
  try {
    const importedPath = join(resolveRepoRoot(), IMPORTED_FILE);
    if (!existsSync(importedPath)) return [...CURATED_CATALOG];
    const imported = JSON.parse(readFileSync(importedPath, 'utf-8')) as LogoReference[];
    return [...CURATED_CATALOG, ...imported];
  } catch {
    return [...CURATED_CATALOG];
  }
}

const INDUSTRY_GROUPS: Record<string, string[]> = {
  fashion: ['fashion', 'apparel', 'clothing', 'textile', 'retail', 'luxury', 'garment'],
  apparel: ['fashion', 'apparel', 'clothing', 'textile', 'retail', 'sportswear'],
  clothing: ['fashion', 'apparel', 'clothing', 'textile', 'retail'],
  textile: ['textile', 'fabric', 'fashion', 'apparel', 'retail'],
  hoodies: ['fashion', 'apparel', 'clothing', 'sportswear', 'retail', 'streetwear'],
  sportswear: ['sportswear', 'fashion', 'apparel', 'retail', 'athletic'],
  film: ['film', 'cinema', 'media', 'entertainment', 'broadcast', 'television'],
  cinema: ['film', 'cinema', 'media', 'entertainment'],
  media: ['media', 'film', 'cinema', 'entertainment', 'broadcast', 'publishing'],
  technology: ['technology', 'software', 'tech', 'digital', 'computing', 'electronics'],
  tech: ['technology', 'software', 'tech', 'digital', 'computing'],
  software: ['software', 'technology', 'tech', 'digital'],
  finance: ['finance', 'banking', 'insurance', 'investment', 'financial'],
  banking: ['banking', 'finance', 'insurance', 'investment'],
  healthcare: ['healthcare', 'health', 'medical', 'pharma', 'pharmaceutical'],
  food: ['food', 'restaurant', 'beverage', 'hospitality', 'culinary'],
  automotive: ['automotive', 'transport', 'mobility', 'motor'],
  aviation: ['aviation', 'airline', 'aerospace', 'transport'],
  retail: ['retail', 'commerce', 'fashion', 'consumer'],
  energy: ['energy', 'oil', 'gas', 'utility', 'power'],
  sports: ['sports', 'sportswear', 'athletic', 'fitness', 'football'],
  publishing: ['publishing', 'media', 'print', 'book'],
  entertainment: ['entertainment', 'film', 'cinema', 'media', 'broadcast'],
};

function normalizeIndustry(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function industryTerms(projectIndustry: string): string[] {
  const normalized = normalizeIndustry(projectIndustry);
  if (!normalized) return [];

  const tokens = normalized.split(' ').filter((t) => t.length > 2);
  const group = INDUSTRY_GROUPS[normalized] ?? [];
  const tokenGroups = tokens.flatMap((t) => INDUSTRY_GROUPS[t] ?? [t]);

  return [...new Set([normalized, ...tokens, ...group, ...tokenGroups])];
}

export function scoreCatalogIndustryMatch(entry: LogoReference, projectIndustry: string): number {
  const terms = industryTerms(projectIndustry);
  if (terms.length === 0) return 0.5;

  const entryIndustry = entry.industry.toLowerCase();
  const entryTerms = industryTerms(entryIndustry);
  const keywords = entry.keywords.map((k) => k.toLowerCase());
  const significance = (entry.significance ?? '').toLowerCase();

  if (terms.includes(entryIndustry)) return 1;

  const sharedGroup = terms.some((term) => entryTerms.includes(term));
  if (sharedGroup) return 0.82;

  for (const term of terms) {
    if (keywords.some((k) => k === term || (term.length >= 5 && k.includes(term)))) return 0.72;
    if (term.length >= 5 && significance.includes(term)) return 0.62;
  }

  return 0.12;
}

export interface CatalogRecommendation extends LogoReference {
  industryScore: number;
}

export function rankCatalogByIndustry(
  entries: LogoReference[],
  projectIndustry: string,
): CatalogRecommendation[] {
  return [...entries]
    .map((entry) => ({
      ...entry,
      industryScore: scoreCatalogIndustryMatch(entry, projectIndustry),
    }))
    .sort((a, b) => b.industryScore - a.industryScore);
}

export function getCatalogRecommendations(options: {
  industry: string;
  markType?: CatalogMarkType;
  era?: Era;
  limit?: number;
}): CatalogRecommendation[] {
  let entries = loadAllCatalogEntries().filter((e) => e.entryKind !== 'designer_profile');

  if (options.markType) {
    entries = entries.filter((e) => e.markType === options.markType);
  }
  if (options.era) {
    entries = entries.filter((e) => e.era === options.era);
  }

  return rankCatalogByIndustry(entries, options.industry)
    .filter((e) => e.industryScore >= 0.35)
    .slice(0, options.limit ?? 6);
}

export function isWeakIndustryMatch(entry: LogoReference, projectIndustry: string): boolean {
  if (!projectIndustry.trim()) return false;
  return scoreCatalogIndustryMatch(entry, projectIndustry) < 0.35;
}
