import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const GENERATED_DIR = join(process.cwd(), 'generated');

export function getGeneratedDir(): string {
  if (!existsSync(GENERATED_DIR)) {
    mkdirSync(GENERATED_DIR, { recursive: true });
  }
  return GENERATED_DIR;
}

export function persistImageUrl(url: string, id: string): string {
  if (!url.startsWith('data:image/')) {
    return url;
  }

  const match = url.match(/^data:image\/([\w+]+);base64,(.+)$/);
  if (!match) return url;

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  const filename = `${id}.${ext}`;
  writeFileSync(join(getGeneratedDir(), filename), buffer);

  return `/api/images/files/${filename}`;
}

export function resolveGeneratedFile(filename: string): string | null {
  if (!/^img-[\w-]+\.(png|jpg|jpeg|webp)$/.test(filename)) {
    return null;
  }
  const filePath = join(getGeneratedDir(), filename);
  return existsSync(filePath) ? filePath : null;
}
