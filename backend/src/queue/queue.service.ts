import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  JOB_NAMES,
  JOB_PAYLOAD_VERSION,
  JobStatus,
  JobSubmission,
  QUEUE_NAMES,
  QueueJobPayload,
  QueueJobPayloadMap,
  QueueName,
} from '@logo-platform/shared';
import { Job, Queue } from 'bullmq';
import {
  getQueueRuntimeConfig,
  getRedisConnectionOptions,
} from './queue.config';

type AnyJobPayload = QueueJobPayloadMap[QueueName];
type AnyQueue = Queue<
  AnyJobPayload,
  unknown,
  string,
  AnyJobPayload,
  unknown,
  string
>;

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly config = getQueueRuntimeConfig();
  private readonly queues = new Map<QueueName, AnyQueue>();

  constructor() {
    for (const name of Object.values(QUEUE_NAMES)) {
      this.queues.set(
        name,
        new Queue<AnyJobPayload, unknown, string, AnyJobPayload, unknown, string>(name, {
          connection: getRedisConnectionOptions(),
          prefix: this.config.prefix,
          defaultJobOptions: this.config.defaultJobOptions,
        }),
      );
    }
  }

  async onModuleInit(): Promise<void> {
    if (!process.env.REDIS_URL) return;
    if (process.env.BRAIN_NIGHTLY_RESEARCH === 'true') {
      await this.getQueue(QUEUE_NAMES.research).upsertJobScheduler(
        'nightly-research',
        { pattern: process.env.BRAIN_RESEARCH_CRON ?? '0 2 * * *' },
        {
          name: JOB_NAMES.research,
          data: {
            version: JOB_PAYLOAD_VERSION,
            idempotencyKey: 'nightly-research',
            requestedAt: new Date().toISOString(),
            researchId: 'nightly',
            query: process.env.BRAIN_NIGHTLY_RESEARCH_QUERY ?? 'logo design systems',
            depth: 'deep',
          },
        },
      );
    }
    if (process.env.BRAIN_NIGHTLY_CONSOLIDATE === 'true') {
      await this.getQueue(QUEUE_NAMES.consolidation).upsertJobScheduler(
        'nightly-consolidation',
        { pattern: process.env.BRAIN_CONSOLIDATION_CRON ?? '0 4 * * *' },
        {
          name: JOB_NAMES.consolidation,
          data: {
            version: JOB_PAYLOAD_VERSION,
            idempotencyKey: 'nightly-consolidation',
            requestedAt: new Date().toISOString(),
            consolidationId: 'nightly',
            researchJobIds: [],
            strategy: 'synthesis',
          },
        },
      );
    }
  }

  async enqueue<Q extends QueueName>(
    queueName: Q,
    payload: QueueJobPayload<Q>,
  ): Promise<JobSubmission> {
    this.assertPayload(payload);
    const queue = this.getQueue(queueName);
    const jobId = this.jobId(queueName, payload.idempotencyKey);
    const existing = await queue.getJob(jobId);

    if (existing) {
      return { id: jobId, queue: queueName, deduplicated: true };
    }

    const job = await queue.add(JOB_NAMES[queueName], payload, { jobId });
    return { id: job.id ?? jobId, queue: queueName, deduplicated: false };
  }

  async getStatus(
    queueName: QueueName,
    jobId: string,
    organizationId?: string,
  ): Promise<JobStatus | null> {
    const job = await this.getQueue(queueName).getJob(jobId);
    if (organizationId && job?.data.organizationId !== organizationId) return null;
    return job ? this.toStatus(queueName, job) : null;
  }

  async findStatus(jobId: string, organizationId?: string): Promise<JobStatus | null> {
    for (const queueName of Object.values(QUEUE_NAMES)) {
      const status = await this.getStatus(queueName, jobId, organizationId);
      if (status) return status;
    }
    return null;
  }

  async getMetrics() {
    return Promise.all(
      [...this.queues.entries()].map(async ([queueName, queue]) => {
        const counts = await queue.getJobCounts(
          'active',
          'waiting',
          'delayed',
          'failed',
          'completed',
        );
        const waiting = await queue.getWaiting(0, 0);
        const oldest = waiting[0]?.timestamp;
        return {
          queue: queueName,
          counts,
          oldestWaitingAgeMs: oldest ? Math.max(0, Date.now() - oldest) : 0,
        };
      }),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
  }

  private getQueue(queueName: QueueName): AnyQueue {
    const queue = this.queues.get(queueName);
    if (!queue) throw new Error(`Unknown queue: ${queueName}`);
    return queue;
  }

  private assertPayload(payload: AnyJobPayload): void {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Job payload is required');
    }
    if (payload.version !== JOB_PAYLOAD_VERSION) {
      throw new BadRequestException(
        `Unsupported job payload version: ${String(payload.version)}`,
      );
    }
    if (
      typeof payload.idempotencyKey !== 'string' ||
      !payload.idempotencyKey.trim()
    ) {
      throw new BadRequestException('idempotencyKey is required');
    }
  }

  private jobId(queueName: QueueName, idempotencyKey: string): string {
    const digest = createHash('sha256')
      .update(`${queueName}\0${idempotencyKey}`)
      .digest('hex');
    return `${queueName}-${digest}`;
  }

  private async toStatus(
    queueName: QueueName,
    job: Job<AnyJobPayload>,
  ): Promise<JobStatus> {
    const state = await job.getState();
    return {
      id: job.id ?? '',
      queue: queueName,
      name: job.name,
      state: state === 'unknown' ? 'unknown' : state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      result: job.returnvalue,
      failedReason: job.failedReason || undefined,
      createdAt: new Date(job.timestamp).toISOString(),
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
    };
  }
}
