import type { ConnectionOptions, JobsOptions } from 'bullmq';
import type { QueueName } from '@logo-platform/shared';

export interface QueueRuntimeConfig {
  redisUrl: string;
  prefix: string;
  concurrency: number;
  defaultJobOptions: JobsOptions;
}

export function isAsyncQueueEnabled(): boolean {
  return process.env.QUEUE_ASYNC_ENABLED === 'true' && Boolean(process.env.REDIS_URL);
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getQueueRuntimeConfig(): QueueRuntimeConfig {
  return {
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    prefix: process.env.QUEUE_PREFIX ?? 'logo-modernism',
    concurrency: positiveInteger(process.env.WORKER_CONCURRENCY, 5),
    defaultJobOptions: {
      attempts: positiveInteger(process.env.QUEUE_JOB_ATTEMPTS, 5),
      backoff: {
        type: 'exponential',
        delay: positiveInteger(process.env.QUEUE_RETRY_DELAY_MS, 1_000),
      },
      removeOnComplete: {
        age: positiveInteger(process.env.QUEUE_COMPLETED_RETENTION_SECONDS, 86_400),
        count: positiveInteger(process.env.QUEUE_COMPLETED_RETENTION_COUNT, 1_000),
      },
      removeOnFail: {
        age: positiveInteger(process.env.QUEUE_FAILED_RETENTION_SECONDS, 604_800),
        count: positiveInteger(process.env.QUEUE_FAILED_RETENTION_COUNT, 5_000),
      },
    },
  };
}

export function getQueueConcurrency(queueName: QueueName): number {
  const defaults: Record<QueueName, number> = {
    feedback: 5,
    pdf: 1,
    image: 2,
    research: 2,
    consolidation: 1,
    prompt: 2,
  };
  const envName = `WORKER_CONCURRENCY_${queueName.toUpperCase()}`;
  return positiveInteger(process.env[envName], defaults[queueName]);
}

export function getRedisConnectionOptions(): ConnectionOptions {
  const redisUrl = new URL(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  const database = redisUrl.pathname.replace(/^\//, '');
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username ? decodeURIComponent(redisUrl.username) : undefined,
    password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
    db: database ? Number(database) : 0,
    maxRetriesPerRequest: null,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
  };
}
