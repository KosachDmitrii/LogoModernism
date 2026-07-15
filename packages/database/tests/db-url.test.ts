import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertProductionRuntimeDatabaseUrl,
  enhanceDatabaseUrl,
  isSupabaseTransactionPoolerUrl,
} from '../src/db-url';

test('adds bounded development pool defaults for runtime URLs', () => {
  const result = new URL(
    enhanceDatabaseUrl(
      'postgresql://postgres.example:secret@aws-0-eu.pooler.supabase.com:6543/postgres',
    ),
  );
  assert.equal(result.searchParams.get('connection_limit'), '5');
  assert.equal(result.searchParams.get('pool_timeout'), '15');
  assert.equal(result.searchParams.get('pgbouncer'), 'true');
});

test('preserves explicit pool settings', () => {
  const result = new URL(
    enhanceDatabaseUrl(
      'postgresql://user:secret@localhost:5432/db?connection_limit=7&pool_timeout=9',
    ),
  );
  assert.equal(result.searchParams.get('connection_limit'), '7');
  assert.equal(result.searchParams.get('pool_timeout'), '9');
});

test('recognizes only Supavisor transaction mode on port 6543', () => {
  assert.equal(
    isSupabaseTransactionPoolerUrl(
      'postgresql://user:secret@aws-0-eu.pooler.supabase.com:6543/postgres',
    ),
    true,
  );
  assert.equal(
    isSupabaseTransactionPoolerUrl(
      'postgresql://user:secret@aws-0-eu.pooler.supabase.com:5432/postgres',
    ),
    false,
  );
});

test('rejects Supavisor session mode for production runtime', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousOverride = process.env.ALLOW_SESSION_POOLER;
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_SESSION_POOLER;
  try {
    assert.throws(
      () =>
        assertProductionRuntimeDatabaseUrl(
          'postgresql://user:secret@aws-0-eu.pooler.supabase.com:5432/postgres',
        ),
      /transaction mode/,
    );
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
    process.env.ALLOW_SESSION_POOLER = previousOverride;
  }
});
