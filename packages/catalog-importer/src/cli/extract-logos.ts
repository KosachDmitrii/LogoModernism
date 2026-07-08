#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { join } from 'node:path';
import { resolveRepoRoot } from '../repo-root';

const repoRoot = resolveRepoRoot();
config({ path: join(repoRoot, '.env') });

const script = join(repoRoot, 'scripts/catalog-pipeline/extract_logos.py');
const force = process.argv.includes('--force') ? ['--force'] : [];

const result = spawnSync('python3', [script, ...force], {
  stdio: 'inherit',
  cwd: repoRoot,
});

process.exit(result.status ?? 1);
