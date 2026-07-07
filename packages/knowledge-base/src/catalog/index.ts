import type { CatalogSearchFilters, LogoReference } from '@logo-platform/shared';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGO_CATALOG as CURATED_CATALOG } from './entries';
import { CATALOG_TAXONOMY, CASE_STUDY_IDS, DESIGNER_PROFILE_IDS } from './taxonomy';
import { resolveRepoRoot } from './repo-root';
import { getCatalogPrincipleIdsFromContext } from './catalog-prompt';

const IMPORTED_FILE = 'data/catalog-pipeline/imported-catalog.json';

function loadImportedCatalog(): LogoReference[] {
  try {
    const importedPath = join(resolveRepoRoot(), IMPORTED_FILE);
    if (!existsSync(importedPath)) return [];
    return JSON.parse(readFileSync(importedPath, 'utf-8')) as LogoReference[];
  } catch {
    return [];
  }
}

export function getFullCatalog(): LogoReference[] {
  return [...CURATED_CATALOG, ...loadImportedCatalog()];
}

export { CATALOG_TAXONOMY, CASE_STUDY_IDS, DESIGNER_PROFILE_IDS };
export const LOGO_CATALOG = CURATED_CATALOG;

export function getCatalogTaxonomy() {
  return CATALOG_TAXONOMY;
}

export function getCatalogStats() {
  const byChapter = { geometric: 0, effect: 0, typographic: 0 };
  const byKind = { logo: 0, case_study: 0, designer_profile: 0 };
  for (const e of getFullCatalog()) {
    if (e.catalogChapter) byChapter[e.catalogChapter]++;
    byKind[e.entryKind ?? 'logo']++;
  }
  return {
    total: getFullCatalog().length,
    curated: CURATED_CATALOG.length,
    imported: loadImportedCatalog().length,
    byChapter,
    byKind,
    sections: CATALOG_TAXONOMY.flatMap((c) => c.sections).length,
    caseStudies: CASE_STUDY_IDS.length,
    designerProfiles: DESIGNER_PROFILE_IDS.length,
  };
}

export function getCatalogEntry(id: string): LogoReference | undefined {
  return getFullCatalog().find((e) => e.id === id);
}

export function getCatalogByChapter(chapter: string): LogoReference[] {
  return getFullCatalog().filter((e) => e.catalogChapter === chapter);
}

export function getCatalogBySection(chapter: string, section: string): LogoReference[] {
  return getFullCatalog().filter((e) => e.catalogChapter === chapter && e.catalogSection === section);
}

export function getCaseStudies(): LogoReference[] {
  return getFullCatalog().filter((e) => e.entryKind === 'case_study');
}

export function getDesignerProfiles(): LogoReference[] {
  return getFullCatalog().filter((e) => e.entryKind === 'designer_profile');
}

export function searchCatalog(filters: CatalogSearchFilters): LogoReference[] {
  let results = getFullCatalog();

  if (filters.chapter) {
    results = results.filter((e) => e.catalogChapter === filters.chapter);
  }
  if (filters.section) {
    results = results.filter((e) => e.catalogSection === filters.section);
  }
  if (filters.era) {
    results = results.filter((e) => e.era === filters.era);
  }
  if (filters.industry) {
    const ind = filters.industry.toLowerCase();
    results = results.filter(
      (e) =>
        e.industry.toLowerCase().includes(ind) ||
        e.keywords.some((k) => k.toLowerCase().includes(ind)),
    );
  }
  if (filters.designer) {
    const d = filters.designer.toLowerCase();
    results = results.filter((e) => e.designer?.toLowerCase().includes(d));
  }
  if (filters.entryKind) {
    results = results.filter((e) => e.entryKind === filters.entryKind);
  }
  if (filters.markType) {
    results = results.filter((e) => e.markType === filters.markType);
  }
  if (filters.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.designer?.toLowerCase().includes(q) ||
        e.country?.toLowerCase().includes(q) ||
        e.significance?.toLowerCase().includes(q) ||
        e.keywords.some((k) => k.toLowerCase().includes(q)) ||
        e.geometry.some((g) => g.toLowerCase().includes(q)),
    );
  }

  const limit = filters.limit ?? 200;
  return results.slice(0, limit);
}

export function matchCatalogToDescription(description: string, limit = 8): LogoReference[] {
  const q = description.toLowerCase();
  const scored = getFullCatalog().map((e) => {
    let score = 0;
    if (e.name.toLowerCase().includes(q)) score += 5;
    if (e.designer?.toLowerCase().includes(q)) score += 4;
    for (const g of e.geometry) if (q.includes(g)) score += 2;
    for (const k of e.keywords) if (q.includes(k)) score += 1.5;
    if (e.significance?.toLowerCase().includes(q)) score += 1;
    for (const p of e.principleIds) if (q.includes(p.replace(/-/g, ' '))) score += 0.5;
    return { entry: e, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export function getCatalogPrincipleIds(referenceIds: string[]): string[] {
  return getCatalogPrincipleIdsFromContext(referenceIds);
}

export { buildCatalogPromptContext, getCatalogPrincipleIdsFromContext } from './catalog-prompt';
export type { CatalogPromptContext } from './catalog-prompt';

/** Backward-compatible alias */
export const logoReferences = CURATED_CATALOG;
