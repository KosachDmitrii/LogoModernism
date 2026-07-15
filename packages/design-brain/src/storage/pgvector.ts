import type { PrismaClient } from '@logo-platform/database';
import { toVectorLiteral } from '../embedding/cosine';

let schemaReady = false;
let schemaReadyPromise: Promise<void> | null = null;

export async function ensureBrainSchema(prisma: PrismaClient): Promise<void> {
  if (schemaReady) return;
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ ready: boolean }>>(
        `SELECT (
           to_regclass('public.design_brain_experience_embeddings') IS NOT NULL
           AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
         ) AS ready`,
      );
      if (!rows[0]?.ready) {
        throw new Error(
          'Design Brain vector schema is not ready. Run versioned database migrations before starting workers.',
        );
      }
      schemaReady = true;
    })().finally(() => {
      schemaReadyPromise = null;
    });
  }

  await schemaReadyPromise;
}

export async function isPgvectorEnabled(prisma: PrismaClient): Promise<boolean> {
  try {
    await ensureBrainSchema(prisma);
    const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'design_brain_experience_embeddings'
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
    `INSERT INTO design_brain_experience_embeddings (experience_id, embedding)
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
  organizationId?: string,
  projectId?: string,
): Promise<VectorSearchRow[]> {
  await ensureBrainSchema(prisma);
  const vector = toVectorLiteral(queryEmbedding);

  return prisma.$queryRawUnsafe<VectorSearchRow[]>(
    `SELECT emb.experience_id, 1 - (emb.embedding <=> $1::vector) AS similarity
     FROM design_brain_experience_embeddings emb
     JOIN design_brain_experiences e ON e.id = emb.experience_id
     WHERE ($3::text IS NULL OR e.source_type::text = $3)
       AND ($4::text IS NULL OR e.organization_id = $4)
       AND ($5::text IS NULL OR e.project_id = $5)
     ORDER BY emb.embedding <=> $1::vector
     LIMIT $2`,
    vector,
    limit,
    sourceType ?? null,
    organizationId ?? null,
    projectId ?? null,
  );
}
