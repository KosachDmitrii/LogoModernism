import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { config } from 'dotenv';

export function resolveRepoRoot(): string {
  if (process.env.LOGO_PLATFORM_ROOT) {
    return process.env.LOGO_PLATFORM_ROOT;
  }
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const pkgPath = join(dir, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { workspaces?: unknown };
        if (pkg.workspaces) return dir;
      } catch {
        // continue walking up
      }
    }
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

export function loadProjectEnv(): string {
  const repoRoot = resolveRepoRoot();
  process.env.LOGO_PLATFORM_ROOT = repoRoot;
  config({ path: join(repoRoot, '.env') });
  config({ path: join(process.cwd(), '.env') });

  if (!process.env.DATABASE_URL && process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_DB_PASSWORD) {
    const encoded = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
    process.env.DATABASE_URL =
      `postgresql://postgres:${encoded}@db.${process.env.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`;
  }

  return repoRoot;
}
