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
import type {
  BrainResearchCandidateStatus,
  BrainSourceType,
  BrainTenantScope,
  LearnedPrinciplesSort,
} from '@logo-platform/shared';
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
import { isAsyncQueueEnabled } from '../queue/queue.config';
import { ObjectStorageService } from '../storage/object-storage.service';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { ALL_MEMBERS, BrainAdmin, CONTRIBUTORS, Roles } from '../auth/roles.decorator';
import { getGlobalBrainScope } from './global-brain-scope';

type UploadedFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

function tenantPdfJobId(jobId: string, tenant?: BrainTenantScope): string {
  if (!tenant?.organizationId) {
    throw new BadRequestException('Organization scope is required');
  }
  return `${tenant.organizationId}:${tenant.projectId ?? '_'}:${jobId}`;
}

@Controller('brain')
export class DesignBrainController {
  constructor(
    private readonly service: DesignBrainApiService,
    private readonly queues: QueueService,
    private readonly storage: ObjectStorageService,
  ) {}

  @Get('health')
  @BrainAdmin()
  health() {
    return this.service.getCapabilities();
  }

  @Get('stats')
  @Roles(...ALL_MEMBERS)
  stats(@Tenant() tenant?: TenantScope) {
    return this.service.getStats(tenant);
  }

  @Get('taste-profile')
  @Roles(...ALL_MEMBERS)
  tasteProfile(@Tenant() tenant?: TenantScope) {
    return this.service.getTasteProfile(tenant);
  }

  @Post('consolidate')
  @BrainAdmin()
  @HttpCode(HttpStatus.ACCEPTED)
  async consolidate(@Tenant() tenant?: TenantScope) {
    if (!isAsyncQueueEnabled()) return this.service.consolidate(tenant);
    const brainScope = await getGlobalBrainScope(tenant?.userId);
    const id = `consolidation:${Date.now()}`;
    return this.queues.enqueue(QUEUE_NAMES.consolidation, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: id,
      requestedAt: new Date().toISOString(),
      organizationId: brainScope.organizationId,
      requestedBy: tenant?.userId,
      consolidationId: id,
      researchJobIds: [],
      strategy: 'synthesis',
    });
  }

  @Get('experiences')
  @BrainAdmin()
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
  @BrainAdmin()
  experience(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.service.getExperience(id, tenant);
  }

  @Get('principles/categories')
  @Roles(...ALL_MEMBERS)
  principleCategories(@Tenant() tenant?: TenantScope) {
    return this.service.listPrincipleCategories(tenant);
  }

  @Get('principles')
  @Roles(...ALL_MEMBERS)
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
  @BrainAdmin()
  @HttpCode(HttpStatus.ACCEPTED)
  async runResearch(@Body() body: BrainResearchRunDto, @Tenant() tenant?: TenantScope) {
    if (!isAsyncQueueEnabled()) {
      return this.service.runResearch(body.query, body.maxSources, tenant);
    }
    const brainScope = await getGlobalBrainScope(tenant?.userId);
    const id = `research:${Date.now()}`;
    return this.queues.enqueue(QUEUE_NAMES.research, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: id,
      requestedAt: new Date().toISOString(),
      organizationId: brainScope.organizationId,
      requestedBy: tenant?.userId,
      researchId: id,
      query: body.query,
      depth: body.maxSources && body.maxSources > 10 ? 'deep' : 'standard',
    });
  }

  @Post('research/preview')
  @BrainAdmin()
  previewResearch(@Body() body: BrainResearchPreviewDto, @Tenant() tenant?: TenantScope) {
    return this.service.previewResearch(body.query, body.url, tenant);
  }

  @Get('research/candidates')
  @BrainAdmin()
  researchCandidates(
    @Query('status') status?: BrainResearchCandidateStatus,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.service.listResearchCandidates(status, tenant);
  }

  @Get('research/candidates/:id')
  @BrainAdmin()
  researchCandidate(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.service.getResearchCandidate(id, tenant);
  }

  @Post('research/candidates/:id/approve')
  @BrainAdmin()
  approveResearch(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.service.approveResearch(id, tenant);
  }

  @Post('research/candidates/:id/reject')
  @BrainAdmin()
  rejectResearch(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.service.rejectResearch(id, tenant);
  }

  @Post('ingest/pdf/check')
  @BrainAdmin()
  checkPdfIngest(@Body() body: BrainPdfIngestCheckDto, @Tenant() tenant?: TenantScope) {
    return this.service.checkPdfIngest(body.title, body.contentHash, tenant);
  }

  @Get('ingest/pdf/progress/:jobId')
  @BrainAdmin()
  async pdfIngestProgress(@Param('jobId') jobId: string, @Tenant() tenant?: TenantScope) {
    const brainScope = await getGlobalBrainScope(tenant?.userId);
    const progress = isAsyncQueueEnabled()
      ? await this.queues.findStatus(jobId, brainScope.organizationId)
      : this.service.getPdfIngestProgress(tenantPdfJobId(jobId, brainScope));
    if (!progress) {
      throw new NotFoundException('Progress not found');
    }
    return progress;
  }

  @Post('ingest/pdf')
  @BrainAdmin()
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
    const brainScope = await getGlobalBrainScope(tenant?.userId);
    if (!isAsyncQueueEnabled()) {
      return this.service.enqueuePdfIngest(
        file.buffer,
        file.originalname,
        title,
        tenantPdfJobId(jobId.trim(), brainScope),
        brainScope,
      );
    }
    const sourceKey = [
      'brain-inputs',
      brainScope.organizationId!,
      `${jobId.trim()}-${file.originalname.replace(/[^A-Za-z0-9._-]/g, '_')}`,
    ].join('/');
    const outputKey = [
      'brain-results',
      brainScope.organizationId!,
      `${jobId.trim()}.json`,
    ].join('/');
    await this.storage.put(sourceKey, file.buffer, { contentType: file.mimetype });
    const submission = await this.queues.enqueue(QUEUE_NAMES.pdf, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: jobId.trim(),
      requestedAt: new Date().toISOString(),
      organizationId: brainScope.organizationId,
      requestedBy: tenant?.userId,
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
  @BrainAdmin()
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
  @Roles(...CONTRIBUTORS)
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestFeedback(@Body() body: BrainFeedbackDto, @Tenant() tenant?: TenantScope) {
    const brainScope = await getGlobalBrainScope(tenant?.userId);
    if (!isAsyncQueueEnabled()) {
      return this.service.ingestFeedback({
        ...body,
        organizationId: brainScope.organizationId,
      });
    }
    return this.queues.enqueue(QUEUE_NAMES.feedback, {
      version: JOB_PAYLOAD_VERSION,
      idempotencyKey: `brain-feedback:${Date.now()}`,
      requestedAt: new Date().toISOString(),
      organizationId: brainScope.organizationId,
      signalType: body.signalType,
      score: body.score,
      experienceId: body.experienceId,
      context: body.context,
      metadata: body.metadata,
    });
  }

  @Post('brief/interview')
  @Roles(...CONTRIBUTORS)
  briefInterview(@Body() body: BrainBriefInterviewDto) {
    return this.service.runBriefInterview(body);
  }
}
