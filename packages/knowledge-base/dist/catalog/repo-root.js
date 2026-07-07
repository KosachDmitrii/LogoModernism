"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRepoRoot = resolveRepoRoot;
const node_fs_1 = require("node:fs");
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
    return process.cwd();
}
//# sourceMappingURL=repo-root.js.map