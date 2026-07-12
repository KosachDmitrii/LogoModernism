import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getGeneratedImagesDir } from '@logo-platform/design-brain';

const MIME_TO_EXT: Record<string, string> = {
  jpeg: 'jpg',
  'svg+xml': 'svg',
};

const ALLOWED_FILENAME = /^img-[\w-]+\.(png|jpg|jpeg|webp|svg|svg\+xml)$/;

export function getGeneratedDir(): string {
  const dir = getGeneratedImagesDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function persistImageUrl(url: string, id: string): string {
  if (!url.startsWith('data:image/')) {
    return url;
  }

  const match = url.match(/^data:image\/([^;]+);base64,(.+)$/);
  if (!match) return url;

  const ext = MIME_TO_EXT[match[1]] ?? match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${id}.${ext}`;
  writeFileSync(join(getGeneratedDir(), filename), buffer);

  return `/api/images/files/${filename}`;
}

export function resolveGeneratedFile(filename: string): string | null {
  if (!ALLOWED_FILENAME.test(filename)) {
    return null;
  }
  const filePath = join(getGeneratedDir(), filename);
  return existsSync(filePath) ? filePath : null;
}
