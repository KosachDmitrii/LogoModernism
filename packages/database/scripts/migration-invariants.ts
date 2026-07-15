import './load-env';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

type Snapshot = {
  capturedAt: string;
  tables: Record<string, number>;
  foreignKeys: number;
  indexes: number;
  security: {
    publicTables: number;
    rlsEnabledTables: number;
    apiRoleTableGrants: number;
    policies: number;
    apiRoleDefaultPrivileges: number;
  };
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

  const [foreignKeys, indexes, rls, apiGrants, policies, defaultPrivileges] = await Promise.all([
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
    prisma.$queryRaw<Array<{ total: bigint; enabled: bigint }>>`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE c.relrowsecurity)::bigint AS enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind IN ('r', 'p')
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_policies
      WHERE schemaname = 'public'
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM pg_default_acl d
      JOIN pg_roles owner ON owner.oid = d.defaclrole
      LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
      CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
      LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
      WHERE n.nspname = 'public'
        AND owner.rolname = 'postgres'
        AND (
          acl.grantee = 0
          OR grantee.rolname IN ('anon', 'authenticated', 'service_role')
        )
    `,
  ]);

  return {
    capturedAt: new Date().toISOString(),
    tables,
    foreignKeys: Number(foreignKeys[0]?.count ?? 0),
    indexes: Number(indexes[0]?.count ?? 0),
    security: {
      publicTables: Number(rls[0]?.total ?? 0),
      rlsEnabledTables: Number(rls[0]?.enabled ?? 0),
      apiRoleTableGrants: Number(apiGrants[0]?.count ?? 0),
      policies: Number(policies[0]?.count ?? 0),
      apiRoleDefaultPrivileges: Number(defaultPrivileges[0]?.count ?? 0),
    },
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
  if (
    snapshot.security.publicTables === 0 ||
    snapshot.security.rlsEnabledTables !== snapshot.security.publicTables
  ) {
    throw new Error(
      `RLS invariant failed: ${snapshot.security.rlsEnabledTables}/${snapshot.security.publicTables} public tables protected`,
    );
  }
  if (snapshot.security.apiRoleTableGrants !== 0) {
    throw new Error(
      `Database privilege invariant failed: ${snapshot.security.apiRoleTableGrants} API-role grants remain`,
    );
  }
  if (snapshot.security.policies !== 0) {
    throw new Error(
      `RLS policy invariant failed: expected deny-by-default, found ${snapshot.security.policies} policies`,
    );
  }
  if (snapshot.security.apiRoleDefaultPrivileges !== 0) {
    throw new Error(
      `Default privilege invariant failed: ${snapshot.security.apiRoleDefaultPrivileges} API-role grants remain`,
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
