import type { BillingOverview, TypographyStyle } from '@logo-platform/shared';
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
import { apiFetch as fetch } from './lib/api-client';

const API_BASE = getApiBase();

type BackgroundTask<Result = unknown> = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  progress: number;
  phase?: string;
  result?: Result;
  error?: string;
};

async function waitForTask<Result>(
  taskId: string,
  signal?: AbortSignal,
): Promise<BackgroundTask<Result>> {
  let delayMs = 1_000;
  while (true) {
    const response = await fetch(
      `${API_BASE}/tasks/${encodeURIComponent(taskId)}`,
      { signal },
    );
    if (!response.ok) {
      await parseApiError(response, 'errors.api.progressCheckFailed');
    }
    const task = (await response.json()) as BackgroundTask<Result>;
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED' || task.status === 'CANCELLED') {
      throw new Error(task.error ?? 'Background task failed');
    }
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, delayMs);
      const abort = () => {
        window.clearTimeout(timer);
        reject(signal?.reason ?? new DOMException('The request was aborted', 'AbortError'));
      };
      signal?.addEventListener('abort', abort, { once: true });
    });
    delayMs = Math.min(5_000, delayMs + 500);
  }
}

export type BackgroundJobOptions = {
  signal?: AbortSignal;
};

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
}, options: BackgroundJobOptions = {}): Promise<GenerateResponse> {
  const intent = body.intent ?? 'compose';
  const { intent: _intent, ...payload } = body;
  const url = `${API_BASE}/prompts/generate?intent=${encodeURIComponent(intent)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Prompt-Intent': intent,
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({ ...payload, intent }),
    signal: options.signal,
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

export async function searchPrinciples(params: {
  query?: string;
  category?: string;
}, signal?: AbortSignal): Promise<Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  tags?: string[];
}>> {
  const query = new URLSearchParams();
  if (params.query) query.set('q', params.query);
  if (params.category) query.set('category', params.category);
  const res = await fetch(`${API_BASE}/principles/search?${query}`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.principlesLoadFailed');
  return res.json();
}

export async function getBillingOverview(): Promise<BillingOverview> {
  const res = await fetch(`${API_BASE}/billing/current`);
  if (!res.ok) await parseApiError(res, 'errors.api.billingOverviewFailed');
  return res.json();
}

export async function createBillingCheckout(plan: 'PLUS' | 'PRO'): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  if (!res.ok) await parseApiError(res, 'errors.api.checkoutFailed');
  return res.json();
}

export async function createBillingPortal(): Promise<{ url: string }> {
  const res = await fetch(`${API_BASE}/billing/portal`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'errors.api.portalFailed');
  return res.json();
}

export async function getCatalogStats(signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/principles/catalog/stats`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.catalogStatsFailed');
  return res.json();
}

export async function getCatalogTaxonomy(signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/principles/catalog/taxonomy`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.catalogTaxonomyFailed');
  return res.json();
}

export async function searchCatalog(params: Record<string, string | undefined>, signal?: AbortSignal) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const res = await fetch(`${API_BASE}/principles/catalog/search?${qs}`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.catalogSearchFailed');
  return res.json();
}

export async function getCatalogRecommendations(params: {
  industry: string;
  markType?: string;
  era?: string;
  limit?: number;
}, signal?: AbortSignal) {
  const qs = new URLSearchParams();
  qs.set('industry', params.industry);
  if (params.markType) qs.set('markType', params.markType);
  if (params.era) qs.set('era', params.era);
  if (params.limit != null) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/principles/catalog/recommend?${qs}`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.catalogRecommendFailed');
  return res.json();
}

