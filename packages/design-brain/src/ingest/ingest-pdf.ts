import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { BrainIngestResult, BrainPdfIngestCheck, BrainPdfIngestPhase } from '@logo-platform/shared';
import type { DatabaseClient } from '../storage/database-types';
import { embedText } from '../embedding/embedding.service';
import { createExperience, upsertLearnedPrinciple } from '../storage/experience.repository';
import { upsertExperienceEmbedding } from '../storage/pgvector';
import { getBrainUploadsDir } from '../storage/paths';
import { sanitizePostgresText } from '../storage/sanitize-text';
import { extractPrinciplesFromText, summarizeText } from './principle-extractor';
import { extractPdfTextWithOcr } from './pdf-ocr';
import {
  checkPdfIngestStatus,
  hashPdfContent,
  normalizeBookTitle,
} from './pdf-dedup';
import { setPdfIngestProgress } from './pdf-ingest-jobs';

const MIN_CHUNK_LENGTH = 120;
const MAX_CHUNK_LENGTH = 3500;

export interface IngestPdfOptions {
  buffer: Buffer;
  originalName: string;
  title: string;
  jobId?: string;
  savedPath?: string;
  organizationId: string;
  projectId?: string;
  signal?: AbortSignal;
  onProgress?: (progress: {
    phase: BrainPdfIngestPhase;
    pageCount?: number;
    totalChunks?: number;
    processedChunks?: number;
    message?: string;
  }) => void;
}

function reportProgress(
  options: IngestPdfOptions,
  progress: {
    phase: BrainPdfIngestPhase;
    pageCount?: number;
    totalChunks?: number;
    processedChunks?: number;
    message?: string;
  },
): void {
  if (options.jobId) {
    setPdfIngestProgress(options.jobId, progress);
  }
  options.onProgress?.(progress);
}

function chunkText(pages: string[]): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageText = sanitizePostgresText(pages[i]?.replace(/\s+/g, ' ').trim() ?? '') ?? '';
    if (pageText.length < MIN_CHUNK_LENGTH) continue;

    if (pageText.length <= MAX_CHUNK_LENGTH) {
      chunks.push(`Page ${i + 1}: ${pageText}`);
      continue;
    }

    const paragraphs = pageText.split(/(?<=[.!?])\s+/);
    let current = `Page ${i + 1}: `;

    for (const paragraph of paragraphs) {
      if ((current + paragraph).length > MAX_CHUNK_LENGTH && current.length > MIN_CHUNK_LENGTH) {
        chunks.push(current.trim());
        current = `Page ${i + 1}: ${paragraph} `;
      } else {
        current += `${paragraph} `;
      }
    }

    if (current.trim().length >= MIN_CHUNK_LENGTH) {
      chunks.push(current.trim());
    }
  }

  return chunks;
}

export async function checkPdfIngest(
  client: DatabaseClient,
  title: string,
  contentHash: string,
  scope: Pick<IngestPdfOptions, 'organizationId' | 'projectId'>,
): Promise<BrainPdfIngestCheck> {
  const bookTitle = title.trim();
  if (!bookTitle) {
    throw new Error('Title is required');
  }
  return checkPdfIngestStatus(client, bookTitle, contentHash, scope);
}

