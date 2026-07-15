import { EMBEDDING_DIMENSIONS } from '../storage/paths';
import { fetchWithDeadline } from '@logo-platform/shared';

const DEFAULT_MODEL = 'text-embedding-3-small';

function getModel(): string {
  return process.env.OPENAI_EMBEDDING_MODEL ?? DEFAULT_MODEL;
}

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return apiKey;
}

function normalizeInput(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 8000);
}

export async function embedText(text: string): Promise<number[]> {
  const input = normalizeInput(text);
  if (!input) {
    throw new Error('Cannot embed empty text');
  }

  const response = await fetchWithDeadline('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: getModel(),
      input,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  }, { timeoutMs: 30_000 });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding API failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embedding = data.data?.[0]?.embedding;
  if (!embedding?.length) {
    throw new Error('Embedding API returned no vector');
  }

  return embedding;
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getEmbeddingModel(): string {
  return getModel();
}
