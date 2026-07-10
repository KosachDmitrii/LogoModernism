import { resolve } from 'node:path';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { pushSchema, ensureBrainSchema, createTestPrisma } from './helpers/db';

const REPO_ROOT = resolve(__dirname, '../..');
process.env.LOGO_PLATFORM_ROOT = REPO_ROOT;

let container: StartedTestContainer | null = null;

export async function setup(): Promise<() => Promise<void>> {
  if (process.env.BRAIN_SKIP_INTEGRATION === '1') {
    process.env.BRAIN_DB_READY = 'false';
    return async () => undefined;
  }

  let databaseUrl = process.env.BRAIN_TEST_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl && process.env.BRAIN_USE_TESTCONTAINERS !== '0') {
    try {
      container = await new GenericContainer('pgvector/pgvector:pg16')
        .withEnvironment({
          POSTGRES_USER: 'brain_test',
          POSTGRES_PASSWORD: 'brain_test',
          POSTGRES_DB: 'brain_test',
        })
        .withExposedPorts(5432)
        .withWaitStrategy(Wait.forListeningPorts())
        .start();

      const host = container.getHost();
      const port = container.getMappedPort(5432);
      databaseUrl = `postgresql://brain_test:brain_test@${host}:${port}/brain_test`;
      console.info(`[backend-e2e] Started pgvector container at ${host}:${port}`);
    } catch (error) {
      console.warn(
        '[backend-e2e] Could not start testcontainers — e2e tests will be skipped.',
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (!databaseUrl) {
    process.env.BRAIN_DB_READY = 'false';
    return async () => undefined;
  }

  process.env.DATABASE_URL = databaseUrl;
  process.env.DIRECT_URL = databaseUrl;

  try {
    await pushSchema(databaseUrl);
    const prisma = createTestPrisma();
    await prisma.$connect();
    await ensureBrainSchema(prisma);
    await prisma.$disconnect();
    process.env.BRAIN_DB_READY = 'true';
    console.info('[backend-e2e] Database ready');
  } catch (error) {
    process.env.BRAIN_DB_READY = 'false';
    console.warn(
      '[backend-e2e] Database setup failed — e2e tests will be skipped.',
      error instanceof Error ? error.message : error,
    );
  }

  return async () => {
    if (container) await container.stop();
  };
}

export default setup;
