#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const repo_root_1 = require("../repo-root");
const parse_args_1 = require("./parse-args");
const repoRoot = (0, repo_root_1.resolveRepoRoot)();
(0, dotenv_1.config)({ path: (0, node_path_1.join)(repoRoot, '.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.join)(repoRoot, 'apps/.env') });
const cliArgs = (0, parse_args_1.normalizePageRangeArgs)(process.argv.slice(2));
const extractScript = (0, node_path_1.join)(repoRoot, 'scripts/catalog-pipeline/extract_pages.py');
const importerDir = (0, node_path_1.join)(repoRoot, 'packages/catalog-importer');
console.log('Step 1/2: Extract PDF pages...', cliArgs.length ? cliArgs.join(' ') : '(all pages)');
const extract = (0, node_child_process_1.spawnSync)('python3', [extractScript, ...cliArgs, '--skip-existing'], {
    stdio: 'inherit',
    cwd: repoRoot,
});
if (extract.status !== 0)
    process.exit(extract.status ?? 1);
console.log('\nStep 2/2: Vision analysis...');
const tsx = (0, node_path_1.join)(repoRoot, 'node_modules/.bin/tsx');
const analyze = (0, node_child_process_1.spawnSync)(tsx, ['src/cli/analyze-pages.ts', ...cliArgs], {
    stdio: 'inherit',
    cwd: importerDir,
});
if (analyze.status !== 0)
    process.exit(analyze.status ?? 1);
console.log('\nPipeline complete. Open Catalog Review in the app.');
//# sourceMappingURL=run-pipeline.js.map