import { config } from 'dotenv';
import { resolve } from 'node:path';
import { enhanceDatabaseUrl } from '@logo-platform/database';

const REPO_ROOT = resolve(__dirname, '../..');
process.env.LOGO_PLATFORM_ROOT = process.env.LOGO_PLATFORM_ROOT ?? REPO_ROOT;

config({ path: resolve(REPO_ROOT, '.env') });
config({ path: resolve(process.cwd(), '.env') });

if (process.env.DATABASE_POOLER_URL) {
  process.env.DATABASE_URL = enhanceDatabaseUrl(process.env.DATABASE_POOLER_URL);
} else if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = enhanceDatabaseUrl(process.env.DATABASE_URL);
} else if (process.env.SUPABASE_PROJECT_REF && process.env.SUPABASE_DB_PASSWORD) {
  const encoded = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
  process.env.DATABASE_URL = enhanceDatabaseUrl(
    `postgresql://postgres:${encoded}@db.${process.env.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require`,
  );
}
