import './load-env';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Migration = {
  name: string;
  checksum: string;
  sql: string;
};

function migrationsDirectory(): string {
  return join(__dirname, '..', 'sql', 'migrations');
}

function loadMigrations(): Migration[] {
  const directory = migrationsDirectory();
  return readdirSync(directory)
    .filter((entry) => statSync(join(directory, entry)).isDirectory())
    .sort()
    .map((name) => {
      const sql = readFileSync(join(directory, name, 'migration.sql'), 'utf8');
      return {
        name,
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    });
}

function normalizeTransaction(sql: string): string {
  return sql
    .replace(/^\s*BEGIN;\s*$/gim, '')
    .replace(/^\s*COMMIT;\s*$/gim, '');
}

async function main(): Promise<void> {
  if (process.env.DIRECT_URL) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }
  process.env.DATABASE_STATEMENT_TIMEOUT_MS ??= '300000';
  const { getPool } = await import('../src');
  const pool = getPool();
  const migrations = loadMigrations();
  const byName = new Map(migrations.map((migration) => [migration.name, migration]));
  const client = await pool.connect();
  try {
    await client.query(`SELECT pg_advisory_lock(hashtext('logo-platform:migrations'))`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        checksum TEXT NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
        END IF;
      END
      $$
    `);

    const legacyExists = await client.query<{ exists: string | null }>(
      `SELECT to_regclass('public._prisma_migrations')::text AS exists`,
    );
    if (legacyExists.rows[0]?.exists) {
      const legacy = await client.query<{ migration_name: string }>(`
        SELECT migration_name
        FROM _prisma_migrations
        WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      `);
      for (const row of legacy.rows) {
        const migration = byName.get(row.migration_name);
        if (!migration) continue;
        await client.query(
          `INSERT INTO schema_migrations (name, checksum)
           VALUES ($1, $2)
           ON CONFLICT (name) DO NOTHING`,
          [migration.name, migration.checksum],
        );
      }
    }

    const appliedResult = await client.query<{
      name: string;
      checksum: string;
    }>(`SELECT name, checksum FROM schema_migrations`);
    const applied = new Map(
      appliedResult.rows.map((row) => [row.name, row.checksum]),
    );

    if (process.argv.includes('status')) {
      for (const migration of migrations) {
        const state = applied.has(migration.name) ? 'applied' : 'pending';
        console.log(`${state.padEnd(8)} ${migration.name}`);
      }
      return;
    }

    for (const migration of migrations) {
      const priorChecksum = applied.get(migration.name);
      if (priorChecksum) {
        if (priorChecksum !== migration.checksum) {
          throw new Error(
            `Migration checksum changed after apply: ${migration.name}`,
          );
        }
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(normalizeTransaction(migration.sql));
        await client.query(
          `INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)`,
          [migration.name, migration.checksum],
        );
        await client.query('COMMIT');
        console.log(`applied  ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client
      .query(`SELECT pg_advisory_unlock(hashtext('logo-platform:migrations'))`)
      .catch(() => undefined);
    client.release();
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
