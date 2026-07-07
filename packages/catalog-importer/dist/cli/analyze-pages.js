#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const node_path_1 = require("node:path");
const vision_analyzer_1 = require("../vision-analyzer");
const storage_1 = require("../storage");
const repo_root_1 = require("../repo-root");
const parse_args_1 = require("./parse-args");
const repoRoot = (0, repo_root_1.resolveRepoRoot)();
(0, dotenv_1.config)({ path: (0, node_path_1.join)(repoRoot, '.env') });
(0, dotenv_1.config)({ path: (0, node_path_1.join)(repoRoot, 'apps/.env') });
async function main() {
    const args = (0, parse_args_1.normalizePageRangeArgs)(process.argv.slice(2));
    const argNum = (name, fallback) => {
        const eq = args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
        if (eq)
            return Number(eq);
        const idx = args.indexOf(`--${name}`);
        if (idx >= 0 && args[idx + 1])
            return Number(args[idx + 1]);
        return fallback;
    };
    const start = argNum('start', 1);
    const end = argNum('end', 0);
    const force = args.includes('--force');
    const index = (0, storage_1.loadPagesIndex)();
    if (!index) {
        console.error('No pages-index.json. Run: npm run catalog:extract');
        process.exit(1);
    }
    let pages = index.pages;
    if (start > 1)
        pages = pages.filter((p) => p.page >= start);
    if (end > 0)
        pages = pages.filter((p) => p.page <= end);
    const existing = (0, storage_1.loadCandidates)();
    const analyzedPages = new Set(existing.map((c) => c.sourcePage));
    const toAnalyze = force ? pages : pages.filter((p) => !analyzedPages.has(p.page));
    console.log(`Analyzing ${toAnalyze.length} pages with Vision...`);
    const newCandidates = await (0, vision_analyzer_1.analyzePages)(toAnalyze, {
        onProgress: (page, count) => console.log(`  page ${page}: ${count} logos`),
    });
    const merged = [...existing];
    for (const c of newCandidates) {
        const idx = merged.findIndex((m) => m.id === c.id);
        if (idx >= 0)
            merged[idx] = c;
        else
            merged.push(c);
    }
    (0, storage_1.saveCandidates)(merged);
    console.log(`Done. Total candidates: ${merged.length} (+${newCandidates.length} new)`);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=analyze-pages.js.map