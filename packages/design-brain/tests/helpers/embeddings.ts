import { createHash } from 'node:crypto';
import { EMBEDDING_DIMENSIONS } from '../../src/storage/paths';

/** Deterministic pseudo-embedding for tests — no OpenAI required. */
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

/** Similar texts produce higher cosine similarity than unrelated texts. */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}
