import type {
  BrainConsolidateResult,
  BrainCritiqueGenerateRequest,
  BrainCritiqueGenerateResult,
  BrainExperienceRecord,
  BrainFeedbackInput,
  BrainGenerateRequest,
  BrainIngestResult,
  BrainPdfIngestStartResult,
  BrainSearchRequest,
  BrainSearchResult,
  BrainSourceType,
  BrainStats,
  BrainTenantScope,
  LearnedPrincipleCategoryCount,
  LearnedPrincipleRecord,
  LearnedPrinciplesPage,
  LearnedPrinciplesSort,
  TasteProfile,
} from '@logo-platform/shared';
import { db } from '@logo-platform/database';
import { EMBEDDING_DIMENSIONS } from './storage/paths';
import { ensureBrainStorageLayout, touchStorageReadyMarker } from './storage/ensure-storage';
import { ingestFeedback } from './ingest/ingest-feedback';
import { ingestImage, type IngestImageOptions } from './ingest/ingest-image';
import { ingestPdf, checkPdfIngest, type IngestPdfOptions } from './ingest/ingest-pdf';
import { hashPdfContent } from './ingest/pdf-dedup';
import {
  clearPdfIngestProgress,
  enqueuePdfIngest,
  finalizePdfIngestJob,
  getPdfIngestJobFile,
  getPdfIngestProgress,
  readQueuedPdfBuffer,
  registerPdfIngestProcessor,
  setPdfIngestProgress,
} from './ingest/pdf-ingest-jobs';
import { ensureBrainSchema, isPgvectorEnabled } from './storage/pgvector';
import {
  countLearnedPrinciples,
  getExperienceById,
  listExperiences,
  listLearnedPrincipleCategories,
  listLearnedPrinciples,
} from './storage/experience.repository';
import { getRelatedExperiences, semanticSearch } from './retrieval/semantic-search';
import { isEmbeddingConfigured } from './embedding/embedding.service';
import { computeTasteProfile, DEFAULT_TASTE_PROFILE } from './learning/taste-profile';
import { consolidateBrain } from './learning/consolidate';
import { runNightlyResearch } from './learning/nightly-research';
import { getTrustedDomains } from './research/web-search';
import {
  approveResearchCandidate,
  getCandidate,
  listCandidates,
  previewWebResearch,
  rejectResearchCandidate,
  runWebResearch,
} from './research/research.service';
import { runBriefCompilerPipeline, type BrainPipelineResult } from './reasoning/brain-compiler-pipeline';
import { runBriefInterview } from './reasoning/brain-architecture';
import { generateWithCritiqueLoop } from './generation/critique-loop';

export class DesignBrainService {
  private readonly tasteProfileCache = new Map<
    string,
    { value: TasteProfile; expiresAt: number }
  >();
  private readonly tasteProfileInFlight = new Map<string, Promise<TasteProfile>>();

  private static readonly TASTE_PROFILE_CACHE_MS = 60_000;
  private static readonly TASTE_PROFILE_TIMEOUT_MS = 5_000;

  constructor() {
    ensureBrainStorageLayout();
    touchStorageReadyMarker();
    registerPdfIngestProcessor((jobId) => this.processQueuedPdfIngest(jobId));
  }

