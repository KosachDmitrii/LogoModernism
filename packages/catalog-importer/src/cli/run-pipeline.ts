#!/usr/bin/env tsx
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { join } from 'node:path';
import { resolveRepoRoot } from '../repo-root';
import { normalizePageRangeArgs } from './parse-args';

const repoRoot = resolveRepoRoot();
config({ path: join(repoRoot, '.env') });
config({ path: join(repoRoot, 'apps/.env') });

const cliArgs = normalizePageRangeArgs(process.argv.slice(2));
const extractScript = join(repoRoot, 'scripts/catalog-pipeline/extract_pages.py');
const importerDir = join(repoRoot, 'packages/catalog-importer');

console.log('Step 1/2: Extract PDF pages...', cliArgs.length ? cliArgs.join(' ') : '(all pages)');
const extract = spawnSync('python3', [extractScript, ...cliArgs, '--skip-existing'], {
  stdio: 'inherit',
  cwd: repoRoot,
});
if (extract.status !== 0) process.exit(extract.status ?? 1);

console.log('\nStep 2/2: Vision analysis...');
const tsx = join(repoRoot, 'node_modules/.bin/tsx');
const analyze = spawnSync(tsx, ['src/cli/analyze-pages.ts', ...cliArgs], {
  stdio: 'inherit',
  cwd: importerDir,
});
if (analyze.status !== 0) process.exit(analyze.status ?? 1);

console.log('\nPipeline complete. Open Catalog Review in the app.');
