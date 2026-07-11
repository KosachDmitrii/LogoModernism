import type { PrismaClient } from '@prisma/client';

const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

const CONNECTION_ERROR_PATTERN =
  /closed|connection|ECONNRESET|ETIMEDOUT|Can't reach database server|engine is not yet connected|not yet connected|client has already been destroyed|response from the engine was empty/i;

export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code) : '';
  if (CONNECTION_ERROR_CODES.has(code)) return true;

  const message = 'message' in error ? String(error.message) : String(error);
  return CONNECTION_ERROR_PATTERN.test(message);
}

let keepaliveTimer: NodeJS.Timeout | null = null;
let reconnectPromise: Promise<void> | null = null;

export async function reconnectPrisma(client: PrismaClient): Promise<void> {
  if (reconnectPromise) {
    await reconnectPromise;
    return;
  }

  reconnectPromise = (async () => {
    await client.$disconnect().catch(() => undefined);
    await client.$connect();
  })();

  try {
    await reconnectPromise;
  } finally {
    reconnectPromise = null;
  }
}

export async function runWithPrismaReconnect<T>(
  client: PrismaClient,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isPrismaConnectionError(error)) throw error;
    console.warn(
      '[database] PostgreSQL connection lost — reconnecting…',
      error instanceof Error ? error.message : error,
    );
    await reconnectPrisma(client);
    return operation();
  }
}

export function startPrismaKeepalive(client: PrismaClient): void {
  if (keepaliveTimer || !process.env.DATABASE_URL) return;
  if (process.env.PRISMA_KEEPALIVE === 'false') return;

  const intervalMs = Number(process.env.PRISMA_KEEPALIVE_MS ?? 4 * 60 * 1000);

  keepaliveTimer = setInterval(() => {
    void runWithPrismaReconnect(client, () => client.$queryRaw`SELECT 1`).catch((error) => {
      if (!isPrismaConnectionError(error)) {
        console.error(
          '[database] Keepalive query failed:',
          error instanceof Error ? error.message : error,
        );
        return;
      }
      console.error(
        '[database] Keepalive reconnect failed:',
        error instanceof Error ? error.message : error,
      );
    });
  }, intervalMs);

  keepaliveTimer.unref?.();
}

export function stopPrismaKeepalive(): void {
  if (!keepaliveTimer) return;
  clearInterval(keepaliveTimer);
  keepaliveTimer = null;
}