  private async getClient() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured. Set up PostgreSQL to use Design Brain.');
    }
    await ensureBrainSchema(db);
    return db;
  }

  async enqueuePdfIngest(options: IngestPdfOptions): Promise<BrainPdfIngestStartResult> {
    const client = await this.getClient();
    const contentHash = hashPdfContent(options.buffer);
    const preCheck = await checkPdfIngest(client, options.title, contentHash, options);

    if (preCheck.alreadyIngested) {
      return enqueuePdfIngest({
        jobId: options.jobId ?? `pdf-${Date.now()}`,
        title: options.title,
        fileName: options.originalName,
        buffer: options.buffer,
        organizationId: options.organizationId,
        projectId: options.projectId,
        preSkipped: {
          message: preCheck.message,
          result: {
            experienceId: '',
            sourceType: 'PDF',
            title: options.title,
            chunksStored: 0,
            principlesExtracted: 0,
            skipped: true,
            alreadyIngested: true,
            contentHash,
            summary: preCheck.message,
          },
        },
      });
    }

    if (!options.jobId) {
      throw new Error('jobId is required for background PDF ingest');
    }

    return enqueuePdfIngest({
      jobId: options.jobId,
      title: options.title,
      fileName: options.originalName,
      buffer: options.buffer,
      organizationId: options.organizationId,
      projectId: options.projectId,
    });
  }

  private async processQueuedPdfIngest(jobId: string): Promise<void> {
    const file = getPdfIngestJobFile(jobId);
    if (!file) {
      throw new Error(`PDF ingest job not found: ${jobId}`);
    }

    const buffer = readQueuedPdfBuffer(jobId);
    if (!buffer) {
      throw new Error(`PDF file missing for job: ${jobId}`);
    }

    const client = await this.getClient();
    try {
      const result = await ingestPdf(client, {
        buffer,
        savedPath: file.savedPath,
        originalName: file.fileName,
        title: file.title,
        jobId,
        organizationId: file.organizationId,
        projectId: file.projectId,
      });

      finalizePdfIngestJob(jobId, {
        status: result.alreadyIngested || result.skipped ? 'skipped' : 'done',
        phase: 'done',
        result,
        message: result.summary,
        finishedAt: new Date().toISOString(),
        processedChunks: result.chunksStored,
      });
    } catch (error) {
      finalizePdfIngestJob(jobId, {
        status: 'error',
        phase: 'error',
        message: error instanceof Error ? error.message : String(error),
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date().toISOString(),
      });
    }
  }

  /** @deprecated Use enqueuePdfIngest for API uploads. Kept for direct/tests. */
  async ingestPdf(options: IngestPdfOptions): Promise<BrainIngestResult> {
    const client = await this.getClient();
    try {
      return await ingestPdf(client, options);
    } catch (error) {
      if (options.jobId) {
        setPdfIngestProgress(options.jobId, {
          phase: 'error',
          message: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    } finally {
      // Keep progress available briefly so the client can read 100% before cleanup.
      if (options.jobId) {
        setTimeout(() => clearPdfIngestProgress(options.jobId!), 5000);
      }
    }
  }

  getPdfIngestProgress(jobId: string) {
    return getPdfIngestProgress(jobId);
  }

  async checkPdfIngest(title: string, contentHash: string, scope: BrainTenantScope) {
    if (!scope.organizationId) {
      throw new Error('Organization scope is required for PDF ingest');
    }
    const client = await this.getClient();
    return checkPdfIngest(client, title, contentHash, {
      organizationId: scope.organizationId,
      projectId: scope.projectId,
    });
  }

  async ingestImage(options: IngestImageOptions): Promise<BrainIngestResult> {
    const client = await this.getClient();
    return ingestImage(client, options);
  }

  async ingestFeedback(input: BrainFeedbackInput): Promise<BrainIngestResult> {
    const client = await this.getClient();
    const result = await ingestFeedback(client, input);
    this.tasteProfileCache.delete(this.scopeKey(input));
    return result;
  }

  async search(request: BrainSearchRequest): Promise<BrainSearchResult> {
    const client = await this.getClient();
    return semanticSearch(client, request);
  }

  async getRelated(experienceId: string, limit?: number): Promise<BrainSearchResult> {
    const client = await this.getClient();
    return getRelatedExperiences(client, experienceId, limit);
  }

  async listExperiences(options?: {
    sourceType?: BrainSourceType;
    limit?: number;
    organizationId?: string;
    projectId?: string;
  }): Promise<BrainExperienceRecord[]> {
    const client = await this.getClient();
    return listExperiences(client, options);
  }

  async getExperience(
    id: string,
    scope?: BrainTenantScope,
  ): Promise<BrainExperienceRecord | null> {
    const client = await this.getClient();
    return getExperienceById(client, id, scope);
  }

  async listPrinciples(
    limit?: number,
    offset?: number,
    options?: { category?: string; sort?: LearnedPrinciplesSort } & BrainTenantScope,
  ): Promise<LearnedPrinciplesPage> {
    const client = await this.getClient();
    const pageLimit = limit ?? 100;
    const pageOffset = offset ?? 0;
    const [items, total] = await Promise.all([
      listLearnedPrinciples(client, pageLimit, pageOffset, options),
      countLearnedPrinciples(client, options?.category, options),
    ]);
    return { items, total };
  }

  async listPrincipleCategories(
    scope?: BrainTenantScope,
  ): Promise<LearnedPrincipleCategoryCount[]> {
    const client = await this.getClient();
    return listLearnedPrincipleCategories(client, scope);
  }

  async getTasteProfile(scope?: BrainTenantScope): Promise<TasteProfile> {
    const cacheKey = this.scopeKey(scope);
    const cached = this.tasteProfileCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    let pending = this.tasteProfileInFlight.get(cacheKey);
    if (!pending) {
      const client = await this.getClient();
      pending = computeTasteProfile(client, scope)
        .then((value) => {
          this.tasteProfileCache.set(cacheKey, {
            value,
            expiresAt: Date.now() + DesignBrainService.TASTE_PROFILE_CACHE_MS,
          });
          return value;
        })
        .finally(() => {
          this.tasteProfileInFlight.delete(cacheKey);
        });
      this.tasteProfileInFlight.set(cacheKey, pending);
    }

    try {
      return await Promise.race([
        pending,
        new Promise<TasteProfile>((_, reject) => {
          setTimeout(
            () => reject(new Error('taste_profile_timeout')),
            DesignBrainService.TASTE_PROFILE_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== 'taste_profile_timeout') throw error;
      return {
        ...DEFAULT_TASTE_PROFILE,
        summary: 'Taste profile temporarily unavailable — using modernist defaults.',
      };
    }
  }

  async consolidate(scope?: BrainTenantScope): Promise<BrainConsolidateResult> {
    const client = await this.getClient();
    return consolidateBrain(client, scope);
  }

  async runResearch(
    query: string,
    maxSources: number | undefined,
    scope: BrainTenantScope,
    signal?: AbortSignal,
  ) {
    const client = await this.getClient();
    return runWebResearch(client, query, scope, maxSources, signal);
  }

  async previewResearch(query: string, url: string, scope: BrainTenantScope) {
    const client = await this.getClient();
    return previewWebResearch(client, query, url, scope);
  }

  async listResearchCandidates(
    status: import('@logo-platform/shared').BrainResearchCandidateStatus | undefined,
    scope: BrainTenantScope,
  ) {
    const client = await this.getClient();
    return listCandidates(client, scope, status);
  }

  async getResearchCandidate(id: string, scope: BrainTenantScope) {
    const client = await this.getClient();
    return getCandidate(client, id, scope);
  }

  async approveResearch(id: string, scope?: BrainTenantScope) {
    const client = await this.getClient();
    return approveResearchCandidate(client, id, scope);
  }

  async rejectResearch(id: string, scope: BrainTenantScope) {
    const client = await this.getClient();
    return rejectResearchCandidate(client, id, scope);
  }

  async generate(request: BrainGenerateRequest): Promise<BrainPipelineResult> {
    const client = await this.getClient();
    const tasteProfile = await this.getTasteProfile(request);
    return runBriefCompilerPipeline(client, request, tasteProfile);
  }

  async interviewBrief(input: {
    industry: string;
    companyName?: string;
    markType?: string;
    briefContext?: BrainGenerateRequest['briefContext'];
  }) {
    const client = await this.getClient();
    return runBriefInterview(client, input);
  }

  async generateWithCritique(request: BrainCritiqueGenerateRequest): Promise<BrainCritiqueGenerateResult> {
    const client = await this.getClient();
    return generateWithCritiqueLoop(client, request);
  }

  async getStats(scope?: BrainTenantScope): Promise<BrainStats> {
    const client = await this.getClient();
    const values: unknown[] = [];
    const filters: string[] = [];
    if (scope?.organizationId) {
      values.push(scope.organizationId);
      filters.push(`organization_id = $${values.length}`);
    }
    if (scope?.projectId) {
      values.push(scope.projectId);
      filters.push(`project_id = $${values.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const [experienceCount, signalCount, principleCount, groupedResult] = await Promise.all([
      client.one<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM design_brain_experiences ${where}`,
        values,
      ),
      client.one<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM design_brain_taste_signals ${where}`,
        values,
      ),
      client.one<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM learned_design_principles ${where}`,
        values,
      ),
      client.query<{ sourceType: BrainSourceType; count: number }>(
        `SELECT source_type, COUNT(*)::int AS count
         FROM design_brain_experiences ${where}
         GROUP BY source_type`,
        values,
      ),
    ]);

    const bySourceType: Record<BrainSourceType, number> = {
      PDF: 0,
      IMAGE: 0,
      FEEDBACK: 0,
      CATALOG: 0,
      TEXT: 0,
    };

    for (const row of groupedResult.rows) {
      bySourceType[row.sourceType] = row.count;
    }

    return {
      experiences: experienceCount.count,
      tasteSignals: signalCount.count,
      learnedPrinciples: principleCount.count,
      bySourceType,
      embeddingDimensions: EMBEDDING_DIMENSIONS,
      pgvectorEnabled: await isPgvectorEnabled(client),
    };
  }

  getCapabilities() {
    return {
      embeddingConfigured: isEmbeddingConfigured(),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      nightlyConsolidate: process.env.BRAIN_NIGHTLY_CONSOLIDATE === 'true',
      nightlyResearch: process.env.BRAIN_NIGHTLY_RESEARCH === 'true',
      tavilyConfigured: Boolean(process.env.TAVILY_API_KEY),
      braveConfigured: Boolean(process.env.BRAVE_SEARCH_API_KEY),
      ocrConfigured: Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY),
      trustedDomains: getTrustedDomains(),
    };
  }

  runNightlyResearch() {
    return runNightlyResearch();
  }

  private scopeKey(scope?: BrainTenantScope): string {
    return `${scope?.organizationId ?? 'global'}:${scope?.projectId ?? '*'}`;
  }

  stopNightlyConsolidation() {
    // Scheduling is owned by the backend PostgreSQL task runner.
  }
}

export const designBrain = new DesignBrainService();
