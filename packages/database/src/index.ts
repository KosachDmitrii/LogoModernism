import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './db-url';
import { runWithPrismaReconnect, startPrismaKeepalive } from './connection';

resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return base.$extends({
    query: {
      $allOperations({ args, query }) {
        return runWithPrismaReconnect(base, () => query(args));
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

if (process.env.DATABASE_URL) {
  void prisma.$connect().catch((error) => {
    console.error(
      '[database] Initial PostgreSQL connection failed:',
      error instanceof Error ? error.message : error,
    );
  });
  startPrismaKeepalive(prisma);
}

export { PrismaClient, Prisma } from '@prisma/client';
export { enhanceDatabaseUrl, resolveDatabaseUrl } from './db-url';
export {
  isPrismaConnectionError,
  reconnectPrisma,
  runWithPrismaReconnect,
  startPrismaKeepalive,
  stopPrismaKeepalive,
} from './connection';
export type {
  User,
  Organization,
  Project,
  Brand,
  BrandDNA,
  Logo,
  LogoVersion,
  PromptRun,
  BrainExperience,
  BrainTasteSignal,
  LearnedPrinciple,
  ComposedPromptRecord,
} from '@prisma/client';
