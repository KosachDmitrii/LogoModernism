import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { BackgroundTaskHandlersService } from './background-task-handlers.service';
import { BackgroundTasksService } from './background-tasks.service';
import type { BackgroundTask } from './background-task.types';

const POLL_INTERVAL_MS = 1_000;
const HEARTBEAT_INTERVAL_MS = 10_000;
const CANCELLATION_INTERVAL_MS = 1_000;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

@Injectable()
export class BackgroundTaskRunnerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BackgroundTaskRunnerService.name);
  private readonly concurrency = positiveInteger(
    process.env.BACKGROUND_TASK_CONCURRENCY,
    1,
  );
  private readonly active = new Map<
    string,
    { controller: AbortController; promise: Promise<void> }
  >();
  private timer?: NodeJS.Timeout;
  private ticking = false;
  private shuttingDown = false;

  constructor(
    private readonly tasks: BackgroundTasksService,
    private readonly handlers: BackgroundTaskHandlersService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.tasks.recoverStale();
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    this.timer.unref();
    void this.tick();
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.timer) clearInterval(this.timer);
    for (const { controller } of this.active.values()) {
      controller.abort(new Error('Application is shutting down'));
    }
    await Promise.allSettled(
      [...this.active.values()].map(({ promise }) => promise),
    );
  }

  cancelLocal(taskId: string): void {
    this.active
      .get(taskId)
      ?.controller.abort(new Error('Background task cancelled'));
  }

  private async tick(): Promise<void> {
    if (
      this.ticking ||
      this.shuttingDown ||
      this.active.size >= this.concurrency
    ) {
      return;
    }
    this.ticking = true;
    try {
      while (
        !this.shuttingDown &&
        this.active.size < this.concurrency
      ) {
        const task = await this.tasks.claimNext();
        if (!task) break;
        const controller = new AbortController();
        const promise = this.execute(task, controller).finally(() => {
          this.active.delete(task.id);
          void this.tick();
        });
        this.active.set(task.id, { controller, promise });
      }
    } catch (error) {
      this.logger.error(`Task claim failed: ${String(error)}`);
    } finally {
      this.ticking = false;
    }
  }

  private async execute(
    task: BackgroundTask,
    controller: AbortController,
  ): Promise<void> {
    let heartbeat: NodeJS.Timeout | undefined;
    let cancellation: NodeJS.Timeout | undefined;
    try {
      heartbeat = setInterval(
        () => void this.tasks.heartbeat(task.id).catch(() => undefined),
        HEARTBEAT_INTERVAL_MS,
      );
      heartbeat.unref();
      cancellation = setInterval(() => {
        void this.tasks
          .isCancellationRequested(task.id)
          .then((requested) => {
            if (requested) {
              controller.abort(new Error('Background task cancelled'));
            }
          })
          .catch(() => undefined);
      }, CANCELLATION_INTERVAL_MS);
      cancellation.unref();

      const result = await this.handlers.execute(task, {
        signal: controller.signal,
        updateProgress: async (progress, phase) => {
          controller.signal.throwIfAborted();
          await this.tasks.updateProgress(task.id, progress, phase);
        },
      });
      controller.signal.throwIfAborted();
      await this.tasks.succeed(
        task.id,
        JSON.parse(JSON.stringify(result ?? null)) as unknown,
      );
    } catch (error) {
      if (controller.signal.aborted) {
        await this.tasks.markCancelled(task.id);
      } else {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Task ${task.id} failed: ${message}`);
        await this.tasks.fail(task.id, message);
      }
    } finally {
      if (heartbeat) clearInterval(heartbeat);
      if (cancellation) clearInterval(cancellation);
    }
  }
}
