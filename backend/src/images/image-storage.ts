import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getGeneratedImagesDir } from '@logo-platform/design-brain';

const ALLOWED_FILENAME = /^img-[\w-]+\.(png|jpg|jpeg|webp|svg|svg\+xml)$/;

/**
 * Logo bytes are stored in PostgreSQL (`composed_prompt_record.logos` JSONB).
 * Keep data URLs and remote URLs as-is — do not rewrite to ephemeral disk paths.
 */
export function persistImageUrl(url: string, _id: string): string {
  return url;
}

/** Legacy disk files from older deployments (before DB-inline storage). */
export function resolveGeneratedFile(filename: string): string | null {
  if (!ALLOWED_FILENAME.test(filename)) {
    return null;
  }
  const filePath = join(getGeneratedImagesDir(), filename);
  return existsSync(filePath) ? filePath : null;
}
