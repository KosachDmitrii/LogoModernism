import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { prisma } from '@logo-platform/database';
import { telemetrySdk } from '../observability/telemetry';

@Injectable()
export class DatabaseShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await prisma.$disconnect();
    await telemetrySdk?.shutdown();
  }
}
