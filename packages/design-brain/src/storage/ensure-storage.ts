import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getBrainResearchDir,
  getBrainUploadsDir,
  getGeneratedImagesDir,
  getRepoRoot,
  isUsingExternalPersistentStorage,
} from './paths';

const RESEARCH_STORE = 'candidates.json';

function seedResearchCandidatesIfMissing(): void {
  const targetDir = getBrainResearchDir();
  const targetFile = join(targetDir, RESEARCH_STORE);

  mkdirSync(targetDir, { recursive: true });

  if (existsSync(targetFile)) {
    try {
      const parsed = JSON.parse(readFileSync(targetFile, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) return;
    } catch {
      // fall through and re-seed from repo
    }
  }

  const seedFile = join(getRepoRoot(), 'data/brain/research', RESEARCH_STORE);
  if (!existsSync(seedFile)) return;

  copyFileSync(seedFile, targetFile);
}

export function ensureBrainStorageLayout(): void {
  mkdirSync(getBrainUploadsDir(), { recursive: true });
  mkdirSync(getBrainResearchDir(), { recursive: true });
  mkdirSync(getGeneratedImagesDir(), { recursive: true });
  seedResearchCandidatesIfMissing();

  if (isUsingExternalPersistentStorage()) {
    console.info(
      `[design-brain] Persistent storage: uploads=${getBrainUploadsDir()} research=${getBrainResearchDir()} generated=${getGeneratedImagesDir()}`,
    );
  }
}

/** No-op marker file so empty volumes are visibly initialized. */
export function touchStorageReadyMarker(): void {
  const marker = join(getBrainUploadsDir(), '.storage-ready');
  if (!existsSync(marker)) {
    writeFileSync(marker, new Date().toISOString(), 'utf-8');
  }
}
