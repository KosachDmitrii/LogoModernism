const DEFAULT_PRODUCTION_CONNECTION_LIMIT = '2';
// Local development runs both the API and worker, so this is a per-process
// limit. Keep their combined pool within typical Supabase free-tier capacity.
const DEFAULT_DEVELOPMENT_CONNECTION_LIMIT = '5';
const DEFAULT_POOL_TIMEOUT_SECONDS = '5';

export function isSupabasePoolerUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('pooler.supabase.com');
  } catch {
    return false;
  }
}

export function isSupabaseTransactionPoolerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('pooler.supabase.com') && parsed.port === '6543';
  } catch {
    return false;
  }
}

export function enhanceDatabaseUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;

    if (!params.has('sslmode') && parsed.hostname.includes('supabase')) {
      params.set('sslmode', 'require');
    }
    if (!params.has('connect_timeout')) {
      params.set('connect_timeout', '30');
    }
    if (!params.has('pool_timeout')) {
      params.set('pool_timeout', DEFAULT_POOL_TIMEOUT_SECONDS);
    }
    if (!params.has('connection_limit')) {
      params.set(
        'connection_limit',
        process.env.NODE_ENV === 'production'
          ? DEFAULT_PRODUCTION_CONNECTION_LIMIT
          : DEFAULT_DEVELOPMENT_CONNECTION_LIMIT,
      );
    }
    if (!params.has('application_name')) {
      params.set(
        'application_name',
        process.env.DATABASE_APPLICATION_NAME ?? 'logo-platform-api',
      );
    }
    const usesTransactionPooler =
      parsed.hostname.includes('pooler.supabase.com') && parsed.port === '6543';
    if (usesTransactionPooler && !params.has('pgbouncer')) {
      params.set('pgbouncer', 'true');
    }

    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url;
  }
}

export function assertProductionRuntimeDatabaseUrl(url: string): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.ALLOW_SESSION_POOLER === 'true') return;

  if (isSupabasePoolerUrl(url) && !isSupabaseTransactionPoolerUrl(url)) {
    throw new Error(
      'Production DATABASE_POOLER_URL must use Supavisor transaction mode on port 6543. ' +
        'Reserve the 5432 DIRECT_URL for migrations.',
    );
  }
}

export function isValidDatabaseUrl(url: string): boolean {
  if (!url.trim()) return false;
  if (/REGION|YOUR_PROJECT|PASSWORD|XXXX/i.test(url)) return false;
  try {
    const parsed = new URL(url);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function resolveDatabaseUrl(): void {
  const poolerUrl = process.env.DATABASE_POOLER_URL?.trim();
  if (poolerUrl && isValidDatabaseUrl(poolerUrl)) {
    const runtimeUrl = enhanceDatabaseUrl(poolerUrl);
    assertProductionRuntimeDatabaseUrl(runtimeUrl);
    process.env.DATABASE_URL = runtimeUrl;
    return;
  }
  if (poolerUrl) {
    console.warn(
      '[database] Ignoring invalid DATABASE_POOLER_URL — use the real URI from Supabase or leave it empty.',
    );
    delete process.env.DATABASE_POOLER_URL;
  }

  if (process.env.DATABASE_URL) {
    const runtimeUrl = enhanceDatabaseUrl(process.env.DATABASE_URL);
    assertProductionRuntimeDatabaseUrl(runtimeUrl);
    process.env.DATABASE_URL = runtimeUrl;
    return;
  }

  const ref = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!ref || !password) return;

  const encoded = encodeURIComponent(password);
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_POOLER_URL is required in production. Do not use a direct Supabase URL for runtime traffic.',
    );
  }
  process.env.DATABASE_URL = enhanceDatabaseUrl(
    `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres?sslmode=require`,
  );
}
