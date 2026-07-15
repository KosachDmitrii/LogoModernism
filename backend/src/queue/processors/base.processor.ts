import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  JOB_PAYLOAD_VERSION,
  QUEUE_NAMES,
  QueueName,
  VersionedJobPayload,
} from '@logo-platform/shared';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import { QueueJobHandler } from '../queue.constants';
import {
  getQueueRuntimeConfig,
  getQueueConcurrency,
  getRedisConnectionOptions,
} from '../queue.config';
import { UsageService } from '../../usage/usage.service';
import { QueueCancellationService } from '../queue-cancellation.service';
import { prisma } from '@logo-platform/database';

export abstract class BaseQueueProcessor<Payload extends VersionedJobPayload>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly config = getQueueRuntimeConfig();
  private readonly logger: Logger;
  private readonly usage = new UsageService();
  private worker?: Worker<Payload>;

  protected constructor(
    private readonly queueName: QueueName,
    private readonly handler?: QueueJobHandler<Payload>,
    private readonly cancellation?: QueueCancellationService,
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
    const reservationId = job.data.usageReservationId;
    const controller = new AbortController();
    const stopWatching = this.cancellation?.watch(job.id ?? '', controller);
    const throwIfCancellationRequested = () => {
      if (controller.signal.aborted) {
        throw new UnrecoverableError('Background job cancelled');
      }
    };
    if (this.cancellation && await this.cancellation.isCancelled(job.id ?? '')) {
      controller.abort(new Error('Background job cancelled'));
    }
    if (reservationId) {
      await this.usage.markProcessing(reservationId, job.id);
    }
    try {
      throwIfCancellationRequested();
      const result = await this.handler.process(job.data, {
        jobId: job.id ?? '',
        attempt: job.attemptsMade + 1,
        signal: controller.signal,
        throwIfCancellationRequested,
        updateProgress: async (progress) => {
          await job.updateProgress(progress);
        },
      });
      throwIfCancellationRequested();
      if (reservationId) await this.usage.commit(reservationId);
      return result;
    } catch (error) {
      const attempts = job.opts.attempts ?? 1;
      const cancelled =
        controller.signal.aborted || error instanceof UnrecoverableError;
      const finalAttempt = cancelled || job.attemptsMade + 1 >= attempts;
      if (cancelled && this.queueName === QUEUE_NAMES.image && 'imageId' in job.data) {
        await prisma.logo
          .deleteMany({
            where: {
              id: String(job.data.imageId),
              ...(job.data.organizationId
                ? { organizationId: job.data.organizationId }
                : {}),
              publicUrl: null,
            },
          })
          .catch((cleanupError) => {
            this.logger.error(
              `Failed to remove cancelled logo placeholder: ${String(cleanupError)}`,
            );
          });
      }
      if (reservationId && finalAttempt) {
        await this.usage.release(reservationId).catch((releaseError) => {
          this.logger.error(
            `Failed to release usage reservation ${reservationId}: ${String(releaseError)}`,
          );
        });
      }
      if (cancelled && !(error instanceof UnrecoverableError)) {
        throw new UnrecoverableError('Background job cancelled');
      }
      throw error;
    } finally {
      stopWatching?.();
    }
  }
}
