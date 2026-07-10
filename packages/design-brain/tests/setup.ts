import { vi } from 'vitest';
import { resolve } from 'node:path';
import { deterministicEmbedding } from './helpers/embeddings';

process.env.LOGO_PLATFORM_ROOT = resolve(__dirname, '../../..');
process.env.OPENAI_API_KEY = '';

vi.mock('../src/embedding/embedding.service', () => ({
  embedText: vi.fn(async (text: string) => deterministicEmbedding(text)),
  isEmbeddingConfigured: vi.fn(() => true),
  getEmbeddingModel: vi.fn(() => 'text-embedding-3-small'),
}));
