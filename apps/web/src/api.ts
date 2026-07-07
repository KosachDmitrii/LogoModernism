import type { GenerateResponse, RecommendResponse } from './types';

const API_BASE = '/api';

export async function generatePrompts(body: {
  industry: string;
  companyName?: string;
  variationCount?: number;
  inspirationMode?: string;
  minimalismLevel?: number;
}): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/prompts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to generate prompts');
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

export async function analyzeBrandDNA(body: { companyName: string; industry: string }) {
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
