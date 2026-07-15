import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  JOB_PAYLOAD_VERSION,
  QueueName,
  VersionedJobPayload,
} from '@logo-platform/shared';
import { Job, Worker } from 'bullmq';
import { QueueJobHandler } from '../queue.constants';
import {
  getQueueRuntimeConfig,
  getQueueConcurrency,
  getRedisConnectionOptions,
} from '../queue.config';

export abstract class BaseQueueProcessor<Payload extends VersionedJobPayload>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly config = getQueueRuntimeConfig();
  private readonly logger: Logger;
  private worker?: Worker<Payload>;

  protected constructor(
    private readonly queueName: QueueName,
    private readonly handler?: QueueJobHandler<Payload>,
  ) {
    this.logger = new Logger(`${queueName} worker`);
  }

  onModuleInit(): void {
    this.worker = new Worker<Payload>(
      this.queueName,
      (job) => this.process(job),
      {
        connection: getRedisConnectionOptions(),
        prefix: this.config.prefix,
        concurrency: getQueueConcurrency(this.queueName),
      },
    );
    this.worker.on('error', (error) => {
      this.logger.error(error.message, error.stack);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async process(job: Job<Payload>): Promise<unknown> {
    if (job.data.version !== JOB_PAYLOAD_VERSION) {
      throw new Error(`Unsupported job payload version: ${String(job.data.version)}`);
    }
    if (!this.handler) {
      throw new Error(`No handler is registered for the ${this.queueName} queue`);
    }
    return this.handler.process(job.data, {
      jobId: job.id ?? '',
      attempt: job.attemptsMade + 1,
      updateProgress: async (progress) => {
        await job.updateProgress(progress);
      },
    });
  }
}
