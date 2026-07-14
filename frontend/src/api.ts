import type { TypographyStyle } from '@logo-platform/shared';
import type {
  GenerateResponse,
  RecommendResponse,
  BriefContextPayload,
  BrainCapabilities,
  BrainConsolidateResult,
  BrainIngestResult,
  BrainPdfIngestCheck,
  BrainPdfIngestProgress,
  BrainPdfIngestStartResult,
  BrainResearchCandidate,
  BrainResearchRunResult,
  BrainStats,
  LearnedPrincipleCategoryCount,
  LearnedPrinciplesPage,
  LearnedPrinciplesSort,
  TasteProfile,
  ImageGenerationResponse,
  ImageProviderInfo,
  GeneratedImage,
  LogoFeedback,
  BriefInterviewResponse,
  ComposedPrompt,
} from './types';
import type { PromptGenerateIntent } from './lib/prompt-generate-intent';
import { parseApiError } from './lib/api-error';
import { getApiBase } from './lib/api-base';

const API_BASE = getApiBase();

export async function generatePrompts(body: {
  industry: string;
  companyName?: string;
  variationCount?: number;
  inspirationMode?: string;
  minimalismLevel?: number;
  preferredEra?: string;
  analysisPrincipleIds?: string[];
  catalogReferenceIds?: string[];
  autoCatalogReferences?: boolean;
  rebusWordmark?: boolean;
  catalogNarrative?: string;
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: TypographyStyle;
  briefContext?: BriefContextPayload;
  useBrain?: boolean;
  preferredTerritoryId?: 'territory-primary' | 'territory-construction' | 'territory-typography';
  intent?: PromptGenerateIntent;
}): Promise<GenerateResponse> {
  const intent = body.intent ?? 'compose';
  const { intent: _intent, ...payload } = body;
  const url = `${API_BASE}/prompts/generate?intent=${encodeURIComponent(intent)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Prompt-Intent': intent,
    },
    body: JSON.stringify({ ...payload, intent }),
  });
  if (!res.ok) await parseApiError(res, 'common.generationFailed');
  return res.json();
}

export async function getRecommendations(industry: string): Promise<RecommendResponse> {
  const res = await fetch(`${API_BASE}/prompts/recommend/${encodeURIComponent(industry)}`);
  if (!res.ok) await parseApiError(res, 'errors.api.recommendationsFailed');
  return res.json();
}

export async function getPrinciplesOverview(): Promise<{ total: number; categories: string[] }> {
  const res = await fetch(`${API_BASE}/principles`);
  if (!res.ok) await parseApiError(res, 'errors.api.principlesLoadFailed');
  return res.json();
}

export async function getCatalogStats() {
  const res = await fetch(`${API_BASE}/principles/catalog/stats`);
  if (!res.ok) await parseApiError(res, 'errors.api.catalogStatsFailed');
  return res.json();
}

export async function getCatalogTaxonomy() {
  const res = await fetch(`${API_BASE}/principles/catalog/taxonomy`);
  if (!res.ok) await parseApiError(res, 'errors.api.catalogTaxonomyFailed');
  return res.json();
}

export async function searchCatalog(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const res = await fetch(`${API_BASE}/principles/catalog/search?${qs}`);
  if (!res.ok) await parseApiError(res, 'errors.api.catalogSearchFailed');
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
  if (!res.ok) await parseApiError(res, 'errors.api.catalogRecommendFailed');
  return res.json();
}

export async function getCatalogEntry(id: string) {
  const res = await fetch(`${API_BASE}/principles/catalog/${encodeURIComponent(id)}`);
  if (!res.ok) await parseApiError(res, 'errors.api.catalogEntryFailed');
  return res.json();
}

export async function analyzeBrandDNA(body: {
  companyName: string;
  industry: string;
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: TypographyStyle;
}) {
  const res = await fetch(`${API_BASE}/engines/brand-dna`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.brandDnaFailed');
  return res.json();
}

export async function analyzeGeometry(body: { industry: string; complexity?: string }) {
  const res = await fetch(`${API_BASE}/engines/geometry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.geometryFailed');
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
  if (!res.ok) await parseApiError(res, 'errors.api.compositionFailed');
  return res.json();
}