export async function ingestPdf(
  client: DatabaseClient,
  options: IngestPdfOptions,
): Promise<BrainIngestResult> {
  options.signal?.throwIfAborted();
  const title = options.title.trim();
  if (!title) {
    throw new Error('Title is required');
  }

  const contentHash = hashPdfContent(options.buffer);
  const preCheck = await checkPdfIngestStatus(client, title, contentHash, options);

  let savedPath: string;
  if (options.savedPath) {
    savedPath = options.savedPath;
  } else {
    mkdirSync(getBrainUploadsDir(), { recursive: true });
    const savedName = `${Date.now()}-${basename(options.originalName).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    savedPath = join(getBrainUploadsDir(), savedName);
    writeFileSync(savedPath, options.buffer);
  }

  reportProgress(options, {
    phase: 'parsing',
    message: 'Extracting text from PDF…',
  });

  const { pages, pageCount, ocrUsed, ocrPages: ocrPageCount } =
    await extractPdfTextWithOcr(options.buffer, options.signal);
  options.signal?.throwIfAborted();
  const chunks = chunkText(pages);

  if (!chunks.length) {
    throw new Error('PDF contains no extractable text. OCR did not produce readable content.');
  }

  const ingestCheck = await checkPdfIngestStatus(
    client,
    title,
    contentHash,
    options,
    chunks.length,
  );
  if (ingestCheck.alreadyIngested) {
    reportProgress(options, {
      phase: 'done',
      pageCount,
      totalChunks: chunks.length,
      processedChunks: chunks.length,
      message: ingestCheck.message,
    });
    return {
      experienceId: '',
      sourceType: 'PDF',
      title,
      chunksStored: 0,
      principlesExtracted: 0,
      skipped: true,
      skippedChunks: chunks.length,
      alreadyIngested: true,
      contentHash,
      summary: ingestCheck.message,
    };
  }

  const existingIndexes = await getExistingChunkIndexesForBook(
    client,
    title,
    contentHash,
    options,
  );
  let principlesExtracted = 0;
  let chunksStored = 0;
  let skippedChunks = 0;
  let firstExperienceId = '';

  reportProgress(options, {
    phase: 'processing',
    pageCount,
    totalChunks: chunks.length,
    processedChunks: 0,
    message: `Processing 0/${chunks.length} chunks…`,
  });

  for (let index = 0; index < chunks.length; index++) {
    options.signal?.throwIfAborted();
    if (existingIndexes.has(index)) {
      skippedChunks += 1;
      reportProgress(options, {
        phase: 'processing',
        pageCount,
        totalChunks: chunks.length,
        processedChunks: index + 1,
        message: `Skipped chunk ${index + 1}/${chunks.length} (already stored)…`,
      });
      continue;
    }

    const chunk = chunks[index]!;
    const summary = await summarizeText(chunk, `${title} (chunk ${index + 1})`);
    options.signal?.throwIfAborted();
    const principles = await extractPrinciplesFromText(chunk, `PDF: ${title}`);
    options.signal?.throwIfAborted();

    const experience = await createExperience(client, {
      sourceType: 'PDF',
      title: `${title} — part ${index + 1}`,
      content: chunk,
      summary,
      filePath: savedPath,
      metadata: {
        originalName: options.originalName,
        bookTitle: title,
        bookTitleNormalized: normalizeBookTitle(title),
        contentHash,
        chunkIndex: index,
        totalChunks: chunks.length,
        pageCount,
        ocrUsed,
        ocrPages: ocrPageCount,
      },
      organizationId: options.organizationId,
      projectId: options.projectId,
    });

    if (!firstExperienceId) {
      firstExperienceId = experience.id;
    }

    const embedding = await embedText(`${experience.title}\n${summary}\n${chunk}`);
    options.signal?.throwIfAborted();
    await upsertExperienceEmbedding(client, experience.id, embedding);

    for (const principle of principles) {
      await upsertLearnedPrinciple(client, {
        category: principle.category,
        ruleText: principle.ruleText,
        promptFragment: principle.promptFragment,
        confidence: principle.confidence,
        sourceId: experience.id,
        antiPatterns: principle.antiPatterns,
        tags: principle.tags,
        citation: principle.citationQuote
          ? { url: `pdf://${title}`, quote: principle.citationQuote }
          : { url: `pdf://${title}`, quote: chunk.slice(0, 220) },
        organizationId: options.organizationId,
        projectId: options.projectId,
      });
      principlesExtracted += 1;
    }

    chunksStored += 1;

    reportProgress(options, {
      phase: 'processing',
      pageCount,
      totalChunks: chunks.length,
      processedChunks: index + 1,
      message: `Processing chunk ${index + 1}/${chunks.length} (LLM + embeddings)…`,
    });
  }

  const summaryParts: string[] = [];
  if (ocrUsed) {
    summaryParts.push(`OCR extracted ${ocrPageCount} pages`);
  }
  if (chunksStored > 0) {
    summaryParts.push(`Ingested ${chunksStored} new chunks from ${title}`);
  }
  if (skippedChunks > 0) {
    summaryParts.push(`skipped ${skippedChunks} already stored`);
  }
  if (preCheck.existingChunks > 0 && chunksStored === 0) {
    summaryParts.push(ingestCheck.message);
  }

  const summary = summaryParts.join('; ') || ingestCheck.message;

  reportProgress(options, {
    phase: 'done',
    pageCount,
    totalChunks: chunks.length,
    processedChunks: chunks.length,
    message: summary,
  });

  return {
    experienceId: firstExperienceId,
    sourceType: 'PDF',
    title,
    chunksStored,
    principlesExtracted,
    skipped: skippedChunks > 0 && chunksStored === 0,
    skippedChunks: skippedChunks > 0 ? skippedChunks : undefined,
    alreadyIngested: chunksStored === 0 && skippedChunks === chunks.length,
    contentHash,
    summary,
  };
}

async function getExistingChunkIndexesForBook(
  client: DatabaseClient,
  bookTitle: string,
  contentHash: string,
  scope: Pick<IngestPdfOptions, 'organizationId' | 'projectId'>,
): Promise<Set<number>> {
  const normalizedTitle = normalizeBookTitle(bookTitle);
  const values: unknown[] = [scope.organizationId];
  const filters = [`source_type = 'PDF'::"BrainSourceType"`, 'organization_id = $1'];
  if (scope.projectId) {
    values.push(scope.projectId);
    filters.push(`project_id = $${values.length}`);
  }
  const { rows } = await client.query<{ metadata: unknown }>(
    `SELECT metadata FROM design_brain_experiences WHERE ${filters.join(' AND ')}`,
    values,
  );

  const indexes = new Set<number>();
  for (const row of rows) {
    const meta = row.metadata as {
      bookTitle?: string;
      contentHash?: string;
      chunkIndex?: number;
    };
    const matchesHash = meta.contentHash === contentHash;
    const matchesTitle =
      meta.bookTitle != null && normalizeBookTitle(meta.bookTitle) === normalizedTitle;
    if ((matchesHash || matchesTitle) && typeof meta.chunkIndex === 'number') {
      indexes.add(meta.chunkIndex);
    }
  }
  return indexes;
}
