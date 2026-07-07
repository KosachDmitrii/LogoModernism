import { config } from 'dotenv';
import { resolve } from 'node:path';

// Monorepo root (apps/api/dist → ../../../)
const REPO_ROOT = resolve(__dirname, '../../..');
process.env.LOGO_PLATFORM_ROOT = process.env.LOGO_PLATFORM_ROOT ?? REPO_ROOT;

config({ path: resolve(REPO_ROOT, '.env') });
config({ path: resolve(REPO_ROOT, 'apps/.env') });
config({ path: resolve(process.cwd(), '.env') });
