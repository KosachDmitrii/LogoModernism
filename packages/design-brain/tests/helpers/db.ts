import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { DatabaseClient } from '@logo-platform/database';

const REPO_ROOT = resolve(__dirname, '../../../..');

export function isBrainDbReady(): boolean {
  return process.env.BRAIN_DB_READY === 'true' && Boolean(process.env.DATABASE_URL);
}

export function createTestDatabase(): DatabaseClient {
  const getClient = async () => (await import('@logo-platform/database')).db;
  return {
    async query<T>(text: string, values?: readonly unknown[]) {
      return (await getClient()).query<T>(text, values);
    },
    async one<T>(text: string, values?: readonly unknown[]) {
      return (await getClient()).one<T>(text, values);
    },
    async maybeOne<T>(text: string, values?: readonly unknown[]) {
      return (await getClient()).maybeOne<T>(text, values);
    },
    async transaction<T>(
      fn: (tx: DatabaseClient) => Promise<T>,
      options?: { isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' },
    ) {
      return (await getClient()).transaction(fn, options);
    },
  };
}

export async function pushSchema(databaseUrl: string): Promise<void> {
  execSync('npm run db:migrate:deploy', {
    cwd: resolve(REPO_ROOT, 'packages/database'),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'pipe',
  });
}

export async function ensureBrainSchema(client: DatabaseClient): Promise<void> {
  const { rows } = await client.query<{ ready: boolean }>(
    `SELECT to_regclass('public.design_brain_experience_embeddings') IS NOT NULL AS ready`,
  );
  if (!rows[0]?.ready) {
    throw new Error('Versioned Design Brain migrations were not deployed');
  }
}

export async function resetBrainTables(client: DatabaseClient): Promise<void> {
  await ensureBrainSchema(client);
  await client.query(`
    TRUNCATE TABLE
      design_brain_taste_signals,
      design_brain_experience_embeddings,
      learned_design_principles,
      design_brain_experiences
    RESTART IDENTITY CASCADE
  `);
}

export async function seedLearnedPrinciple(
  client: DatabaseClient,
  input: {
    promptFragment: string;
    weight?: number;
    confidence?: number;
    category?: string;
    ruleText?: string;
    sourceIds?: string[];
  },
) {
  return client.one<import('../../src/storage/database-types').LearnedPrincipleRow>(
    `INSERT INTO learned_design_principles
       (id, category, rule_text, prompt_fragment, weight, confidence, source_ids,
        anti_patterns, tags, citations, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, NOW(), NOW())
     RETURNING *`,
    [
      randomUUID(),
      input.category ?? 'geometry',
      input.ruleText ?? input.promptFragment,
      input.promptFragment,
      input.weight ?? 1,
      input.confidence ?? 0.6,
      input.sourceIds ?? [],
      [],
      [],
      '[]',
    ],
  );
}

import { deterministicEmbedding } from './embeddings';

export async function seedExperienceWithEmbedding(
  client: DatabaseClient,
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

  const experience = await createExperience(client, {
    sourceType: input.sourceType ?? 'TEXT',
    title: input.title,
    content: input.content,
    summary: input.content.slice(0, 200),
    metadata: input.metadata,
  });

  const embedSource = `${experience.title ?? ''}\n${experience.summary ?? ''}\n${experience.content.slice(0, 400)}`;
  const embedding = input.embedding ?? deterministicEmbedding(embedSource);
  await upsertExperienceEmbedding(client, experience.id, embedding);
  return experience;
}

export async function listTestPrinciples(client: DatabaseClient) {
  return (await client.query<import('../../src/storage/database-types').LearnedPrincipleRow>(
    'SELECT * FROM learned_design_principles ORDER BY created_at ASC',
  )).rows;
}

export async function getTestPrinciple(client: DatabaseClient, id: string) {
  return client.maybeOne<import('../../src/storage/database-types').LearnedPrincipleRow>(
    'SELECT * FROM learned_design_principles WHERE id = $1',
    [id],
  );
}

export async function seedTasteSignal(
  client: DatabaseClient,
  input: {
    signalType: 'LIKE' | 'DISLIKE' | 'APPROVE' | 'REJECT' | 'RATING';
    score: number;
    context?: string;
    metadata?: Record<string, unknown>;
    organizationId?: string;
    projectId?: string;
  },
) {
  return client.one(
    `INSERT INTO design_brain_taste_signals
       (id, signal_type, score, context, metadata, organization_id, project_id, created_at)
     VALUES ($1, $2::"TasteSignalType", $3, $4, $5::jsonb, $6, $7, NOW())
     RETURNING *`,
    [
      randomUUID(),
      input.signalType,
      input.score,
      input.context ?? null,
      JSON.stringify(input.metadata ?? {}),
      input.organizationId ?? null,
      input.projectId ?? null,
    ],
  );
}
