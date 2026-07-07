import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CatalogCandidate, CatalogPipelineStats } from '@logo-platform/shared';
import { resolveRepoRoot } from './repo-root';

export const PIPELINE_DIR = join(resolveRepoRoot(), 'data/catalog-pipeline');
export const CANDIDATES_FILE = join(PIPELINE_DIR, 'candidates.json');
export const PAGES_INDEX_FILE = join(PIPELINE_DIR, 'pages-index.json');
export const APPROVED_FILE = join(PIPELINE_DIR, 'approved.json');

export interface PagesIndex {
  pdfPath: string;
  totalPages: number;
  extractedRange?: { start: number; end: number };
  scale: number;
  pages: Array<{ page: number; file: string; width: number; height: number }>;
}

export function ensurePipelineDir(): void {
  if (!existsSync(PIPELINE_DIR)) {
    mkdirSync(PIPELINE_DIR, { recursive: true });
  }
}

export function loadPagesIndex(): PagesIndex | null {
  if (!existsSync(PAGES_INDEX_FILE)) return null;
  return JSON.parse(readFileSync(PAGES_INDEX_FILE, 'utf-8')) as PagesIndex;
}

export function loadCandidates(): CatalogCandidate[] {
  if (!existsSync(CANDIDATES_FILE)) return [];
  return JSON.parse(readFileSync(CANDIDATES_FILE, 'utf-8')) as CatalogCandidate[];
}

export function saveCandidates(candidates: CatalogCandidate[]): void {
  ensurePipelineDir();
  writeFileSync(CANDIDATES_FILE, JSON.stringify(candidates, null, 2));
}

export function loadApproved(): CatalogCandidate[] {
  if (!existsSync(APPROVED_FILE)) return [];
  return JSON.parse(readFileSync(APPROVED_FILE, 'utf-8')) as CatalogCandidate[];
}

export function saveApproved(approved: CatalogCandidate[]): void {
  ensurePipelineDir();
  writeFileSync(APPROVED_FILE, JSON.stringify(approved, null, 2));
}

export function getPipelineStats(): CatalogPipelineStats {
  const index = loadPagesIndex();
  const candidates = loadCandidates();
  return {
    totalPages: index?.totalPages ?? 0,
    extractedPages: index?.pages.length ?? 0,
    totalCandidates: candidates.length,
    pending: candidates.filter((c) => c.status === 'pending').length,
    approved: candidates.filter((c) => c.status === 'approved').length,
    rejected: candidates.filter((c) => c.status === 'rejected').length,
  };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export function candidateId(page: number, index: number, name: string): string {
  return `cand-p${page}-${index}-${slugify(name) || 'logo'}`;
}
