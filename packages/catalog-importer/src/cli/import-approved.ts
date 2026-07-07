#!/usr/bin/env tsx
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { importApprovedToCatalog } from '../import-approved';
import { resolveRepoRoot } from '../repo-root';

const out = join(resolveRepoRoot(), 'data/catalog-pipeline/imported-catalog.json');
const entries = importApprovedToCatalog();
writeFileSync(out, JSON.stringify(entries, null, 2));
console.log(`Exported ${entries.length} approved entries → ${out}`);
