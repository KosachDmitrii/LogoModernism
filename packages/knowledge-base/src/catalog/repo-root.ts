import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
  return process.cwd();
}

export { resolveRepoRoot };
