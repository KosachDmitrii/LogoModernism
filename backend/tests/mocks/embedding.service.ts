import { createHash } from 'node:crypto';

const EMBEDDING_DIMENSIONS = 1536;

export function deterministicEmbedding(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const hash = createHash('sha256').update(normalized).digest();
  const vector = new Array<number>(dimensions).fill(0);

  for (let i = 0; i < normalized.length; i++) {
    const byte = normalized.charCodeAt(i);
    const idx = (byte + i * 17) % dimensions;
    vector[idx]! += byte / 512;
  }

  for (let i = 0; i < hash.length; i++) {
    const idx = hash[i]! % dimensions;
    vector[idx]! += hash[i]! / 256;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export async function embedText(text: string): Promise<number[]> {
  return deterministicEmbedding(text);
}

export function isEmbeddingConfigured(): boolean {
  return true;
}

export function getEmbeddingModel(): string {
  return 'text-embedding-3-small';
}
