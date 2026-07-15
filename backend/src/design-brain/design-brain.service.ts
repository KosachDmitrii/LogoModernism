import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  BrainFeedbackInput,
  BrainResearchCandidateStatus,
  BrainSourceType,
  BrainTenantScope,
} from '@logo-platform/shared';
import { designBrain } from '@logo-platform/design-brain';
import { getGlobalBrainScope } from './global-brain-scope';
import { NightlyBrainSchedulerService } from './nightly-brain-scheduler.service';

@Injectable()
export class DesignBrainApiService {
  constructor(
    private readonly nightlyScheduler: NightlyBrainSchedulerService,
  ) {}

  getCapabilities() {
    return {
      ...designBrain.getCapabilities(),
      nightlyResearchConfigured:
        process.env.BRAIN_NIGHTLY_RESEARCH === 'true',
      nightlyResearchActive: this.nightlyScheduler.isActive(),
    };
  }

  async getStats(scope?: BrainTenantScope) {
    return designBrain.getStats(await getGlobalBrainScope(scope?.userId));
  }

  async getTasteProfile(scope?: BrainTenantScope) {
    return designBrain.getTasteProfile(await getGlobalBrainScope(scope?.userId));
  }

  async consolidate(scope?: BrainTenantScope) {
    return designBrain.consolidate(await getGlobalBrainScope(scope?.userId));
  }

  async listExperiences(
    sourceType?: BrainSourceType,
    limit?: number,
    scope?: BrainTenantScope,
  ) {
    const globalScope = await getGlobalBrainScope(scope?.userId);
    return designBrain.listExperiences({ sourceType, limit, ...globalScope });
  }

  async getExperience(id: string, scope?: BrainTenantScope) {
    return designBrain.getExperience(
      id,
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async listPrinciples(
    limit?: number,
    offset?: number,
    options?: {
      category?: string;
      sort?: import('@logo-platform/shared').LearnedPrinciplesSort;
    } & BrainTenantScope,
  ) {
    const globalScope = await getGlobalBrainScope(options?.userId);
    return designBrain.listPrinciples(limit, offset, {
      category: options?.category,
      sort: options?.sort,
      ...globalScope,
    });
  }

  async listPrincipleCategories(scope?: BrainTenantScope) {
    return designBrain.listPrincipleCategories(
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async previewResearch(query: string, url: string, scope?: BrainTenantScope) {
    const trimmedQuery = query?.trim();
    const trimmedUrl = url?.trim();
    if (!trimmedQuery) {
      throw new BadRequestException('query is required');
    }
    if (!trimmedUrl) {
      throw new BadRequestException('url is required');
    }
    const globalScope = await getGlobalBrainScope(scope?.userId);
    return designBrain.previewResearch(trimmedQuery, trimmedUrl, globalScope).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    });
  }

  async runResearch(query: string, maxSources?: number, scope?: BrainTenantScope) {
    const trimmed = query?.trim();
    if (!trimmed) {
      throw new BadRequestException('query is required');
    }
    return designBrain.runResearch(
      trimmed,
      maxSources,
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async listResearchCandidates(
    status?: BrainResearchCandidateStatus,
    scope?: BrainTenantScope,
  ) {
    return designBrain.listResearchCandidates(
      status,
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async getResearchCandidate(id: string, scope?: BrainTenantScope) {
    return designBrain.getResearchCandidate(
      id,
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async approveResearch(id: string, scope?: BrainTenantScope) {
    return designBrain.approveResearch(
      id,
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async rejectResearch(id: string, scope?: BrainTenantScope) {
    return designBrain.rejectResearch(
      id,
      await getGlobalBrainScope(scope?.userId),
    );
  }

  async enqueuePdfIngest(
    buffer: Buffer,
    originalName: string,
    title: string,
    jobId: string,
    scope?: BrainTenantScope,
  ) {
    const trimmed = title?.trim();
    if (!trimmed) {
      throw new BadRequestException('Title is required');
    }
    if (!jobId?.trim()) {
      throw new BadRequestException('jobId is required');
    }
    const globalScope = await getGlobalBrainScope(scope?.userId);
    return designBrain.enqueuePdfIngest({
      buffer,
      originalName,
      title: trimmed,
      jobId: jobId.trim(),
      organizationId: globalScope.organizationId!,
    }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('no extractable text') ||
        message.includes('OPENAI_API_KEY') ||
        message.includes('GOOGLE_CLOUD_VISION_API_KEY') ||
        message.includes('Google Vision OCR failed') ||
        message.includes('OCR did not extract')
      ) {
        if (message.includes('403') && message.includes('disabled')) {
          throw new BadRequestException(
            'Google Cloud Vision API is disabled. Enable it at https://console.cloud.google.com/apis/library/vision.googleapis.com (same project as your API key), attach billing, wait 2–5 min, then retry.',
          );
        }
        throw new BadRequestException(message);
      }
      throw error;
    });
  }

  async checkPdfIngest(title: string, contentHash: string, scope?: BrainTenantScope) {
    const trimmed = title?.trim();
    if (!trimmed) {
      throw new BadRequestException('Title is required');
    }
    if (!contentHash?.trim()) {
      throw new BadRequestException('contentHash is required');
    }
    return designBrain.checkPdfIngest(
      trimmed,
      contentHash.trim(),
      await getGlobalBrainScope(scope?.userId),
    );
  }

  getPdfIngestProgress(jobId: string) {
    return designBrain.getPdfIngestProgress(jobId);
  }

  async ingestImage(
    buffer: Buffer,
    originalName: string,
    title?: string,
    mimeType?: string,
    scope?: BrainTenantScope,
  ) {
    return designBrain.ingestImage({
      buffer,
      originalName,
      title,
      mimeType,
      ...(await getGlobalBrainScope(scope?.userId)),
    });
  }

  async ingestFeedback(input: BrainFeedbackInput) {
    return designBrain.ingestFeedback({
      ...input,
      ...(await getGlobalBrainScope()),
    });
  }

  runBriefInterview(body: {
    industry: string;
    companyName?: string;
    markType?: 'wordmark' | 'lettermark' | 'combination';
    briefContext?: import('@logo-platform/shared').BriefContext;
  }) {
    const trimmed = body.industry?.trim();
    if (!trimmed) {
      throw new BadRequestException('industry is required');
    }
    return designBrain.interviewBrief({
      industry: trimmed,
      companyName: body.companyName?.trim(),
      markType: body.markType,
      briefContext: body.briefContext,
    });
  }
}