export async function getCatalogEntry(id: string, signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/principles/catalog/${encodeURIComponent(id)}`, { signal });
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

export async function getPrimitives(signal?: AbortSignal) {
  const res = await fetch(`${API_BASE}/engines/primitives`, { signal });
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

export async function getImageProviders(signal?: AbortSignal): Promise<{ providers: ImageProviderInfo[] }> {
  const res = await fetch(`${API_BASE}/images/providers`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.imageProvidersFailed');
  return res.json();
}

export interface SavedPromptsPage {
  prompts: ComposedPrompt[];
  total?: number;
  nextCursor?: string | null;
}

export async function listSavedPrompts(
  cursor?: string | null,
  limit = 20,
  signal?: AbortSignal,
): Promise<SavedPromptsPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`${API_BASE}/prompts/saved?${params}`, { signal });
  if (!res.ok) await parseApiError(res, 'common.failedToLoadSavedPrompts');
  return res.json();
}

export async function togglePromptSave(
  promptId: string,
  saved: boolean,
): Promise<{ promptId: string; saved: boolean }> {
  const idempotencyKey = crypto.randomUUID();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ saved }),
    });
    if (res.ok) return res.json();
    if (res.status !== 503 || attempt === 1) {
      await parseApiError(res, 'common.failedToSavePrompt');
    }
    const retryAfter = Number(res.headers.get('Retry-After'));
    await new Promise((resolve) =>
      window.setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1_000 : 1_000),
    );
  }
  throw new Error('Unable to save prompt');
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
  options: BackgroundJobOptions = {},
): Promise<{ image: GeneratedImage; logos: GeneratedImage[]; remaining: number }> {
  const payload: Record<string, string> = {};
  const brandName = body.companyName?.trim();
  if (brandName) payload.companyName = brandName;
  if (body.markType) payload.markType = body.markType;
  if (body.typographyStyle) payload.typographyStyle = body.typographyStyle;
  if (body.provider) payload.provider = body.provider;

  const res = await fetch(`${API_BASE}/prompts/${encodeURIComponent(promptId)}/logos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
    signal: options.signal,
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

export async function getBrainHealth(signal?: AbortSignal): Promise<BrainCapabilities> {
  const res = await fetch(`${API_BASE}/brain/health`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.brainHealthFailed');
  return res.json();
}

export async function getBrainStats(signal?: AbortSignal): Promise<BrainStats> {
  const res = await fetch(`${API_BASE}/brain/stats`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.brainStatsFailed');
  return res.json();
}

export async function getBrainTasteProfile(signal?: AbortSignal): Promise<TasteProfile> {
  const res = await fetch(`${API_BASE}/brain/taste-profile`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.tasteProfileFailed');
  return res.json();
}

export async function consolidateBrain(): Promise<BrainConsolidateResult> {
  const res = await fetch(`${API_BASE}/brain/consolidate`, { method: 'POST' });
  if (!res.ok) await parseApiError(res, 'errors.api.consolidateFailed');
  const submission = (await res.json()) as { id?: string } | BrainConsolidateResult;
  if ('ranAt' in submission) return submission;
  if (!submission.id) throw new Error('Consolidation task was not created');
  const task = await waitForTask<BrainConsolidateResult>(submission.id);
  if (!task.result) throw new Error('Consolidation task returned no result');
  return task.result;
}

export async function listBrainPrinciples(
  limit = 50,
  offset = 0,
  options?: { category?: string; sort?: LearnedPrinciplesSort },
  signal?: AbortSignal,
): Promise<LearnedPrinciplesPage> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  if (options?.category) params.set('category', options.category);
  if (options?.sort) params.set('sort', options.sort);
  const res = await fetch(`${API_BASE}/brain/principles?${params}`, { signal });
  if (!res.ok) await parseApiError(res, 'errors.api.principlesLoadFailed');
  return res.json();
}

export async function listBrainPrincipleCategories(signal?: AbortSignal): Promise<LearnedPrincipleCategoryCount[]> {
  const res = await fetch(`${API_BASE}/brain/principles/categories`, { signal });
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

export async function getBrainPdfIngestProgress(
  jobId: string,
  signal?: AbortSignal,
): Promise<BrainPdfIngestProgress> {
  const response = await fetch(
    `${API_BASE}/brain/ingest/pdf/progress/${encodeURIComponent(jobId)}`,
    { signal },
  );
  if (!response.ok) await parseApiError(response, 'errors.api.progressCheckFailed');
  return response.json();
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
  const submission = (await res.json()) as { id?: string } | BrainResearchRunResult;
  if ('candidates' in submission) return submission;
  if (!submission.id) throw new Error('Research task was not created');
  const task = await waitForTask<BrainResearchRunResult>(submission.id);
  if (!task.result) throw new Error('Research task returned no result');
  return task.result;
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

export async function listBrainResearchCandidates(
  status?: 'pending' | 'approved' | 'rejected',
  signal?: AbortSignal,
): Promise<BrainResearchCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/brain/research/candidates${qs}`, { signal });
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
