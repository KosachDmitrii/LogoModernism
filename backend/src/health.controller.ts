import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { db } from '@logo-platform/database';
import { Public } from './auth/public.decorator';
import { BackgroundTasksService } from './background-tasks/background-tasks.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly tasks: BackgroundTasksService) {}

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
    const startedAt = performance.now();
    try {
      const schema = await db.one<{ schemaReady: boolean }>(`
        SELECT
          to_regclass('public.generated_prompts') IS NOT NULL
            AND to_regclass('public.background_tasks') IS NOT NULL
            AND to_regclass('public.usage_operations') IS NOT NULL
            AND to_regclass('public.billing_webhook_events') IS NOT NULL AS schema_ready
      `);
      if (!schema.schemaReady) {
        throw new Error('Database migrations are incomplete');
      }
      const backlog = await this.tasks.backlog();
      return {
        status: 'ok',
        service: 'logo-platform-api',
        checks: {
          database: {
            status: 'ok',
            latencyMs: Math.round(performance.now() - startedAt),
          },
          migrations: { status: 'ok' },
          backgroundTasks: Object.fromEntries(
            backlog.map((item) => [item.status, item.count]),
          ),
        },
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        service: 'logo-platform-api',
        checks: {
          database: { status: 'error' },
          migrations: { status: 'error' },
          backgroundTasks: { status: 'unknown' },
        },
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

}
