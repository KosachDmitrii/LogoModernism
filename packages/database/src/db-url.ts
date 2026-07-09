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
      params.set('pool_timeout', '30');
    }
    if (parsed.hostname.includes('pooler.supabase.com') && !params.has('pgbouncer')) {
      params.set('pgbouncer', 'true');
    }

    parsed.search = params.toString();
    return parsed.toString();
  } catch {
    return url;
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
    process.env.DATABASE_URL = enhanceDatabaseUrl(poolerUrl);
    return;
  }
  if (poolerUrl) {
    console.warn(
      '[database] Ignoring invalid DATABASE_POOLER_URL — use the real URI from Supabase or leave it empty.',
    );
    delete process.env.DATABASE_POOLER_URL;
  }

  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = enhanceDatabaseUrl(process.env.DATABASE_URL);
    return;
  }

  const ref = process.env.SUPABASE_PROJECT_REF;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!ref || !password) return;

  const encoded = encodeURIComponent(password);
  process.env.DATABASE_URL = enhanceDatabaseUrl(
    `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres?sslmode=require`,
  );
}
