import { resolve } from 'node:path';

export const EMBEDDING_DIMENSIONS = 1536;

export function getRepoRoot(): string {
  return process.env.LOGO_PLATFORM_ROOT ?? resolve(__dirname, '../../../..');
}

/** Read-only catalog assets shipped with the repo (git). */
export function getCatalogPipelineDir(): string {
  return resolve(getRepoRoot(), 'data/catalog-pipeline');
}

/**
 * Writable data root.
 * - Local dev: `<repo>/data`
 * - Railway: mount a Volume at `/app/persistent` (sets RAILWAY_VOLUME_MOUNT_PATH)
 */
export function getWritableDataRoot(): string {
  const railwayMount = process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (railwayMount) return railwayMount;

  const configured = process.env.PERSISTENT_DATA_DIR?.trim();
  if (configured) return configured;

  return resolve(getRepoRoot(), 'data');
}

export function getBrainDataDir(): string {
  return resolve(getWritableDataRoot(), 'brain');
}

export function getBrainUploadsDir(): string {
  return resolve(getBrainDataDir(), 'uploads');
}

export function getBrainResearchDir(): string {
  return resolve(getBrainDataDir(), 'research');
}

/** Generated logo image files served by /api/images/files/:filename */
export function getGeneratedImagesDir(): string {
  return resolve(getWritableDataRoot(), 'generated');
}

export function isUsingExternalPersistentStorage(): boolean {
  return Boolean(
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim() ||
      process.env.PERSISTENT_DATA_DIR?.trim(),
  );
}
