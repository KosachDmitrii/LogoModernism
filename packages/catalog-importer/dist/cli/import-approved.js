#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const import_approved_1 = require("../import-approved");
const repo_root_1 = require("../repo-root");
const out = (0, node_path_1.join)((0, repo_root_1.resolveRepoRoot)(), 'data/catalog-pipeline/imported-catalog.json');
const entries = (0, import_approved_1.importApprovedToCatalog)();
(0, node_fs_1.writeFileSync)(out, JSON.stringify(entries, null, 2));
console.log(`Exported ${entries.length} approved entries → ${out}`);
//# sourceMappingURL=import-approved.js.map