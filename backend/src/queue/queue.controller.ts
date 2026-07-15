import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import {
  QUEUE_NAMES,
  QueueName,
} from '@logo-platform/shared';
import { QueueService } from './queue.service';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { BRAIN_ADMINS, CONTRIBUTORS, Roles } from '../auth/roles.decorator';

@Controller('jobs')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('metrics/summary')
  @Roles(...BRAIN_ADMINS)
  metrics() {
    return this.queueService.getMetrics();
  }

  @Get(':queue/:jobId')
  @Roles(...CONTRIBUTORS)
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
  @Roles(...CONTRIBUTORS)
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
