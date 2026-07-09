import type {
  GenerateResponse,
  RecommendResponse,
  BriefContextPayload,
  BrainCapabilities,
  BrainConsolidateResult,
  BrainIngestResult,
  BrainPdfIngestCheck,
  BrainResearchCandidate,
  BrainResearchRunResult,
  BrainStats,
  LearnedPrincipleRecord,
  TasteProfile,
  ImageGenerationResponse,
  ImageProviderInfo,
  GeneratedImage,
  BriefInterviewResponse,
  ComposedPrompt,
} from './types';

const API_BASE = '/api';

async function parseApiError(res: Response, fallback: string): Promise<never> {
  const detail = await res.text().catch(() => '');
  throw new Error(
    detail
      ? `${fallback} (${res.status}): ${detail.slice(0, 300)}`
      : `${fallback} (${res.status})`,
  );
}

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
  briefContext?: BriefContextPayload;
  useBrain?: boolean;
}): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/prompts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Generation failed');
  return res.json();
}

export async function getRecommendations(industry: string): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/prompts/recommend/${encodeURIComponent(industry)}`);
  if (!res.ok) await parseApiError(res, 'Failed to get recommendations');
  return res.json();
}

export async function getPrinciplesOverview(): Promise<{ total: number; categories: string[] }> {
  const res = await fetch(`${API_BASE}/principles`);
  if (!res.ok) await parseApiError(res, 'Failed to load principles');
  return res.json();
}

export async function getCatalogStats() {
  const res = await fetch(`${API_BASE}/principles/catalog/stats`);
  if (!res.ok) await parseApiError(res, 'Failed to load catalog stats');
  return res.json();
}

export async function getCatalogTaxonomy() {
  const res = await fetch(`${API_BASE}/principles/catalog/taxonomy`);
  if (!res.ok) await parseApiError(res, 'Failed to load catalog taxonomy');
  return res.json();
}

export async function searchCatalog(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const res = await fetch(`${API_BASE}/principles/catalog/search?${qs}`);
  if (!res.ok) await parseApiError(res, 'Failed to search catalog');
  return res.json();
}

export async function getCatalogRecommendations(params: {
  industry: string;
  markType?: string;
  era?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  qs.set('industry', params.industry);
  if (params.markType) qs.set('markType', params.markType);
  if (params.era) qs.set('era', params.era);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/principles/catalog/recommend?${qs}`);
  if (!res.ok) await parseApiError(res, 'Failed to load catalog recommendations');
  return res.json();
}

export async function getCatalogEntry(id: string) {
  const res = await fetch(`${API_BASE}/principles/catalog/${encodeURIComponent(id)}`);
  if (!res.ok) await parseApiError(res, 'Failed to load catalog entry');
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
  if (!res.ok) await parseApiError(res, 'Brand DNA analysis failed');
  return res.json();
}

