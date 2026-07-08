#!/usr/bin/env tsx
import { prisma } from '@logo-platform/database';
import { consolidateBrain } from '../learning/consolidate';
import { ensureBrainSchema } from '../storage/pgvector';
import { loadProjectEnv } from '../load-env';

loadProjectEnv();

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not configured.\n\n' +
        'For Supabase, add to .env:\n' +
        '  SUPABASE_PROJECT_REF=nyfoddkaohltgmmgavva\n' +
        '  SUPABASE_DB_PASSWORD=your-database-password\n\n' +
        'Or set DATABASE_URL directly.\n\n' +
        'Then run:\n' +
        '  npm run db:generate\n' +
        '  npm run db:push\n' +
        '  npm run db:brain-setup',
    );
    process.exit(1);
  }

  await ensureBrainSchema(prisma);
  const result = await consolidateBrain(prisma);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
