import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import './load-env';
import { prisma } from '../src/index';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not configured. Add it to .env in the repo root.');
    process.exit(1);
  }

  const sqlPath = join(__dirname, '../prisma/sql/prompts-setup.sql');
  const sql = readFileSync(sqlPath, 'utf8');
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
    console.log('Executed:', statement.split('\n')[0]);
  }

  console.log('Composed prompt records schema is ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
