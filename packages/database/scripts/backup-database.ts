import './load-env';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const directUrl = process.env.DIRECT_URL?.trim();
if (!directUrl) {
  throw new Error('DIRECT_URL is required for database backup and migrations.');
}

const output =
  process.argv[2] ?? resolve(process.cwd(), 'artifacts', `database-${Date.now()}.dump`);
mkdirSync(resolve(output, '..'), { recursive: true });

const result = spawnSync(
  'pg_dump',
  ['--format=custom', '--no-owner', '--no-acl', '--file', output, directUrl],
  { stdio: 'inherit' },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`pg_dump exited with status ${result.status ?? 'unknown'}`);
}

console.log(output);
