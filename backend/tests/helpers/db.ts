import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@logo-platform/database';

const REPO_ROOT = resolve(__dirname, '../../..');

export function isE2eDbReady(): boolean {
  return process.env.BRAIN_DB_READY === 'true' && Boolean(process.env.DATABASE_URL);
}

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    log: ['error'],
  });
}

export async function pushSchema(databaseUrl: string): Promise<void> {
  execSync('npx tsx scripts/prisma-cli.ts migrate deploy', {
    cwd: resolve(REPO_ROOT, 'packages/database'),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'pipe',
  });
}

export async function ensureBrainSchema(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ ready: boolean }>>(
    `SELECT to_regclass('public.design_brain_experience_embeddings') IS NOT NULL AS ready`,
  );
  if (!rows[0]?.ready) {
    throw new Error('Versioned Design Brain migrations were not deployed');
  }
}

export async function resetBrainTables(prisma: PrismaClient): Promise<void> {
  await ensureBrainSchema(prisma);
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      design_brain_taste_signals,
      design_brain_experience_embeddings,
      learned_design_principles,
      design_brain_experiences
    RESTART IDENTITY CASCADE
  `);
}
