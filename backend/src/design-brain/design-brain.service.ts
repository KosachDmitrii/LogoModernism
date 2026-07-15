import { Injectable, BadRequestException } from '@nestjs/common';
import type {
  BrainFeedbackInput,
  BrainResearchCandidateStatus,
  BrainSourceType,
  BrainTenantScope,
} from '@logo-platform/shared';
import { designBrain } from '@logo-platform/design-brain';

@Injectable()
export class DesignBrainApiService {
  getCapabilities() {
    return designBrain.getCapabilities();
  }

  getStats(scope?: BrainTenantScope) {
    return designBrain.getStats(scope);
  }

  getTasteProfile(scope?: BrainTenantScope) {
    return designBrain.getTasteProfile(scope);
  }

  consolidate(scope?: BrainTenantScope) {
    return designBrain.consolidate(scope);
  }

  listExperiences(sourceType?: BrainSourceType, limit?: number, scope?: BrainTenantScope) {
    return designBrain.listExperiences({ sourceType, limit, ...scope });
  }

  getExperience(id: string, scope?: BrainTenantScope) {
    return designBrain.getExperience(id, scope);
  }

  listPrinciples(
    limit?: number,
    offset?: number,
    options?: {
      category?: string;
      sort?: import('@logo-platform/shared').LearnedPrinciplesSort;
    } & BrainTenantScope,
  ) {
    return designBrain.listPrinciples(limit, offset, options);
  }

  listPrincipleCategories(scope?: BrainTenantScope) {
    return designBrain.listPrincipleCategories(scope);
  }

  previewResearch(query: string, url: string, scope?: BrainTenantScope) {
    const trimmedQuery = query?.trim();
    const trimmedUrl = url?.trim();
    if (!trimmedQuery) {
      throw new BadRequestException('query is required');
    }
    if (!trimmedUrl) {
      throw new BadRequestException('url is required');
    }
    return designBrain.previewResearch(trimmedQuery, trimmedUrl, scope ?? {}).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    });
  }

  runResearch(query: string, maxSources?: number, scope?: BrainTenantScope) {
    const trimmed = query?.trim();
    if (!trimmed) {
      throw new BadRequestException('query is required');
    }
    return designBrain.runResearch(trimmed, maxSources, scope ?? {});
  }

  listResearchCandidates(status?: BrainResearchCandidateStatus, scope?: BrainTenantScope) {
    return designBrain.listResearchCandidates(status, scope ?? {});
  }

  getResearchCandidate(id: string, scope?: BrainTenantScope) {
    return designBrain.getResearchCandidate(id, scope ?? {});
  }

  approveResearch(id: string, scope?: BrainTenantScope) {
    return designBrain.approveResearch(id, scope);
  }

  rejectResearch(id: string, scope?: BrainTenantScope) {
    return designBrain.rejectResearch(id, scope ?? {});
  }

  enqueuePdfIngest(
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
    return designBrain.enqueuePdfIngest({
      buffer,
      originalName,
      title: trimmed,
      jobId: jobId.trim(),
      organizationId: scope?.organizationId,
      projectId: scope?.projectId,
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

  checkPdfIngest(title: string, contentHash: string, scope?: BrainTenantScope) {
    const trimmed = title?.trim();
    if (!trimmed) {
      throw new BadRequestException('Title is required');
    }
    if (!contentHash?.trim()) {
      throw new BadRequestException('contentHash is required');
    }
    return designBrain.checkPdfIngest(trimmed, contentHash.trim(), scope ?? {});
  }

  getPdfIngestProgress(jobId: string) {
    return designBrain.getPdfIngestProgress(jobId);
  }

  ingestImage(
    buffer: Buffer,
    originalName: string,
    title?: string,
    mimeType?: string,
    scope?: BrainTenantScope,
  ) {
    return designBrain.ingestImage({ buffer, originalName, title, mimeType, ...scope });
  }

  ingestFeedback(input: BrainFeedbackInput) {
    return designBrain.ingestFeedback(input);
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
