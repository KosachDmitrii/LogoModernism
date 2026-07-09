import type { PrismaClient } from '@prisma/client';

const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code) : '';
  if (CONNECTION_ERROR_CODES.has(code)) return true;

  const message = 'message' in error ? String(error.message) : String(error);
  return /closed|connection|ECONNRESET|ETIMEDOUT|Can't reach database server/i.test(message);
}

let keepaliveTimer: NodeJS.Timeout | null = null;

export async function reconnectPrisma(client: PrismaClient): Promise<void> {
  await client.$disconnect().catch(() => undefined);
  await client.$connect();
}

export async function runWithPrismaReconnect<T>(
  client: PrismaClient,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isPrismaConnectionError(error)) throw error;
    await reconnectPrisma(client);
    return operation();
  }
}

export function startPrismaKeepalive(client: PrismaClient): void {
  if (keepaliveTimer || !process.env.DATABASE_URL) return;
  if (process.env.PRISMA_KEEPALIVE === 'false') return;

  const intervalMs = Number(process.env.PRISMA_KEEPALIVE_MS ?? 4 * 60 * 1000);

  keepaliveTimer = setInterval(() => {
    void (async () => {
      try {
        await client.$queryRaw`SELECT 1`;
      } catch (error) {
        if (!isPrismaConnectionError(error)) return;
        console.warn('[database] PostgreSQL connection closed — reconnecting…');
        try {
          await reconnectPrisma(client);
        } catch (reconnectError) {
          console.error(
            '[database] Reconnect failed:',
            reconnectError instanceof Error ? reconnectError.message : reconnectError,
          );
        }
      }
    })();
  }, intervalMs);

  keepaliveTimer.unref?.();
}

export function stopPrismaKeepalive(): void {
  if (!keepaliveTimer) return;
  clearInterval(keepaliveTimer);
  keepaliveTimer = null;
}
