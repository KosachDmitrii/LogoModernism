import type { GenerateResponse, RecommendResponse } from './types';

const API_BASE = '/api';

export async function generatePrompts(body: {
  industry: string;
  companyName?: string;
  variationCount?: number;
  inspirationMode?: string;
  minimalismLevel?: number;
  preferredEra?: string;
  analysisPrincipleIds?: string[];
  catalogReferenceIds?: string[];
  catalogNarrative?: string;
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: 'standard' | 'constructed';
}): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/prompts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      detail
        ? `Generation failed (${res.status}): ${detail.slice(0, 200)}`
        : `Generation failed (${res.status}). Is the API running on port 3001?`,
    );
  }
  return res.json();
}

export async function getRecommendations(industry: string): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/prompts/recommend/${encodeURIComponent(industry)}`);
  if (!res.ok) throw new Error('Failed to get recommendations');
  return res.json();
}

export async function getPrinciplesOverview(): Promise<{ total: number; categories: string[] }> {
  const res = await fetch(`${API_BASE}/principles`);
  if (!res.ok) throw new Error('Failed to load principles');
  return res.json();
}

export async function analyzeBrandDNA(body: {
  companyName: string;
  industry: string;
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: 'standard' | 'constructed';
}) {
  const res = await fetch(`${API_BASE}/engines/brand-dna`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Brand DNA analysis failed');
  return res.json();
}

export async function analyzeGeometry(body: { industry: string; complexity?: string }) {
  const res = await fetch(`${API_BASE}/engines/geometry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Geometry analysis failed');
  return res.json();
}

export async function getPrimitives() {
  const res = await fetch(`${API_BASE}/engines/primitives`);
  if (!res.ok) throw new Error('Failed to load primitives');
  return res.json();
}

export async function getKnowledgeGraphStats() {
  const res = await fetch(`${API_BASE}/engines/knowledge-graph`);
  if (!res.ok) throw new Error('Failed to load knowledge graph');
  return res.json();
}

export async function runFullPipeline(body: { companyName: string; industry: string; variationCount?: number }) {
  const res = await fetch(`${API_BASE}/engines/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Pipeline failed');
  return res.json();
}

export async function reverseAnalyze(body: { description: string; observedShapes?: string[] }) {
  const res = await fetch(`${API_BASE}/engines/reverse-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Reverse analysis failed');
  return res.json();
}

export async function getCatalogStats() {
  const res = await fetch(`${API_BASE}/principles/catalog/stats`);
  if (!res.ok) throw new Error('Failed to load catalog stats');
  return res.json();
}

export async function getCatalogTaxonomy() {
  const res = await fetch(`${API_BASE}/principles/catalog/taxonomy`);
  if (!res.ok) throw new Error('Failed to load catalog taxonomy');
  return res.json();
}

export async function searchCatalog(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const res = await fetch(`${API_BASE}/principles/catalog/search?${qs}`);
  if (!res.ok) throw new Error('Failed to search catalog');
  return res.json();
}

export async function getCatalogEntry(id: string) {
  const res = await fetch(`${API_BASE}/principles/catalog/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to load catalog entry');
  return res.json();
}

export async function getCaseStudies() {
  const res = await fetch(`${API_BASE}/principles/catalog/case-studies`);
  if (!res.ok) throw new Error('Failed to load case studies');
  return res.json();
}

export async function getDesignerProfiles() {
  const res = await fetch(`${API_BASE}/principles/catalog/designers`);
  if (!res.ok) throw new Error('Failed to load designer profiles');
  return res.json();
}

export async function getCatalogImportStats() {
  const res = await fetch(`${API_BASE}/catalog-import/stats`);
  if (!res.ok) throw new Error('Failed to load import stats');
  return res.json();
}

export async function listCatalogCandidates(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/catalog-import/candidates${qs}`);
  if (!res.ok) throw new Error('Failed to load candidates');
  return res.json();
}

export async function approveCatalogCandidate(id: string) {
  const res = await fetch(`${API_BASE}/catalog-import/candidates/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Approve failed');
  return res.json();
}

export async function rejectCatalogCandidate(id: string, notes?: string) {
  const res = await fetch(`${API_BASE}/catalog-import/candidates/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error('Reject failed');
  return res.json();
}

export async function bulkApproveCatalogCandidates(ids: string[]) {
  const res = await fetch(`${API_BASE}/catalog-import/bulk-approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error('Bulk approve failed');
  return res.json();
}

export async function bulkRejectCatalogCandidates(ids: string[], notes?: string) {
  const res = await fetch(`${API_BASE}/catalog-import/bulk-reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, notes }),
  });
  if (!res.ok) throw new Error('Bulk reject failed');
  return res.json();
}

export async function syncImportedCatalog() {
  const res = await fetch(`${API_BASE}/catalog-import/sync-catalog`, { method: 'POST' });
  if (!res.ok) throw new Error('Sync failed');
  return res.json();
}

export function catalogPageImageUrl(filename: string) {
  return `${API_BASE}/catalog-import/page-image/${encodeURIComponent(filename)}`;
}

export async function getImageProviders(): Promise<{ providers: import('./types').ImageProviderInfo[] }> {
  const res = await fetch(`${API_BASE}/images/providers`);
  if (!res.ok) throw new Error('Failed to load image providers');
  return res.json();
}

export async function generateImageFromPrompt(body: {
  text: string;
  companyName?: string;
  industry?: string;
  provider?: 'openai' | 'mock';
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: 'standard' | 'constructed';
}): Promise<import('./types').ImageGenerationResponse> {
  const res = await fetch(`${API_BASE}/images/generate-from-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Image generation failed');
  }
  return res.json();
}
