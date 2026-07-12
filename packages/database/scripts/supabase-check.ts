import './load-env';
import { prisma } from '../src/index';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL or SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD in .env');
    process.exit(1);
  }

  const safeUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@');
  console.log('Connecting to:', safeUrl);

  await prisma.$queryRaw`SELECT 1`;
  console.log('✓ PostgreSQL connection OK');

  const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
    SELECT extname FROM pg_extension WHERE extname = 'vector'
  `;
  if (extensions.length) {
    console.log('✓ pgvector extension enabled');
  } else {
    console.log('✗ pgvector not enabled — run: npm run db:brain-setup');
  }

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'BrainExperience'
  `;
  if (tables.length) {
    console.log('✓ BrainExperience table exists');
  } else {
    console.log('✗ Schema not pushed — run: npm run db:push');
  }
}

main()
  .catch((error) => {
    console.error('Connection failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
