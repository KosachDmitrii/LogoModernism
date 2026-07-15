import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { disconnect } from '@logo-platform/database';
import { telemetrySdk } from '../observability/telemetry';

@Injectable()
export class DatabaseShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await disconnect();
    await telemetrySdk?.shutdown();
  }
}
