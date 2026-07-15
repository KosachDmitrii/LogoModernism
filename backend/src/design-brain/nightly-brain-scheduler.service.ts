import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { BackgroundTasksService } from '../background-tasks/background-tasks.service';
import { BACKGROUND_TASK_TYPES } from '../background-tasks/background-task.types';

const CHECK_INTERVAL_MS = 60 * 60 * 1_000;

@Injectable()
export class NightlyBrainSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NightlyBrainSchedulerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private lastRunDate?: string;
  private active = false;

  constructor(private readonly tasks: BackgroundTasksService) {}

  onModuleInit(): void {
    if (process.env.BRAIN_NIGHTLY_RESEARCH !== 'true') {
      return;
    }
    this.active = true;
    this.timer = setInterval(() => void this.tick(), CHECK_INTERVAL_MS);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy(): void {
    this.active = false;
    if (this.timer) clearInterval(this.timer);
  }

  isActive(): boolean {
    return process.env.BRAIN_NIGHTLY_RESEARCH === 'true' && this.active;
  }

  private async tick(): Promise<void> {
    const now = new Date();
    const hour = this.configuredHour();
    const date = now.toISOString().slice(0, 10);
    if (now.getUTCHours() !== hour || this.lastRunDate === date) return;

    this.lastRunDate = date;
    try {
      const task = await this.tasks.create({
        type: BACKGROUND_TASK_TYPES.NIGHTLY_RESEARCH,
        idempotencyKey: `nightly-research:${date}`,
        payload: {},
      });
      this.logger.log(`Nightly research task queued: ${task.id}`);
    } catch (error) {
      this.lastRunDate = undefined;
      this.logger.error(
        error instanceof Error ? error.stack ?? error.message : String(error),
      );
    }
  }

  private configuredHour(): number {
    const value = Number(process.env.BRAIN_NIGHTLY_RESEARCH_HOUR_UTC ?? 2);
    return Number.isInteger(value) && value >= 0 && value <= 23 ? value : 2;
  }
}
