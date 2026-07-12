import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PrismaClient } from '@logo-platform/database';
import { toVectorLiteral } from '../embedding/cosine';
import { getRepoRoot } from './paths';

let schemaReady = false;

function sqlPath(): string {
  return resolve(getRepoRoot(), 'packages/database/prisma/sql/brain-setup.sql');
}

export async function ensureBrainSchema(prisma: PrismaClient): Promise<void> {
  if (schemaReady) return;

  const sql = readFileSync(sqlPath(), 'utf8');
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }

  schemaReady = true;
}

export async function isPgvectorEnabled(prisma: PrismaClient): Promise<boolean> {
  try {
    await ensureBrainSchema(prisma);
    const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_name = 'brain_experience_embeddings'
       ) AS exists`,
    );
    return Boolean(rows[0]?.exists);
  } catch {
    return false;
  }
}

export async function upsertExperienceEmbedding(
  prisma: PrismaClient,
  experienceId: string,
  embedding: number[],
): Promise<void> {
  await ensureBrainSchema(prisma);
  const vector = toVectorLiteral(embedding);
  await prisma.$executeRawUnsafe(
    `INSERT INTO brain_experience_embeddings (experience_id, embedding)
     VALUES ($1, $2::vector)
     ON CONFLICT (experience_id)
     DO UPDATE SET embedding = EXCLUDED.embedding, created_at = NOW()`,
    experienceId,
    vector,
  );
}

export interface VectorSearchRow {
  experience_id: string;
  similarity: number;
}

export async function searchExperienceEmbeddings(
  prisma: PrismaClient,
  queryEmbedding: number[],
  limit: number,
  sourceType?: string,
): Promise<VectorSearchRow[]> {
  await ensureBrainSchema(prisma);
  const vector = toVectorLiteral(queryEmbedding);

  if (sourceType) {
    return prisma.$queryRawUnsafe<VectorSearchRow[]>(
      `SELECT emb.experience_id, 1 - (emb.embedding <=> $1::vector) AS similarity
       FROM brain_experience_embeddings emb
       JOIN "BrainExperience" e ON e.id = emb.experience_id
       WHERE e."sourceType" = $3::"BrainSourceType"
       ORDER BY emb.embedding <=> $1::vector
       LIMIT $2`,
      vector,
      limit,
      sourceType,
    );
  }

  return prisma.$queryRawUnsafe<VectorSearchRow[]>(
    `SELECT experience_id, 1 - (embedding <=> $1::vector) AS similarity
     FROM brain_experience_embeddings
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vector,
    limit,
  );
}
