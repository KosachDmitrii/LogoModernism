import { PrismaClient } from '@prisma/client';
import { resolveDatabaseUrl } from './db-url';

resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { PrismaClient, Prisma } from '@prisma/client';
export {
  assertProductionRuntimeDatabaseUrl,
  enhanceDatabaseUrl,
  isSupabasePoolerUrl,
  isSupabaseTransactionPoolerUrl,
  resolveDatabaseUrl,
} from './db-url';
export { isPrismaConnectionError } from './connection';
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
