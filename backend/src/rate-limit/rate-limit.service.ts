import {
  Injectable,
  HttpException,
  HttpStatus,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';

type MemoryCounter = { count: number; resetAt: number };

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly redis = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
    : null;
  private readonly memory = new Map<string, MemoryCounter>();

  async consume(key: string, limit: number, windowSeconds: number): Promise<void> {
    if (this.redis) {
      const result = (await this.redis.eval(
        `
          local value = redis.call('INCR', KEYS[1])
          if value == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
          local ttl = redis.call('TTL', KEYS[1])
          return { value, ttl }
        `,
        1,
        `rate:${key}`,
        windowSeconds,
      )) as [number, number];
      if (Number(result[0]) > limit) {
        throw this.exceeded(Number(result[1]));
      }
      return;
    }

    const now = Date.now();
    const existing = this.memory.get(key);
    const counter =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: now + windowSeconds * 1_000 }
        : existing;
    counter.count += 1;
    this.memory.set(key, counter);
    if (counter.count > limit) {
      throw this.exceeded(Math.ceil((counter.resetAt - now) / 1_000));
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  private exceeded(retryAfterSeconds: number): HttpException {
    return new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
