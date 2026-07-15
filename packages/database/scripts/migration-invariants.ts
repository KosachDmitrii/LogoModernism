import './load-env';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

type Snapshot = {
  capturedAt: string;
  tables: Record<string, number>;
  foreignKeys: number;
  indexes: number;
};

const prisma = new PrismaClient();
const logicalTables = [
  ['User', 'users'],
  ['Organization', 'organizations'],
  ['OrganizationMember', 'organization_members'],
  ['Project', 'projects'],
  ['Brand', 'brands'],
  ['BrandDNA', 'brand_profiles'],
  ['PromptRun', 'prompt_generation_runs'],
  ['ComposedPromptRecord', 'generated_prompts'],
  ['Logo', 'generated_logos'],
  ['LogoVersion', 'generated_logo_versions'],
  ['BrainExperience', 'design_brain_experiences'],
  ['BrainTasteSignal', 'design_brain_taste_signals'],
  ['LearnedPrinciple', 'learned_design_principles'],
] as const;

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

async function capture(): Promise<Snapshot> {
  const existingRows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const existing = new Set(existingRows.map((row) => row.table_name));
  const tables: Record<string, number> = {};

  for (const [before, after] of logicalTables) {
    const table = existing.has(after) ? after : existing.has(before) ? before : null;
    if (!table) {
      tables[after] = 0;
      continue;
    }
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM ${quoteIdentifier(table)}`,
    );
    tables[after] = Number(rows[0]?.count ?? 0);
  }

  const [foreignKeys, indexes] = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public' AND c.contype = 'f'
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `,
  ]);

  return {
    capturedAt: new Date().toISOString(),
    tables,
    foreignKeys: Number(foreignKeys[0]?.count ?? 0),
    indexes: Number(indexes[0]?.count ?? 0),
  };
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? 'snapshot';
  const snapshot = await capture();
  if (mode === 'snapshot') {
    const output =
      process.argv[3] ??
      resolve(process.cwd(), 'artifacts', `db-invariants-${Date.now()}.json`);
    mkdirSync(resolve(output, '..'), { recursive: true });
    writeFileSync(output, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
    console.log(output);
    return;
  }

  if (mode !== 'verify' || !process.argv[3]) {
    throw new Error('Usage: migration-invariants snapshot [file] | verify <snapshot-file>');
  }
  const expected = JSON.parse(readFileSync(process.argv[3], 'utf8')) as Snapshot;
  const mismatches = Object.entries(expected.tables).filter(
    ([table, count]) => snapshot.tables[table] !== count,
  );
  if (mismatches.length) {
    throw new Error(
      `Row-count invariant failed: ${mismatches
        .map(([table, count]) => `${table}: expected ${count}, got ${snapshot.tables[table]}`)
        .join('; ')}`,
    );
  }
  if (snapshot.foreignKeys < expected.foreignKeys) {
    throw new Error(
      `Foreign-key invariant failed: expected at least ${expected.foreignKeys}, got ${snapshot.foreignKeys}`,
    );
  }
  console.log('Database migration invariants verified.');
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
