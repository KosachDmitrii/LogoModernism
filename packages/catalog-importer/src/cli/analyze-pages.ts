#!/usr/bin/env tsx
import { config } from 'dotenv';
import { join } from 'node:path';
import { analyzePages } from '../vision-analyzer';
import {
  loadCandidates,
  loadPagesIndex,
  saveCandidates,
} from '../storage';
import { resolveRepoRoot } from '../repo-root';
import { normalizePageRangeArgs } from './parse-args';

const repoRoot = resolveRepoRoot();
config({ path: join(repoRoot, '.env') });
config({ path: join(repoRoot, 'apps/.env') });

async function main() {
  const args = normalizePageRangeArgs(process.argv.slice(2));
  const argNum = (name: string, fallback: number) => {
    const eq = args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
    if (eq) return Number(eq);
    const idx = args.indexOf(`--${name}`);
    if (idx >= 0 && args[idx + 1]) return Number(args[idx + 1]);
    return fallback;
  };
  const start = argNum('start', 1);
  const end = argNum('end', 0);
  const force = args.includes('--force');

  const index = loadPagesIndex();
  if (!index) {
    console.error('No pages-index.json. Run: npm run catalog:extract');
    process.exit(1);
  }

  let pages = index.pages;
  if (start > 1) pages = pages.filter((p) => p.page >= start);
  if (end > 0) pages = pages.filter((p) => p.page <= end);

  const existing = loadCandidates();
  const analyzedPages = new Set(existing.map((c) => c.sourcePage));

  const toAnalyze = force ? pages : pages.filter((p) => !analyzedPages.has(p.page));
  console.log(`Analyzing ${toAnalyze.length} pages with Vision...`);

  const newCandidates = await analyzePages(toAnalyze, {
    onProgress: (page, count) => console.log(`  page ${page}: ${count} logos`),
  });

  const merged = [...existing];
  for (const c of newCandidates) {
    const idx = merged.findIndex((m) => m.id === c.id);
    if (idx >= 0) merged[idx] = c;
    else merged.push(c);
  }

  saveCandidates(merged);
  console.log(`Done. Total candidates: ${merged.length} (+${newCandidates.length} new)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