export async function analyzeGeometry(body: { industry: string; complexity?: string }) {
  const res = await fetch(`${API_BASE}/engines/geometry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Geometry analysis failed');
  return res.json();
}

export async function analyzeComposition(body: {
  industry: string;
  markType?: string;
  hasNegativeSpace?: boolean;
}) {
  const res = await fetch(`${API_BASE}/engines/composition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Composition analysis failed');
  return res.json();
}

export async function getPrimitives() {
  const res = await fetch(`${API_BASE}/engines/primitives`);
  if (!res.ok) await parseApiError(res, 'Failed to load primitives');
  return res.json();
}

export async function getKnowledgeGraphStats() {
  const res = await fetch(`${API_BASE}/engines/knowledge-graph`);
  if (!res.ok) await parseApiError(res, 'Failed to load knowledge graph');
  return res.json();
}

export async function runFullPipeline(body: { companyName?: string; industry: string; variationCount?: number }) {
  const res = await fetch(`${API_BASE}/engines/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Pipeline failed');
  return res.json();
}

export async function getImageProviders(): Promise<{ providers: ImageProviderInfo[] }> {
  const res = await fetch(`${API_BASE}/images/providers`);
  if (!res.ok) await parseApiError(res, 'Failed to load image providers');
  return res.json();
}

export async function listSavedPrompts(
  filter: 'all' | 'like' | 'dislike' = 'all',
): Promise<{ prompts: ComposedPrompt[]; total: number }> {
  const qs = filter !== 'all' ? `?filter=${encodeURIComponent(filter)}` : '';
  const res = await fetch(`${API_BASE}/prompts/saved${qs}`);
  if (!res.ok) await parseApiError(res, 'Failed to load saved prompts');
  return res.json();
}

export async function submitPromptFeedback(
  promptId: string,
  signalType: 'LIKE' | 'DISLIKE',
): Promise<{ promptId: string; feedback: 'LIKE' | 'DISLIKE' }> {
  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signalType }),
  });
  if (!res.ok) await parseApiError(res, 'Feedback failed');
  return res.json();
}

export async function generatePromptLogo(
  promptId: string,
  body: {
    companyName?: string;
    provider?: 'openai' | 'mock';
    markType?: 'wordmark' | 'lettermark' | 'combination';
    typographyStyle?: 'standard' | 'constructed';
  },
): Promise<{ image: GeneratedImage; logos: GeneratedImage[]; remaining: number }> {
  const payload: Record<string, string> = {};
  const brandName = body.companyName?.trim();
  if (brandName) payload.companyName = brandName;
  if (body.markType) payload.markType = body.markType;
  if (body.typographyStyle) payload.typographyStyle = body.typographyStyle;
  if (body.provider) payload.provider = body.provider;

  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/logos/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await parseApiError(res, 'Logo generation failed');
  return res.json();
}

export async function generateImageFromPrompt(body: {
  text: string;
  companyName?: string;
  industry?: string;
  provider?: 'openai' | 'mock';
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: 'standard' | 'constructed';
}): Promise<ImageGenerationResponse> {
  const res = await fetch(`${API_BASE}/images/generate-from-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Image generation failed');
  return res.json();
}

export async function runBriefInterview(body: {
  industry: string;
  companyName?: string;
  markType?: 'wordmark' | 'lettermark' | 'combination';
  briefContext?: BriefContextPayload;
}): Promise<BriefInterviewResponse> {
  const res = await fetch(`${API_BASE}/brain/brief/interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Brief interview failed');
  return res.json();
}

export async function getBrainHealth(): Promise<BrainCapabilities> {
  const res = await fetch(`${API_BASE}/brain/health`);
  if (!res.ok) await parseApiError(res, 'Brain health check failed');
  return res.json();
}

export async function getBrainStats(): Promise<BrainStats> {
  const res = await fetch(`${API_BASE}/brain/stats`);
  if (!res.ok) await parseApiError(res, 'Failed to load brain stats');
  return res.json();
}

export async function getBrainTasteProfile(): Promise<TasteProfile> {
  const res = await fetch(`${API_BASE}/brain/taste-profile`);
  if (!res.ok) await parseApiError(res, 'Failed to load taste profile');
  return res.json();
}

export async function consolidateBrain(): Promise<BrainConsolidateResult> {
  const res = await fetch(`${API_BASE}/brain/consolidate`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'Consolidate failed');
  return res.json();
}

export async function listBrainPrinciples(limit = 50): Promise<LearnedPrincipleRecord[]> {
  const res = await fetch(`${API_BASE}/brain/principles?limit=${limit}`);
  if (!res.ok) await parseApiError(res, 'Failed to load principles');
  return res.json();
}

export async function checkBrainPdfIngest(title: string, contentHash: string): Promise<BrainPdfIngestCheck> {
  const res = await fetch(`${API_BASE}/brain/ingest/pdf/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, contentHash }),
  });
  if (!res.ok) await parseApiError(res, 'PDF check failed');
  return res.json();
}

export async function ingestBrainPdf(file: File, title: string): Promise<BrainIngestResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  const res = await fetch(`${API_BASE}/brain/ingest/pdf`, { method: 'POST', body: form });
  if (!res.ok) await parseApiError(res, 'PDF ingest failed');
  return res.json();
}

export async function ingestBrainFeedback(body: {
  signalType: 'LIKE' | 'DISLIKE' | 'APPROVE' | 'REJECT' | 'RATING';
  score: number;
  context: string;
  metadata?: Record<string, unknown>;
}): Promise<BrainIngestResult> {
  const res = await fetch(`${API_BASE}/brain/ingest/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Feedback failed');
  return res.json();
}

export async function runBrainResearch(body: { query: string; maxSources?: number }): Promise<BrainResearchRunResult> {
  const res = await fetch(`${API_BASE}/brain/research/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Research run failed');
  return res.json();
}

export async function previewBrainResearch(body: { query: string; url: string }): Promise<BrainResearchCandidate> {
  const res = await fetch(`${API_BASE}/brain/research/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Research preview failed');
  return res.json();
}

export async function listBrainResearchCandidates(status?: 'pending' | 'approved' | 'rejected'): Promise<BrainResearchCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/brain/research/candidates${qs}`);
  if (!res.ok) await parseApiError(res, 'Failed to load research candidates');
  return res.json();
}

export async function approveBrainResearch(id: string) {
  const res = await fetch(`${API_BASE}/brain/research/candidates/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'Approve failed');
  return res.json() as Promise<{ candidate: BrainResearchCandidate; ingest: BrainIngestResult }>;
}

export async function rejectBrainResearch(id: string) {
  const res = await fetch(`${API_BASE}/brain/research/candidates/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'Reject failed');
  return res.json() as Promise<BrainResearchCandidate>;
}
