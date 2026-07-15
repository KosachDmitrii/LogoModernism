import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@logo-platform/database';

const REPO_ROOT = resolve(__dirname, '../../../..');

export function isBrainDbReady(): boolean {
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

export async function seedLearnedPrinciple(
  prisma: PrismaClient,
  input: {
    promptFragment: string;
    weight?: number;
    confidence?: number;
    category?: string;
    ruleText?: string;
    sourceIds?: string[];
  },
) {
  return prisma.learnedPrinciple.create({
    data: {
      category: input.category ?? 'geometry',
      ruleText: input.ruleText ?? input.promptFragment,
      promptFragment: input.promptFragment,
      weight: input.weight ?? 1,
      confidence: input.confidence ?? 0.6,
      sourceIds: input.sourceIds ?? [],
      antiPatterns: [],
      tags: [],
    },
  });
}

import { deterministicEmbedding } from './embeddings';

export async function seedExperienceWithEmbedding(
  prisma: PrismaClient,
  input: {
    title: string;
    content: string;
    sourceType?: 'PDF' | 'TEXT' | 'FEEDBACK' | 'IMAGE' | 'CATALOG';
    embedding?: number[];
    metadata?: Record<string, unknown>;
  },
) {
  const { createExperience } = await import('../../src/storage/experience.repository');
  const { upsertExperienceEmbedding } = await import('../../src/storage/pgvector');

  const experience = await createExperience(prisma, {
    sourceType: input.sourceType ?? 'TEXT',
    title: input.title,
    content: input.content,
    summary: input.content.slice(0, 200),
    metadata: input.metadata,
  });

  const embedSource = `${experience.title ?? ''}\n${experience.summary ?? ''}\n${experience.content.slice(0, 400)}`;
  const embedding = input.embedding ?? deterministicEmbedding(embedSource);
  await upsertExperienceEmbedding(prisma, experience.id, embedding);
  return experience;
}