export async function getPrimitives() {
  const res = await fetch(`${API_BASE}/engines/primitives`);
  if (!res.ok) await parseApiError(res, 'errors.api.primitivesLoadFailed');
  return res.json();
}

export async function getKnowledgeGraphStats() {
  const res = await fetch(`${API_BASE}/engines/knowledge-graph`);
  if (!res.ok) await parseApiError(res, 'errors.api.knowledgeGraphFailed');
  return res.json();
}

export async function runFullPipeline(body: { companyName?: string; industry: string; variationCount?: number }) {
  const res = await fetch(`${API_BASE}/engines/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.pipelineFailed');
  return res.json();
}

export async function getImageProviders(): Promise<{ providers: ImageProviderInfo[] }> {
  const res = await fetch(`${API_BASE}/images/providers`);
  if (!res.ok) await parseApiError(res, 'errors.api.imageProvidersFailed');
  return res.json();
}

export async function listSavedPrompts(): Promise<{ prompts: ComposedPrompt[]; total: number }> {
  const res = await fetch(`${API_BASE}/prompts/saved`);
  if (!res.ok) await parseApiError(res, 'common.failedToLoadSavedPrompts');
  return res.json();
}

export async function togglePromptSave(
  promptId: string,
  saved: boolean,
): Promise<{ promptId: string; saved: boolean }> {
  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ saved }),
  });
  if (!res.ok) await parseApiError(res, 'common.failedToSavePrompt');
  return res.json();
}

export async function submitLogoFeedback(
  promptId: string,
  logoId: string,
  body: {
    score: number;
    emoji: string;
  },
): Promise<{ promptId: string; logoId: string; feedback?: LogoFeedback; logos: GeneratedImage[] }> {
  const res = await fetch(
    `${API_BASE}/prompts/${encodeURIComponent(promptId)}/logos/${encodeURIComponent(logoId)}/feedback`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) await parseApiError(res, 'errors.api.logoFeedbackFailed');
  return res.json();
}

export async function submitLogoTags(
  promptId: string,
  logoId: string,
  body: {
    workedTags?: string[];
    missedTags?: string[];
  },
): Promise<{ promptId: string; logoId: string; feedback?: LogoFeedback; logos: GeneratedImage[] }> {
  const res = await fetch(
    `${API_BASE}/prompts/${encodeURIComponent(promptId)}/logos/${encodeURIComponent(logoId)}/tags`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) await parseApiError(res, 'errors.api.logoTagsFailed');
  return res.json();
}

/** @deprecated use togglePromptSave */
export async function submitPromptFeedback(
  promptId: string,
  signalType: 'LIKE' | 'DISLIKE',
): Promise<{ promptId: string; feedback: 'LIKE' | 'DISLIKE' }> {
  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signalType }),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.feedbackFailed');
  return res.json();
}

export async function generatePromptLogo(
  promptId: string,
  body: {
    companyName?: string;
    provider?: 'openai' | 'mock';
    markType?: 'wordmark' | 'lettermark' | 'combination';
    typographyStyle?: TypographyStyle;
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
  if (!res.ok) await parseApiError(res, 'common.imageGenerationFailed');
  return res.json();
}

export async function generateImageFromPrompt(body: {
  text: string;
  companyName?: string;
  industry?: string;
  provider?: 'openai' | 'mock';
  markType?: 'wordmark' | 'lettermark' | 'combination';
  typographyStyle?: TypographyStyle;
}): Promise<ImageGenerationResponse> {
  const res = await fetch(`${API_BASE}/images/generate-from-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'common.imageGenerationFailed');
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
  if (!res.ok) await parseApiError(res, 'errors.api.briefInterviewFailed');
  return res.json();
}

