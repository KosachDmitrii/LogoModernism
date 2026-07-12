import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PIPELINE_DIR } from './storage';

function bucketName(): string {
  return process.env.SUPABASE_CATALOG_BUCKET ?? 'catalog-logos';
}

function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for logo uploads',
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function ensureCatalogBucket(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const bucket = bucketName();

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Could not list Supabase buckets: ${listError.message}`);
  }

  const exists = buckets?.some((row) => row.name === bucket);
  if (exists) return bucket;

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
  });

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(
      `Could not create bucket "${bucket}": ${createError.message}. ` +
        'Create it manually in Supabase → Storage → New bucket (name: catalog-logos, public).',
    );
  }

  console.info(`Created Supabase bucket "${bucket}" (public)`);
  return bucket;
}

export async function uploadCatalogLogo(
  candidateId: string,
  localRelativePath: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const bucket = await ensureCatalogBucket();
  const localPath = join(PIPELINE_DIR, localRelativePath);
  const remotePath = `logos/${candidateId}.png`;
  const body = readFileSync(localPath);

  const { error } = await supabase.storage.from(bucket).upload(remotePath, body, {
    contentType: 'image/png',
    upsert: true,
  });

  if (error) {
    throw new Error(`Supabase upload failed for ${candidateId}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(remotePath);
  return data.publicUrl;
}

export function isSupabaseUploadConfigured(): boolean {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key);
}
