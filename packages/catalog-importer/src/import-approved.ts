import type { CatalogCandidate, LogoReference } from '@logo-platform/shared';
import { loadApproved, saveApproved } from './storage';

export function candidateToLogoReference(c: CatalogCandidate): LogoReference {
  return {
    id: `ref-import-${c.id.replace(/^cand-/, '')}`,
    name: c.name,
    designer: c.designer,
    year: c.year,
    country: c.country,
    industry: c.industry,
    construction: c.construction,
    shape: c.geometry,
    geometry: c.geometry,
    composition: c.composition,
    grid: c.construction.filter((x) => x.includes('grid')),
    negativeSpace: c.composition.filter((x) => x.includes('negative')),
    typography: c.typography,
    stroke: ['equal-width'],
    weight: ['medium'],
    symmetry: ['bilateral'],
    colorCount: c.colorCount,
    visualComplexity: c.visualComplexity,
    minimalismLevel: c.minimalismLevel,
    era: c.era ?? 'international_style',
    keywords: c.keywords,
    principleIds: c.principleIds,
    catalogChapter: c.catalogChapter,
    catalogSection: c.catalogSection,
    entryKind: c.entryKind ?? 'logo',
    markType: c.markType,
    significance: c.significance,
    bookPageHint: `Page ${c.sourcePage}`,
    logoImageUrl: c.logoImageUrl,
  };
}

export function importApprovedToCatalog(): LogoReference[] {
  return loadApproved().map(candidateToLogoReference);
}

export function approveCandidate(
  candidates: CatalogCandidate[],
  id: string,
  patch?: Partial<CatalogCandidate>,
): CatalogCandidate[] {
  const approved = loadApproved();
  const updated = candidates.map((c) => {
    if (c.id !== id) return c;
    const merged = { ...c, ...patch, status: 'approved' as const, reviewedAt: new Date().toISOString() };
    if (!approved.some((a) => a.id === id)) {
      approved.push(merged);
    } else {
      const idx = approved.findIndex((a) => a.id === id);
      approved[idx] = merged;
    }
    saveApproved(approved);
    return merged;
  });
  return updated;
}

export function rejectCandidate(candidates: CatalogCandidate[], id: string, notes?: string): CatalogCandidate[] {
  const approved = loadApproved().filter((a) => a.id !== id);
  saveApproved(approved);
  return candidates.map((c) =>
    c.id === id
      ? { ...c, status: 'rejected' as const, reviewedAt: new Date().toISOString(), reviewNotes: notes }
      : c,
  );
}

export function bulkRejectCandidates(
  candidates: CatalogCandidate[],
  ids: string[],
  notes?: string,
): CatalogCandidate[] {
  if (!ids.length) return candidates;
  const idSet = new Set(ids);
  const approved = loadApproved().filter((a) => !idSet.has(a.id));
  saveApproved(approved);
  const reviewedAt = new Date().toISOString();
  return candidates.map((c) =>
    idSet.has(c.id)
      ? { ...c, status: 'rejected' as const, reviewedAt, reviewNotes: notes }
      : c,
  );
}
