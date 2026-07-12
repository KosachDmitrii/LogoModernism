#!/usr/bin/env tsx
import { config } from 'dotenv';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { resolveRepoRoot } from '../repo-root';
import { loadCandidates, saveCandidates } from '../storage';
import { isSupabaseUploadConfigured, uploadCatalogLogo } from '../supabase-storage';

const repoRoot = resolveRepoRoot();
config({ path: join(repoRoot, '.env') });

async function main() {
  if (!isSupabaseUploadConfigured()) {
    console.error(
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (create bucket "catalog-logos" in Supabase Storage)',
    );
    process.exit(1);
  }

  const force = process.argv.includes('--force');
  const candidates = loadCandidates();
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    if (!candidate.logoImagePath) {
      skipped += 1;
      continue;
    }

    if (candidate.logoImageUrl && !force) {
      skipped += 1;
      continue;
    }

    const localPath = join(repoRoot, 'data/catalog-pipeline', candidate.logoImagePath);
    if (!existsSync(localPath)) {
      console.warn(`Missing local logo file for ${candidate.id}: ${candidate.logoImagePath}`);
      skipped += 1;
      continue;
    }

    try {
      const url = await uploadCatalogLogo(candidate.id, candidate.logoImagePath);
      candidate.logoImageUrl = url;
      uploaded += 1;
      if (uploaded <= 5 || uploaded % 50 === 0) {
        console.log(`Uploaded ${candidate.id} → ${url}`);
      }
    } catch (error) {
      failed += 1;
      console.error(error instanceof Error ? error.message : error);
      if (failed === 1) {
        console.error(
          'Tip: Supabase → Storage → create public bucket "catalog-logos", or set SUPABASE_CATALOG_BUCKET in .env',
        );
      }
    }
  }

  saveCandidates(candidates);
  console.log(`Done. Uploaded ${uploaded}, skipped ${skipped}, failed ${failed}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
