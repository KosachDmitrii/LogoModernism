import { readFileSync } from 'node:fs';
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
  execSync('npx tsx scripts/prisma-cli.ts db push --skip-generate --accept-data-loss', {
    cwd: resolve(REPO_ROOT, 'packages/database'),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'pipe',
  });
}

export async function ensureBrainSchema(prisma: PrismaClient): Promise<void> {
  const sqlPath = resolve(REPO_ROOT, 'packages/database/prisma/sql/brain-setup.sql');
  const statements = readFileSync(sqlPath, 'utf8')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function resetBrainTables(prisma: PrismaClient): Promise<void> {
  await ensureBrainSchema(prisma);
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "BrainTasteSignal",
      brain_experience_embeddings,
      "LearnedPrinciple",
      "BrainExperience"
    RESTART IDENTITY CASCADE
  `);
}
