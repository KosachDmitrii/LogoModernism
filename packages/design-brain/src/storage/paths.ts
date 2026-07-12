import { resolve } from 'node:path';

export const EMBEDDING_DIMENSIONS = 1536;

export function getRepoRoot(): string {
  return process.env.LOGO_PLATFORM_ROOT ?? resolve(__dirname, '../../..');
}

export function getBrainDataDir(): string {
  return resolve(getRepoRoot(), 'data/brain');
}

export function getBrainUploadsDir(): string {
  return resolve(getBrainDataDir(), 'uploads');
}

export function getBrainResearchDir(): string {
  return resolve(getBrainDataDir(), 'research');
}
