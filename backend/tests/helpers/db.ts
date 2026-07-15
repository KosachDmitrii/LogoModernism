import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import type { DatabaseClient } from '@logo-platform/database';

const REPO_ROOT = resolve(__dirname, '../../..');

export function isE2eDbReady(): boolean {
  return process.env.BRAIN_DB_READY === 'true' && Boolean(process.env.DATABASE_URL);
}

export async function getTestDatabase(): Promise<DatabaseClient> {
  return (await import('@logo-platform/database')).db;
}

export async function deploySchema(databaseUrl: string): Promise<void> {
  execSync('npm run db:migrate:deploy', {
    cwd: resolve(REPO_ROOT, 'packages/database'),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'pipe',
  });
}

export async function ensureBrainSchema(client: DatabaseClient): Promise<void> {
  const row = await client.one<{ ready: boolean }>(
    `SELECT to_regclass('public.design_brain_experience_embeddings') IS NOT NULL AS ready`,
  );
  if (!row.ready) {
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
