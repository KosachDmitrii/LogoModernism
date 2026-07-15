import './load-env';
import { db, disconnect } from '../src';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL or SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD in .env');
    process.exit(1);
  }

  const safeUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@');
  console.log('Connecting to:', safeUrl);

  await db.query('SELECT $1::integer AS connection_check', [1]);
  console.log('✓ PostgreSQL connection OK');

  const extensions = await db.query<{ extname: string }>(
    'SELECT extname FROM pg_extension WHERE extname = $1',
    ['vector'],
  );
  if (extensions.rows.length) {
    console.log('✓ pgvector extension enabled');
  } else {
    console.log('✗ pgvector not enabled — run: npm run db:brain-setup');
  }

  const tables = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = $1 AND tablename = $2`,
    ['public', 'design_brain_experiences'],
  );
  if (tables.rows.length) {
    console.log('✓ design_brain_experiences table exists');
  } else {
    console.log('✗ Schema not migrated — run: npm run db:migrate');
  }
}

main()
  .catch((error) => {
    console.error('Connection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => disconnect());
