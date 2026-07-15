import './load-env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function extensionFor(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return extensions[mimeType] ?? 'bin';
}

function decodeDataUrl(value: string): { bytes: Uint8Array; mimeType: string } {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(value);
  if (!match) throw new Error('Invalid data URL');
  const mimeType = match[1] || 'application/octet-stream';
  const encoded = match[3] ?? '';
  const buffer = match[2]
    ? Buffer.from(encoded, 'base64')
    : Buffer.from(decodeURIComponent(encoded), 'utf8');
  return { bytes: new Uint8Array(buffer), mimeType };
}

async function main(): Promise<void> {
  const supabaseUrl = required('SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const bucket = process.env.SUPABASE_GENERATED_LOGOS_BUCKET?.trim() || 'catalog-logos';
  const logos = await prisma.logo.findMany({
    where: { publicUrl: { startsWith: 'data:' } },
    select: { id: true, publicUrl: true },
  });

  let completed = 0;
  const concurrency = 6;
  for (let offset = 0; offset < logos.length; offset += concurrency) {
    await Promise.all(
      logos.slice(offset, offset + concurrency).map(async (logo) => {
        const { bytes, mimeType } = decodeDataUrl(logo.publicUrl!);
        const key = `generated-logos/${logo.id}.${extensionFor(mimeType)}`;
        const response = await fetch(
          `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key
            .split('/')
            .map(encodeURIComponent)
            .join('/')}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              apikey: serviceRoleKey,
              'Content-Type': mimeType,
              'x-upsert': 'true',
            },
            body: bytes,
          },
        );
        if (!response.ok) {
          throw new Error(
            `Storage upload failed for ${logo.id}: ${response.status} ${await response.text()}`,
          );
        }
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(
          bucket,
        )}/${key
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`;
        await prisma.logo.update({
          where: { id: logo.id },
          data: { storageKey: key, publicUrl, mimeType },
        });
        completed += 1;
        if (completed % 25 === 0 || completed === logos.length) {
          console.log(`Migrated ${completed}/${logos.length} inline logos`);
        }
      }),
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
