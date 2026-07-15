import './preload-env';
import './observability/telemetry';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { isAsyncQueueEnabled } from './queue/queue.config';

async function bootstrap(): Promise<void> {
  if (!isAsyncQueueEnabled()) {
    throw new Error(
      'Queue worker requires QUEUE_ASYNC_ENABLED=true and REDIS_URL',
    );
  }
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  Logger.log('Queue workers started', 'Worker');
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  Logger.error(message, undefined, 'Worker');
  process.exitCode = 1;
});
