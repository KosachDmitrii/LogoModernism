import { existsSync, readFileSync } from 'node:fs';
import { config } from 'dotenv';
import { join, resolve } from 'node:path';
import { resolveDatabaseUrl as applyDatabaseUrl } from '../src/db-url';

function resolveRepoRoot(): string {
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
  return resolve(__dirname, '../../..');
}

export { applyDatabaseUrl as resolveDatabaseUrl };

export function loadProjectEnv(): string {
  const repoRoot = resolveRepoRoot();
  process.env.LOGO_PLATFORM_ROOT = repoRoot;
  config({ path: join(repoRoot, '.env') });
  config({ path: join(repoRoot, 'apps/.env') });
  config({ path: join(process.cwd(), '.env') });
  applyDatabaseUrl();
  return repoRoot;
}

// Auto-load when imported from CLI scripts
loadProjectEnv();
