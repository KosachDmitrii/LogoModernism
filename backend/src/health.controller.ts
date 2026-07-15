import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '@logo-platform/database';
import Redis from 'ioredis';
import { Public } from './auth/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'logo-platform-api' };
  }

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'logo-platform-api',
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  @Get('ready')
  async ready() {
    try {
      const migrationRows = await prisma.$queryRawUnsafe<
        Array<{ failed: bigint; schema_ready: boolean }>
      >(`
        SELECT
          COUNT(*) FILTER (WHERE finished_at IS NULL AND rolled_back_at IS NULL)::bigint AS failed,
          to_regclass('public.generated_prompts') IS NOT NULL AS schema_ready
        FROM "_prisma_migrations"
      `);
      const migrations = migrationRows[0];
      if (!migrations?.schema_ready || Number(migrations.failed) > 0) {
        throw new Error('Database migrations are incomplete');
      }
      const redis = await this.checkRedis();
      return {
        status: 'ok',
        service: 'logo-platform-api',
        checks: {
          database: { status: 'ok' },
          migrations: { status: 'ok' },
          redis: { status: redis },
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'logo-platform-api',
        checks: {
          database: { status: 'error' },
          migrations: { status: 'error' },
          redis: { status: 'error' },
        },
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async checkRedis(): Promise<'ok' | 'not_configured'> {
    if (!process.env.REDIS_URL) {
      if (process.env.NODE_ENV === 'production') throw new Error('REDIS_URL is not configured');
      return 'not_configured';
    }
    const redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 2_000,
      commandTimeout: 2_000,
      maxRetriesPerRequest: 0,
    });
    try {
      await redis.connect();
      if ((await redis.ping()) !== 'PONG') throw new Error('Redis ping failed');
      return 'ok';
    } finally {
      redis.disconnect();
    }
  }
}
