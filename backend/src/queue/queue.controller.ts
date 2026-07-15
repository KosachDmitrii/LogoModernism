import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ConsolidationJobPayload,
  FeedbackJobPayload,
  ImageJobPayload,
  PdfJobPayload,
  PromptJobPayload,
  QUEUE_NAMES,
  QueueName,
  ResearchJobPayload,
} from '@logo-platform/shared';
import { QueueService } from './queue.service';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { Roles } from '../auth/roles.decorator';

@Controller('jobs')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('feedback')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueFeedback(@Body() payload: FeedbackJobPayload, @Tenant() tenant?: TenantScope) {
    return this.queueService.enqueue(QUEUE_NAMES.feedback, {
      ...payload,
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
      actorId: tenant?.userId,
    });
  }

  @Post('pdf')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueuePdf(@Body() payload: PdfJobPayload, @Tenant() tenant?: TenantScope) {
    return this.queueService.enqueue(QUEUE_NAMES.pdf, {
      ...payload,
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
    });
  }

  @Post('image')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueImage(@Body() payload: ImageJobPayload, @Tenant() tenant?: TenantScope) {
    return this.queueService.enqueue(QUEUE_NAMES.image, {
      ...payload,
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
    });
  }

  @Post('research')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueResearch(@Body() payload: ResearchJobPayload, @Tenant() tenant?: TenantScope) {
    return this.queueService.enqueue(QUEUE_NAMES.research, {
      ...payload,
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
    });
  }

  @Post('consolidation')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueueConsolidation(
    @Body() payload: ConsolidationJobPayload,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.queueService.enqueue(QUEUE_NAMES.consolidation, {
      ...payload,
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
    });
  }

  @Post('prompt')
  @HttpCode(HttpStatus.ACCEPTED)
  enqueuePrompt(@Body() payload: PromptJobPayload, @Tenant() tenant?: TenantScope) {
    return this.queueService.enqueue(QUEUE_NAMES.prompt, {
      ...payload,
      organizationId: tenant?.organizationId,
      projectId: tenant?.projectId,
      requestedBy: tenant?.userId,
    });
  }

  @Get('metrics/summary')
  @Roles('OWNER', 'ADMIN')
  metrics() {
    return this.queueService.getMetrics();
  }

  @Get(':queue/:jobId')
  async getQueueJobStatus(
    @Param('queue') queue: string,
    @Param('jobId') jobId: string,
    @Tenant() tenant?: TenantScope,
  ) {
    const queueName = this.parseQueueName(queue);
    const status = await this.queueService.getStatus(
      queueName,
      jobId,
      tenant?.organizationId,
    );
    if (!status) throw new NotFoundException('Job not found');
    return status;
  }

  @Get(':jobId')
  async getJobStatus(@Param('jobId') jobId: string, @Tenant() tenant?: TenantScope) {
    const status = await this.queueService.findStatus(jobId, tenant?.organizationId);
    if (!status) throw new NotFoundException('Job not found');
    return status;
  }

  private parseQueueName(value: string): QueueName {
    if ((Object.values(QUEUE_NAMES) as string[]).includes(value)) {
      return value as QueueName;
    }
    throw new NotFoundException('Queue not found');
  }
}