export async function getBrainHealth(): Promise<BrainCapabilities> {
  const res = await fetch(`${API_BASE}/brain/health`);
  if (!res.ok) await parseApiError(res, 'errors.api.brainHealthFailed');
  return res.json();
}

export async function getBrainStats(): Promise<BrainStats> {
  const res = await fetch(`${API_BASE}/brain/stats`);
  if (!res.ok) await parseApiError(res, 'errors.api.brainStatsFailed');
  return res.json();
}

export async function getBrainTasteProfile(): Promise<TasteProfile> {
  const res = await fetch(`${API_BASE}/brain/taste-profile`);
  if (!res.ok) await parseApiError(res, 'errors.api.tasteProfileFailed');
  return res.json();
}

export async function consolidateBrain(): Promise<BrainConsolidateResult> {
  const res = await fetch(`${API_BASE}/brain/consolidate`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'errors.api.consolidateFailed');
  return res.json();
}

export async function listBrainPrinciples(
  limit = 50,
  offset = 0,
  options?: { category?: string; sort?: LearnedPrinciplesSort },
): Promise<LearnedPrinciplesPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (options?.category) params.set('category', options.category);
  if (options?.sort) params.set('sort', options.sort);
  const res = await fetch(`${API_BASE}/brain/principles?${params}`);
  if (!res.ok) await parseApiError(res, 'errors.api.principlesLoadFailed');
  return res.json();
}

export async function listBrainPrincipleCategories(): Promise<LearnedPrincipleCategoryCount[]> {
  const res = await fetch(`${API_BASE}/brain/principles/categories`);
  if (!res.ok) await parseApiError(res, 'errors.api.principlesLoadFailed');
  return res.json();
}

export async function checkBrainPdfIngest(title: string, contentHash: string): Promise<BrainPdfIngestCheck> {
  const res = await fetch(`${API_BASE}/brain/ingest/pdf/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, contentHash }),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.pdfCheckFailed');
  return res.json();
}

export async function getBrainPdfIngestProgress(jobId: string): Promise<BrainPdfIngestProgress> {
  const res = await fetch(`${API_BASE}/brain/ingest/pdf/progress/${encodeURIComponent(jobId)}`);
  if (!res.ok) await parseApiError(res, 'errors.api.progressCheckFailed');
  return res.json();
}

export async function ingestBrainPdf(
  file: File,
  title: string,
  jobId: string,
): Promise<BrainPdfIngestStartResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title);
  form.append('jobId', jobId);
  const res = await fetch(`${API_BASE}/brain/ingest/pdf`, { method: 'POST', body: form });
  if (!res.ok) await parseApiError(res, 'errors.api.pdfIngestFailed');
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
  if (!res.ok) await parseApiError(res, 'errors.api.feedbackFailed');
  return res.json();
}

export async function runBrainResearch(body: { query: string; maxSources?: number }): Promise<BrainResearchRunResult> {
  const res = await fetch(`${API_BASE}/brain/research/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.researchRunFailed');
  return res.json();
}

export async function previewBrainResearch(body: { query: string; url: string }): Promise<BrainResearchCandidate> {
  const res = await fetch(`${API_BASE}/brain/research/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.researchPreviewFailed');
  return res.json();
}

export async function listBrainResearchCandidates(status?: 'pending' | 'approved' | 'rejected'): Promise<BrainResearchCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/brain/research/candidates${qs}`);
  if (!res.ok) await parseApiError(res, 'errors.api.researchCandidatesFailed');
  return res.json();
}

export async function approveBrainResearch(id: string) {
  const res = await fetch(`${API_BASE}/brain/research/candidates/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'errors.api.approveFailed');
  return res.json() as Promise<{ candidate: BrainResearchCandidate; ingest: BrainIngestResult }>;
}

export async function rejectBrainResearch(id: string) {
  const res = await fetch(`${API_BASE}/brain/research/candidates/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'errors.api.rejectFailed');
  return res.json() as Promise<BrainResearchCandidate>;
}
