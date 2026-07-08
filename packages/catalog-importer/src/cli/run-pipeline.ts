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
const tsx = join(repoRoot, 'node_modules/.bin/tsx');

function runStep(label: string, command: string, args: string[], cwd: string) {
  console.log(`\n${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', cwd });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runStep('Step 1/4: Extract PDF pages...', 'python3', [extractScript, ...cliArgs, '--skip-existing'], repoRoot);
runStep('Step 2/4: Vision analysis (metadata + logo bbox)...', tsx, ['src/cli/analyze-pages.ts', ...cliArgs], importerDir);
runStep('Step 3/4: Crop logo images from pages...', tsx, ['src/cli/extract-logos.ts'], importerDir);
runStep('Step 4/4: Upload logos to Supabase Storage...', tsx, ['src/cli/upload-logos.ts'], importerDir);

console.log('\nPipeline complete. Review candidates.json — each entry should have logoImagePath + logoImageUrl.');
