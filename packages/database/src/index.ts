import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { isDatabaseConnectionError } from './connection';
import { resolveDatabaseUrl } from './db-url';

export type IsolationLevel =
  | 'READ COMMITTED'
  | 'REPEATABLE READ'
  | 'SERIALIZABLE';

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

export interface DatabaseClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>>;
  one<T = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<T>;
  maybeOne<T = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<T | null>;
  transaction<T>(
    fn: (client: DatabaseClient) => Promise<T>,
    options?: { isolationLevel?: IsolationLevel },
  ): Promise<T>;
}

export const BackgroundTaskStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;
export type BackgroundTaskStatus =
  (typeof BackgroundTaskStatus)[keyof typeof BackgroundTaskStatus];

export const BackgroundTaskType = {
  PDF_INGEST: 'PDF_INGEST',
  RESEARCH: 'RESEARCH',
  NIGHTLY_RESEARCH: 'NIGHTLY_RESEARCH',
  CONSOLIDATION: 'CONSOLIDATION',
} as const;
export type BackgroundTaskType =
  (typeof BackgroundTaskType)[keyof typeof BackgroundTaskType];

export interface BackgroundTask {
  id: string;
  type: BackgroundTaskType;
  status: BackgroundTaskStatus;
  organizationId: string | null;
  projectId: string | null;
  requestedBy: string | null;
  idempotencyKey: string;
  payload: unknown;
  result: unknown | null;
  error: string | null;
  progress: number;
  phase: string | null;
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  startedAt: Date | null;
  heartbeatAt: Date | null;
  finishedAt: Date | null;
  cancelRequestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function camelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelizeRow<T>(row: QueryResultRow): T {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [camelCase(key), value]),
  ) as T;
}

function poolConfiguration() {
  resolveDatabaseUrl();
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return {
      connectionString: undefined,
      max: 5,
      connectionTimeoutMillis: 30_000,
      // Recycle before remote poolers drop idle sockets (~minutes).
      idleTimeoutMillis: 10_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      maxUses: 75,
    };
  }
  const parsed = new URL(rawUrl);
  const max = Number(parsed.searchParams.get('connection_limit') ?? 5);
  const poolTimeoutSeconds = Number(
    parsed.searchParams.get('pool_timeout') ?? 30,
  );
  const sslMode = parsed.searchParams.get('sslmode');
  const statementTimeoutMs = Number(
    process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 30_000,
  );
  parsed.searchParams.delete('connection_limit');
  parsed.searchParams.delete('pool_timeout');
  parsed.searchParams.delete('pgbouncer');
  parsed.searchParams.delete('sslmode');
  return {
    connectionString: parsed.toString(),
    ssl:
      sslMode && sslMode !== 'disable'
        ? { rejectUnauthorized: sslMode === 'verify-full' }
        : undefined,
    max: Number.isInteger(max) && max > 0 ? max : 5,
    // Remote Supabase/TLS handshakes regularly exceed 15s after idle gaps.
    connectionTimeoutMillis:
      Number.isFinite(poolTimeoutSeconds) && poolTimeoutSeconds > 0
        ? poolTimeoutSeconds * 1_000
        : 30_000,
    idleTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    // Avoid indefinitely reusing sockets that remote poolers later reset.
    maxUses: 75,
    statement_timeout:
      Number.isFinite(statementTimeoutMs) && statementTimeoutMs > 0
        ? statementTimeoutMs
        : 30_000,
    idle_in_transaction_session_timeout: 30_000,
    allowExitOnIdle: process.env.NODE_ENV === 'test',
  };
}

const globalDatabase = globalThis as unknown as { databasePool?: Pool };

function logClientError(scope: string, error: Error): void {
  console.error(`[database] ${scope} PostgreSQL client error`, error);
}

export function getPool(): Pool {
  if (!globalDatabase.databasePool) {
    const pool = new Pool(poolConfiguration());
    // Idle clients in the pool emit here — must listen or Node crashes the process.
    pool.on('error', (error) => {
      logClientError('Idle', error);
    });
    // Checked-out clients are the caller's responsibility; keep a baseline listener
    // so unexpected disconnects while a client is borrowed cannot take down the process.
    pool.on('connect', (client) => {
      client.on('error', (error) => {
        logClientError('Connected', error);
      });
    });
    globalDatabase.databasePool = pool;
  }
  return globalDatabase.databasePool;
}

