import type {
  BrainCapabilities,
  BrainConsolidateResult,
  BrainExperienceRecord,
  BrainIngestResult,
  BrainPdfIngestCheck,
  BrainResearchCandidate,
  BrainResearchRunResult,
  BrainStats,
  LearnedPrincipleRecord,
  TasteProfile,
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

export async function listBrainExperiences(limit = 20): Promise<BrainExperienceRecord[]> {
  const res = await fetch(`${API_BASE}/brain/experiences?limit=${limit}`);
  if (!res.ok) await parseApiError(res, 'Failed to load experiences');
  return res.json();
}

export async function checkBrainPdfIngest(
  title: string,
  contentHash: string,
): Promise<BrainPdfIngestCheck> {
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
  experienceId?: string;
}): Promise<BrainIngestResult> {
  const res = await fetch(`${API_BASE}/brain/ingest/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Feedback ingest failed');
  return res.json();
}

export async function runBrainResearch(body: {
  query: string;
  maxSources?: number;
}): Promise<BrainResearchRunResult> {
  const res = await fetch(`${API_BASE}/brain/research/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Research run failed');
  return res.json();
}

export async function previewBrainResearch(body: {
  query: string;
  url: string;
}): Promise<BrainResearchCandidate> {
  const res = await fetch(`${API_BASE}/brain/research/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseApiError(res, 'Research preview failed');
  return res.json();
}

export async function listBrainResearchCandidates(
  status?: 'pending' | 'approved' | 'rejected',
): Promise<BrainResearchCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/brain/research/candidates${qs}`);
  if (!res.ok) await parseApiError(res, 'Failed to load research candidates');
  return res.json();
}

export async function approveBrainResearch(id: string) {
  const res = await fetch(`${API_BASE}/brain/research/candidates/${encodeURIComponent(id)}/approve`, {
    method: 'POST',
  });
  if (!res.ok) await parseApiError(res, 'Approve failed');
  return res.json() as Promise<{
    candidate: BrainResearchCandidate;
    ingest: BrainIngestResult;
  }>;
}

export async function rejectBrainResearch(id: string) {
  const res = await fetch(`${API_BASE}/brain/research/candidates/${encodeURIComponent(id)}/reject`, {
    method: 'POST',
  });
  if (!res.ok) await parseApiError(res, 'Reject failed');
  return res.json() as Promise<BrainResearchCandidate>;
}
