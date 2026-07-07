"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const REPO_ROOT = (0, node_path_1.resolve)(__dirname, '../../..');
process.env.LOGO_PLATFORM_ROOT = process.env.LOGO_PLATFORM_ROOT ?? REPO_ROOT;
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(REPO_ROOT, '.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(REPO_ROOT, 'apps/.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(process.cwd(), '.env') });
//# sourceMappingURL=preload-env.js.map