function clientApi(
  getExecutor: () => Pool | PoolClient,
  root: boolean,
): DatabaseClient {
  const api: DatabaseClient = {
    async query<T = Record<string, unknown>>(
      text: string,
      values: readonly unknown[] = [],
    ): Promise<QueryResult<T>> {
      const executor = getExecutor();
      const result = await executor.query(text, [...values]);
      return {
        rows: result.rows.map((row) => camelizeRow<T>(row)),
        rowCount: result.rowCount ?? result.rows.length,
      };
    },
    async one<T = Record<string, unknown>>(
      text: string,
      values: readonly unknown[] = [],
    ): Promise<T> {
      const result = await api.query<T>(text, values);
      if (result.rows.length !== 1) {
        throw new Error(`Expected one database row, received ${result.rows.length}`);
      }
      return result.rows[0]!;
    },
    async maybeOne<T = Record<string, unknown>>(
      text: string,
      values: readonly unknown[] = [],
    ): Promise<T | null> {
      const result = await api.query<T>(text, values);
      if (result.rows.length > 1) {
        throw new Error(`Expected at most one database row, received ${result.rows.length}`);
      }
      return result.rows[0] ?? null;
    },
    async transaction<T>(
      fn: (client: DatabaseClient) => Promise<T>,
      options: { isolationLevel?: IsolationLevel } = {},
    ): Promise<T> {
      if (!root) return fn(api);
      const executor = getExecutor();
      if (!(executor instanceof Pool)) {
        throw new Error('Root database executor is not a PostgreSQL pool');
      }

      // SERIALIZABLE/deadlocks and dropped connections are retryable.
      const isolationRetries =
        options.isolationLevel === 'SERIALIZABLE' ||
        options.isolationLevel === 'REPEATABLE READ'
          ? 5
          : 1;
      // Connect timeouts after long image-gen idle gaps need several fresh attempts.
      const maxAttempts = Math.max(isolationRetries, 5);

      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let client: PoolClient | undefined;
        let clientFailed = false;
        const onCheckoutError = (error: Error) => {
          clientFailed = true;
          logClientError('Checked-out', error);
        };
        try {
          // connect() itself can throw (pool wait / TLS timeout) — must be inside retry.
          client = await executor.connect();
          client.on('error', onCheckoutError);
          await client.query('BEGIN');
          if (options.isolationLevel) {
            await client.query(
              `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`,
            );
          }
          const result = await fn(clientApi(() => client!, false));
          await client.query('COMMIT');
          return result;
        } catch (error) {
          clientFailed = clientFailed || isDatabaseConnectionError(error);
          if (client) {
            await client.query('ROLLBACK').catch(() => undefined);
          }
          lastError = error;
          if (attempt < maxAttempts && isRetryableTxError(error)) {
            await delay(serializationBackoffMs(attempt));
            continue;
          }
          throw error;
        } finally {
          if (client) {
            client.removeListener('error', onCheckoutError);
            // Destroy broken clients instead of returning them to the pool.
            client.release(clientFailed || undefined);
          }
        }
      }
      throw lastError;
    },
  };
  return api;
}

function isRetryableTxError(error: unknown): boolean {
  if (isDatabaseConnectionError(error)) return true;
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  // 40001 serialization_failure · 40P01 deadlock_detected
  return code === '40001' || code === '40P01';
}

function serializationBackoffMs(attempt: number): number {
  // Connection timeouts to remote poolers need longer gaps than SERIALIZABLE conflicts.
  const base = 75 * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 80);
  return Math.min(2_000, base + jitter);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const db = clientApi(getPool, true);

/** Retry a DB call after connect/reset errors (e.g. save after long image generation). */
export async function withDatabaseRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 5;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts && isDatabaseConnectionError(error)) {
        await delay(serializationBackoffMs(attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function disconnect(): Promise<void> {
  const current = globalDatabase.databasePool;
  if (!current) return;
  delete globalDatabase.databasePool;
  await current.end();
}

export {
  assertProductionRuntimeDatabaseUrl,
  enhanceDatabaseUrl,
  isSupabasePoolerUrl,
  isSupabaseTransactionPoolerUrl,
  resolveDatabaseUrl,
} from './db-url';
export {
  isDatabaseConnectionError,
  isPostgresError,
  isUniqueViolation,
} from './connection';
