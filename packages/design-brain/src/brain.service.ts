import type {
  BrainConsolidateResult,
  BrainCritiqueGenerateRequest,
  BrainCritiqueGenerateResult,
  BrainExperienceRecord,
  BrainFeedbackInput,
  BrainGenerateRequest,
  BrainIngestResult,
  BrainSearchRequest,
  BrainSearchResult,
  BrainSourceType,
  BrainStats,
  LearnedPrincipleRecord,
  TasteProfile,
} from '@logo-platform/shared';
import { prisma } from '@logo-platform/database';
import { EMBEDDING_DIMENSIONS } from './storage/paths';
import { ingestFeedback } from './ingest/ingest-feedback';
import { ingestImage, type IngestImageOptions } from './ingest/ingest-image';
import { ingestPdf, checkPdfIngest, type IngestPdfOptions } from './ingest/ingest-pdf';
import {
  clearPdfIngestProgress,
  getPdfIngestProgress,
  setPdfIngestProgress,
} from './ingest/pdf-ingest-progress';
import { ensureBrainSchema, isPgvectorEnabled } from './storage/pgvector';
import {
  getExperienceById,
  listExperiences,
  listLearnedPrinciples,
} from './storage/experience.repository';
import { getRelatedExperiences, semanticSearch } from './retrieval/semantic-search';
import { isEmbeddingConfigured } from './embedding/embedding.service';
import { computeTasteProfile } from './learning/taste-profile';
import { consolidateBrain, scheduleNightlyConsolidation } from './learning/consolidate';
import { runNightlyResearch, scheduleNightlyResearch } from './learning/nightly-research';
import { getTrustedDomains } from './research/web-search';
import {
  approveResearchCandidate,
  getCandidate,
  listCandidates,
  previewWebResearch,
  rejectResearchCandidate,
  runWebResearch,
} from './research/research.service';
import { runBrainPromptPipeline, type BrainPipelineResult } from './reasoning/brain-prompt-pipeline';
import { runBrainPartnerPipeline } from './reasoning/brain-partner-pipeline';
import { runBriefInterview } from './reasoning/brain-architecture';
import { generateWithCritiqueLoop } from './generation/critique-loop';

export class DesignBrainService {
  private nightlyTimer: NodeJS.Timeout | null = null;
  private nightlyResearchTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (process.env.BRAIN_NIGHTLY_CONSOLIDATE === 'true') {
      this.nightlyTimer = scheduleNightlyConsolidation(() => this.consolidate());
    }
    if (process.env.BRAIN_NIGHTLY_RESEARCH === 'true') {
      this.nightlyResearchTimer = scheduleNightlyResearch(() => runNightlyResearch());
    }
  }

  private async getClient() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured. Set up PostgreSQL to use Design Brain.');
    }
    await ensureBrainSchema(prisma);
    return prisma;
  }

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

  async checkPdfIngest(title: string, contentHash: string) {
    const client = await this.getClient();
    return checkPdfIngest(client, title, contentHash);
  }

  async ingestImage(options: IngestImageOptions): Promise<BrainIngestResult> {
    const client = await this.getClient();
    return ingestImage(client, options);
  }

  async ingestFeedback(input: BrainFeedbackInput): Promise<BrainIngestResult> {
    const client = await this.getClient();
    return ingestFeedback(client, input);
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
  }): Promise<BrainExperienceRecord[]> {
    const client = await this.getClient();
    return listExperiences(client, options);
  }

  async getExperience(id: string): Promise<BrainExperienceRecord | null> {
    const client = await this.getClient();
    return getExperienceById(client, id);
  }

  async listPrinciples(limit?: number): Promise<LearnedPrincipleRecord[]> {
    const client = await this.getClient();
    return listLearnedPrinciples(client, limit);
  }

  async getTasteProfile(): Promise<TasteProfile> {
    const client = await this.getClient();
    return computeTasteProfile(client);
  }

  async consolidate(): Promise<BrainConsolidateResult> {
    const client = await this.getClient();
    return consolidateBrain(client);
  }

  async runResearch(query: string, maxSources?: number) {
    return runWebResearch(query, maxSources);
  }

  async previewResearch(query: string, url: string) {
    return previewWebResearch(query, url);
  }

  listResearchCandidates(status?: import('@logo-platform/shared').BrainResearchCandidateStatus) {
    return listCandidates(status);
  }

  getResearchCandidate(id: string) {
    return getCandidate(id);
  }

  async approveResearch(id: string) {
    const client = await this.getClient();
    return approveResearchCandidate(client, id);
  }

  rejectResearch(id: string) {
    return rejectResearchCandidate(id);
  }

  async generate(request: BrainGenerateRequest): Promise<BrainPipelineResult> {
    const client = await this.getClient();
    if (process.env.BRAIN_PARTNER_MODE === 'legacy') {
      return runBrainPromptPipeline(client, request);
    }
    return runBrainPartnerPipeline(client, request);
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

  async getStats(): Promise<BrainStats> {
    const client = await this.getClient();

    const [experiences, tasteSignals, learnedPrinciples, grouped] = await Promise.all([
      client.brainExperience.count(),
      client.brainTasteSignal.count(),
      client.learnedPrinciple.count(),
      client.brainExperience.groupBy({
        by: ['sourceType'],
        _count: { _all: true },
      }),
    ]);

    const bySourceType: Record<BrainSourceType, number> = {
      PDF: 0,
      IMAGE: 0,
      FEEDBACK: 0,
      CATALOG: 0,
      TEXT: 0,
    };

    for (const row of grouped) {
      bySourceType[row.sourceType as BrainSourceType] = row._count._all;
    }

    return {
      experiences,
      tasteSignals,
      learnedPrinciples,
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

  stopNightlyConsolidation() {
    if (this.nightlyTimer) {
      clearInterval(this.nightlyTimer);
      this.nightlyTimer = null;
    }
    if (this.nightlyResearchTimer) {
      clearInterval(this.nightlyResearchTimer);
      this.nightlyResearchTimer = null;
    }
  }
}

export const designBrain = new DesignBrainService();
