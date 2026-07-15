import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getQueueRuntimeConfig } from './queue.config';

const CANCELLATION_TTL_SECONDS = 24 * 60 * 60;
const CANCELLATION_POLL_MS = 500;

@Injectable()
export class QueueCancellationService implements OnModuleDestroy {
  private readonly config = getQueueRuntimeConfig();
  private readonly redis = new Redis(this.config.redisUrl, {
    maxRetriesPerRequest: null,
  });
  private readonly prefix = this.config.prefix;

  async cancel(jobId: string): Promise<void> {
    await this.redis.set(
      this.key(jobId),
      '1',
      'EX',
      CANCELLATION_TTL_SECONDS,
    );
  }

  async isCancelled(jobId: string): Promise<boolean> {
    return (await this.redis.exists(this.key(jobId))) === 1;
  }

  watch(jobId: string, controller: AbortController): () => void {
    let checking = false;
    const check = async () => {
      if (checking || controller.signal.aborted) return;
      checking = true;
      try {
        if (await this.isCancelled(jobId)) {
          controller.abort(new Error('Background job cancelled'));
        }
      } finally {
        checking = false;
      }
    };
    void check();
    const interval = setInterval(() => void check(), CANCELLATION_POLL_MS);
    interval.unref();
    return () => clearInterval(interval);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private key(jobId: string): string {
    return `${this.prefix}:cancelled:${jobId}`;
  }
}
