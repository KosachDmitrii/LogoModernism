import { describe, expect, it } from 'vitest';
import {
  getExistingChunkIndexes,
  hashPdfContent,
  normalizeBookTitle,
} from '../../src/ingest/pdf-dedup';

describe('pdf-dedup (pure)', () => {
  it('hashes PDF content deterministically', () => {
    const buffer = Buffer.from('same-content');
    expect(hashPdfContent(buffer)).toBe(hashPdfContent(buffer));
    expect(hashPdfContent(buffer)).not.toBe(hashPdfContent(Buffer.from('other')));
  });

  it('normalizes book titles for dedup comparison', () => {
    expect(normalizeBookTitle('  Logo   Modernism  ')).toBe('logo modernism');
    expect(normalizeBookTitle('Logo Modernism')).toBe('logo modernism');
  });

  it('collects existing chunk indexes from metadata', () => {
    const indexes = getExistingChunkIndexes([
      { chunkIndex: 0, totalChunks: 3 },
      { chunkIndex: 2, totalChunks: 3 },
      { chunkIndex: 2 },
      {},
    ]);

    expect([...indexes].sort()).toEqual([0, 2]);
  });
});
