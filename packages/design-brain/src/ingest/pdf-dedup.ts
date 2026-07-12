import { createHash } from 'node:crypto';
import type { PrismaClient } from '@logo-platform/database';
import type { BrainPdfIngestCheck } from '@logo-platform/shared';

export function hashPdfContent(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function normalizeBookTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

type PdfMetadata = {
  bookTitle?: string;
  contentHash?: string;
  chunkIndex?: number;
  totalChunks?: number;
};

export async function checkPdfIngestStatus(
  prisma: PrismaClient,
  bookTitle: string,
  contentHash: string,
  expectedTotalChunks?: number,
): Promise<BrainPdfIngestCheck> {
  const normalizedTitle = normalizeBookTitle(bookTitle);
  const rows = await prisma.brainExperience.findMany({
    where: { sourceType: 'PDF' },
    select: { id: true, metadata: true },
  });

  const matching = rows.filter((row) => {
    const meta = row.metadata as PdfMetadata;
    if (meta.contentHash === contentHash) return true;
    if (meta.bookTitle && normalizeBookTitle(meta.bookTitle) === normalizedTitle) return true;
    return false;
  });

  const chunkIndexes = new Set<number>();
  let knownTotalChunks: number | null = null;

  for (const row of matching) {
    const meta = row.metadata as PdfMetadata;
    if (typeof meta.chunkIndex === 'number') {
      chunkIndexes.add(meta.chunkIndex);
    }
    if (typeof meta.totalChunks === 'number') {
      knownTotalChunks = Math.max(knownTotalChunks ?? 0, meta.totalChunks);
    }
  }

  const totalChunks = expectedTotalChunks ?? knownTotalChunks;
  const existingChunks = chunkIndexes.size;
  const fullyIngested =
    totalChunks != null && totalChunks > 0 && existingChunks >= totalChunks;

  let message: string;
  if (fullyIngested) {
    message = `"${bookTitle}" is already fully ingested (${totalChunks} chunks).`;
  } else if (existingChunks > 0) {
    message = `"${bookTitle}" is partially ingested (${existingChunks}${totalChunks ? `/${totalChunks}` : ''} chunks). Will resume missing parts.`;
  } else {
    message = `"${bookTitle}" is new — ready to ingest.`;
  }

  return {
    alreadyIngested: fullyIngested,
    existingChunks,
    totalChunks,
    contentHash,
    bookTitle,
    message,
  };
}

export function getExistingChunkIndexes(matchingMetadata: PdfMetadata[]): Set<number> {
  const indexes = new Set<number>();
  for (const meta of matchingMetadata) {
    if (typeof meta.chunkIndex === 'number') {
      indexes.add(meta.chunkIndex);
    }
  }
  return indexes;
}
