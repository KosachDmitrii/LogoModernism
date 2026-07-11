import { Injectable, BadRequestException } from '@nestjs/common';
import type { BrainFeedbackInput, BrainResearchCandidateStatus, BrainSourceType } from '@logo-platform/shared';
import { designBrain } from '@logo-platform/design-brain';

@Injectable()
export class DesignBrainApiService {
  getCapabilities() {
    return designBrain.getCapabilities();
  }

  getStats() {
    return designBrain.getStats();
  }

  getTasteProfile() {
    return designBrain.getTasteProfile();
  }

  consolidate() {
    return designBrain.consolidate();
  }

  listExperiences(sourceType?: BrainSourceType, limit?: number) {
    return designBrain.listExperiences({ sourceType, limit });
  }

  getExperience(id: string) {
    return designBrain.getExperience(id);
  }

  listPrinciples(limit?: number) {
    return designBrain.listPrinciples(limit);
  }

  previewResearch(query: string, url: string) {
    const trimmedQuery = query?.trim();
    const trimmedUrl = url?.trim();
    if (!trimmedQuery) {
      throw new BadRequestException('query is required');
    }
    if (!trimmedUrl) {
      throw new BadRequestException('url is required');
    }
    return designBrain.previewResearch(trimmedQuery, trimmedUrl).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    });
  }

  runResearch(query: string, maxSources?: number) {
    const trimmed = query?.trim();
    if (!trimmed) {
      throw new BadRequestException('query is required');
    }
    return designBrain.runResearch(trimmed, maxSources);
  }

  listResearchCandidates(status?: BrainResearchCandidateStatus) {
    return designBrain.listResearchCandidates(status);
  }

  getResearchCandidate(id: string) {
    return designBrain.getResearchCandidate(id);
  }

  approveResearch(id: string) {
    return designBrain.approveResearch(id);
  }

  rejectResearch(id: string) {
    return designBrain.rejectResearch(id);
  }

  ingestPdf(buffer: Buffer, originalName: string, title: string, jobId?: string) {
    const trimmed = title?.trim();
    if (!trimmed) {
      throw new BadRequestException('Title is required');
    }
    return designBrain.ingestPdf({ buffer, originalName, title: trimmed, jobId }).catch((error) => {
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

  checkPdfIngest(title: string, contentHash: string) {
    const trimmed = title?.trim();
    if (!trimmed) {
      throw new BadRequestException('Title is required');
    }
    if (!contentHash?.trim()) {
      throw new BadRequestException('contentHash is required');
    }
    return designBrain.checkPdfIngest(trimmed, contentHash.trim());
  }

  getPdfIngestProgress(jobId: string) {
    return designBrain.getPdfIngestProgress(jobId);
  }

  ingestImage(buffer: Buffer, originalName: string, title?: string, mimeType?: string) {
    return designBrain.ingestImage({ buffer, originalName, title, mimeType });
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
