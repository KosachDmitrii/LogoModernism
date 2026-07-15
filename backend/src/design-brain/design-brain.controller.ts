import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { LearnedPrinciplesSort, BrainResearchCandidateStatus, BrainSourceType } from '@logo-platform/shared';
import { JOB_PAYLOAD_VERSION, LEARNED_PRINCIPLES_SORTS, QUEUE_NAMES } from '@logo-platform/shared';
import { DesignBrainApiService } from './design-brain.service';
import {
  BrainFeedbackDto,
  BrainPdfIngestCheckDto,
  BrainResearchPreviewDto,
  BrainResearchRunDto,
  BrainBriefInterviewDto,
} from './dto/brain.dto';
import { QueueService } from '../queue/queue.service';
import { ObjectStorageService } from '../storage/object-storage.service';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { Roles } from '../auth/roles.decorator';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

@Controller('brain')
export class DesignBrainController {
  constructor(
    private readonly service: DesignBrainApiService,
    private readonly queues: QueueService,
    private readonly storage: ObjectStorageService,
  ) {}

  @Get('health')
  health() {
    return this.service.getCapabilities();
  }

  @Get('stats')
  stats(@Tenant() tenant?: TenantScope) {
    return this.service.getStats(tenant);
  }

  @Get('taste-profile')
  tasteProfile(@Tenant() tenant?: TenantScope) {
    return this.service.getTasteProfile(tenant);
  }

