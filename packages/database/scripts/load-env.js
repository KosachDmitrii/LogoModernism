"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDatabaseUrl = resolveDatabaseUrl;
exports.loadProjectEnv = loadProjectEnv;
const node_fs_1 = require("node:fs");
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
function resolveRepoRoot() {
    if (process.env.LOGO_PLATFORM_ROOT) {
        return process.env.LOGO_PLATFORM_ROOT;
    }
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
        const pkgPath = (0, node_path_1.join)(dir, 'package.json');
        if ((0, node_fs_1.existsSync)(pkgPath)) {
            try {
                const pkg = JSON.parse((0, node_fs_1.readFileSync)(pkgPath, 'utf-8'));
                if (pkg.workspaces)
                    return dir;
            }
            catch {
                // continue walking up
            }
        }
        const parent = (0, node_path_1.resolve)(dir, '..');
        if (parent === dir)
            break;
        dir = parent;
    }
    return (0, node_path_1.resolve)(__dirname, '../../..');
}
function resolveDatabaseUrl() {
    if (process.env.DATABASE_URL)
        return;
    const ref = process.env.SUPABASE_PROJECT_REF;
    const password = process.env.SUPABASE_DB_PASSWORD;
    if (!ref || !password)
        return;
    const encoded = encodeURIComponent(password);
    process.env.DATABASE_URL =
        `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres?sslmode=require`;
}
function loadProjectEnv() {
    const repoRoot = resolveRepoRoot();
    process.env.LOGO_PLATFORM_ROOT = repoRoot;
    (0, dotenv_1.config)({ path: (0, node_path_1.join)(repoRoot, '.env') });
    (0, dotenv_1.config)({ path: (0, node_path_1.join)(repoRoot, 'apps/.env') });
    (0, dotenv_1.config)({ path: (0, node_path_1.join)(process.cwd(), '.env') });
    resolveDatabaseUrl();
    return repoRoot;
}
// Auto-load when imported from CLI scripts
loadProjectEnv();
//# sourceMappingURL=load-env.js.map