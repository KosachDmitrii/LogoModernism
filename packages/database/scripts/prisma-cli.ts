import './load-env';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const args = process.argv.slice(2).join(' ');
const cwd = join(__dirname, '..');

execSync(`npx prisma ${args}`, {
  stdio: 'inherit',
  env: process.env,
  cwd,
});