  @Post('consolidate')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  consolidate(@Tenant() tenant?: TenantScope) {
    if (!process.env.REDIS_URL) return this.service.consolidate(tenant);
    const id = `consolidation:${Date.now()}`;
    return this.queues.enqueue(QUEUE_NAMES.consolidation, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: id,
      requestedAt: new Date().toISOString(),
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
      consolidationId: id,
      researchJobIds: [],
      strategy: 'synthesis',
    });
  }

  @Get('experiences')
  experiences(
    @Query('sourceType') sourceType?: BrainSourceType,
    @Query('limit') limit?: string,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.service.listExperiences(
      sourceType,
      limit ? Number(limit) : undefined,
      tenant,
    );
  }

  @Get('experiences/:id')
  experience(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.service.getExperience(id, tenant);
  }

  @Get('principles/categories')
  principleCategories(@Tenant() tenant?: TenantScope) {
    return this.service.listPrincipleCategories(tenant);
  }

  @Get('principles')
  principles(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
    @Tenant() tenant?: TenantScope,
  ) {
    const resolvedSort = LEARNED_PRINCIPLES_SORTS.includes(sort as LearnedPrinciplesSort)
      ? (sort as LearnedPrinciplesSort)
      : 'influence_desc';

    return this.service.listPrinciples(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
      {
        category: category?.trim() || undefined,
        sort: resolvedSort,
        ...tenant,
      },
    );
  }

  @Post('research/run')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  runResearch(@Body() body: BrainResearchRunDto, @Tenant() tenant?: TenantScope) {
    if (!process.env.REDIS_URL) {
      return this.service.runResearch(body.query, body.maxSources);
    }
    const id = `research:${Date.now()}`;
    return this.queues.enqueue(QUEUE_NAMES.research, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: id,
      requestedAt: new Date().toISOString(),
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
      researchId: id,
      query: body.query,
      depth: body.maxSources && body.maxSources > 10 ? 'deep' : 'standard',
    });
  }

  @Post('research/preview')
  previewResearch(@Body() body: BrainResearchPreviewDto) {
    return this.service.previewResearch(body.query, body.url);
  }

  @Get('research/candidates')
  researchCandidates(@Query('status') status?: BrainResearchCandidateStatus) {
    return this.service.listResearchCandidates(status);
  }

  @Get('research/candidates/:id')
  researchCandidate(@Param('id') id: string) {
    return this.service.getResearchCandidate(id);
  }

  @Post('research/candidates/:id/approve')
  @Roles('OWNER', 'ADMIN')
  approveResearch(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.service.approveResearch(id, tenant);
  }

  @Post('research/candidates/:id/reject')
  @Roles('OWNER', 'ADMIN')
  rejectResearch(@Param('id') id: string) {
    return this.service.rejectResearch(id);
  }

  @Post('ingest/pdf/check')
  checkPdfIngest(@Body() body: BrainPdfIngestCheckDto) {
    return this.service.checkPdfIngest(body.title, body.contentHash);
  }

  @Get('ingest/pdf/progress/:jobId')
  async pdfIngestProgress(@Param('jobId') jobId: string, @Tenant() tenant?: TenantScope) {
    const progress = process.env.REDIS_URL
      ? await this.queues.findStatus(jobId, tenant?.organizationId)
      : this.service.getPdfIngestProgress(jobId);
    if (!progress) {
      throw new NotFoundException('Progress not found');
    }
    return progress;
  }

  @Post('ingest/pdf')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024, fields: 4, fieldNameSize: 100 },
    }),
  )
  async ingestPdf(
    @UploadedFile() file: UploadedFile,
    @Body('title') title?: string,
    @Body('jobId') jobId?: string,
    @Tenant() tenant?: TenantScope,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('PDF file is required (field name: file)');
    }
    if (!title?.trim()) {
      throw new BadRequestException('Title is required');
    }
    if (!jobId?.trim()) {
      throw new BadRequestException('jobId is required');
    }
    if (!process.env.REDIS_URL) {
      return this.service.enqueuePdfIngest(
        file.buffer,
        file.originalname,
        title,
        jobId.trim(),
      );
    }
    const sourceKey = [
      'brain-inputs',
      tenant?.organizationId ?? 'unscoped',
      `${jobId.trim()}-${file.originalname.replace(/[^A-Za-z0-9._-]/g, '_')}`,
    ].join('/');
    const outputKey = [
      'brain-results',
      tenant?.organizationId ?? 'unscoped',
      `${jobId.trim()}.json`,
    ].join('/');
    await this.storage.put(sourceKey, file.buffer, { contentType: file.mimetype });
    const submission = await this.queues.enqueue(QUEUE_NAMES.pdf, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: jobId.trim(),
      requestedAt: new Date().toISOString(),
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
      documentId: title.trim(),
      sourceKey,
      outputKey,
    });
    return {
      jobId: submission.id,
      status: 'queued' as const,
      message: submission.deduplicated ? 'PDF job already queued' : 'PDF queued for ingestion',
    };
  }

  @Post('ingest/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, fields: 2, fieldNameSize: 100 },
    }),
  )
  ingestImage(
    @UploadedFile() file: UploadedFile,
    @Body('title') title?: string,
    @Tenant() tenant?: TenantScope,
  ) {
    if (!file?.buffer?.length) {
      throw new Error('Image file is required (field name: file)');
    }
    return this.service.ingestImage(
      file.buffer,
      file.originalname,
      title,
      file.mimetype,
      tenant,
    );
  }

  @Post('ingest/feedback')
  @HttpCode(HttpStatus.ACCEPTED)
  ingestFeedback(@Body() body: BrainFeedbackDto, @Tenant() tenant?: TenantScope) {
    if (!process.env.REDIS_URL) {
      return this.service.ingestFeedback({
        ...body,
        organizationId: tenant?.organizationId,
        projectId: tenant?.projectId,
      });
    }
    return this.queues.enqueue(QUEUE_NAMES.feedback, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: `brain-feedback:${Date.now()}`,
      requestedAt: new Date().toISOString(),
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
      signalType: body.signalType,
      score: body.score,
      context: body.context,
      metadata: body.metadata,
    });
  }

  @Post('brief/interview')
  briefInterview(@Body() body: BrainBriefInterviewDto) {
    return this.service.runBriefInterview(body);
  }
}
