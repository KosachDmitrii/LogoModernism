import { config } from 'dotenv';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../..');
process.env.LOGO_PLATFORM_ROOT = repoRoot;
config({ path: resolve(repoRoot, '.env') });
