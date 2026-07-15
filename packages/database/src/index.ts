import { Pool, type PoolClient, type QueryResultRow } from 'pg';
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
      idleTimeoutMillis: 30_000,
    };
  }
  const parsed = new URL(rawUrl);
  const max = Number(parsed.searchParams.get('connection_limit') ?? 5);
  const poolTimeoutSeconds = Number(
    parsed.searchParams.get('pool_timeout') ?? 15,
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
    connectionTimeoutMillis:
      Number.isFinite(poolTimeoutSeconds) && poolTimeoutSeconds > 0
        ? poolTimeoutSeconds * 1_000
        : 15_000,
    idleTimeoutMillis: 30_000,
    statement_timeout:
      Number.isFinite(statementTimeoutMs) && statementTimeoutMs > 0
        ? statementTimeoutMs
        : 30_000,
    idle_in_transaction_session_timeout: 30_000,
    allowExitOnIdle: process.env.NODE_ENV === 'test',
  };
}

const globalDatabase = globalThis as unknown as { databasePool?: Pool };

export function getPool(): Pool {
  if (!globalDatabase.databasePool) {
    globalDatabase.databasePool = new Pool(poolConfiguration());
    globalDatabase.databasePool.on('error', (error) => {
      console.error('[database] Idle PostgreSQL client error', error);
    });
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
      const client: PoolClient = await executor.connect();
      try {
        await client.query('BEGIN');
        if (options.isolationLevel) {
          await client.query(
            `SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`,
          );
        }
        const result = await fn(clientApi(() => client, false));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
  };
  return api;
}

export const db = clientApi(getPool, true);
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
