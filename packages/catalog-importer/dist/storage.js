"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APPROVED_FILE = exports.PAGES_INDEX_FILE = exports.CANDIDATES_FILE = exports.PIPELINE_DIR = void 0;
exports.ensurePipelineDir = ensurePipelineDir;
exports.loadPagesIndex = loadPagesIndex;
exports.loadCandidates = loadCandidates;
exports.saveCandidates = saveCandidates;
exports.loadApproved = loadApproved;
exports.saveApproved = saveApproved;
exports.getPipelineStats = getPipelineStats;
exports.slugify = slugify;
exports.candidateId = candidateId;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const repo_root_1 = require("./repo-root");
exports.PIPELINE_DIR = (0, node_path_1.join)((0, repo_root_1.resolveRepoRoot)(), 'data/catalog-pipeline');
exports.CANDIDATES_FILE = (0, node_path_1.join)(exports.PIPELINE_DIR, 'candidates.json');
exports.PAGES_INDEX_FILE = (0, node_path_1.join)(exports.PIPELINE_DIR, 'pages-index.json');
exports.APPROVED_FILE = (0, node_path_1.join)(exports.PIPELINE_DIR, 'approved.json');
function ensurePipelineDir() {
    if (!(0, node_fs_1.existsSync)(exports.PIPELINE_DIR)) {
        (0, node_fs_1.mkdirSync)(exports.PIPELINE_DIR, { recursive: true });
    }
}
function loadPagesIndex() {
    if (!(0, node_fs_1.existsSync)(exports.PAGES_INDEX_FILE))
        return null;
    return JSON.parse((0, node_fs_1.readFileSync)(exports.PAGES_INDEX_FILE, 'utf-8'));
}
function loadCandidates() {
    if (!(0, node_fs_1.existsSync)(exports.CANDIDATES_FILE))
        return [];
    return JSON.parse((0, node_fs_1.readFileSync)(exports.CANDIDATES_FILE, 'utf-8'));
}
function saveCandidates(candidates) {
    ensurePipelineDir();
    (0, node_fs_1.writeFileSync)(exports.CANDIDATES_FILE, JSON.stringify(candidates, null, 2));
}
function loadApproved() {
    if (!(0, node_fs_1.existsSync)(exports.APPROVED_FILE))
        return [];
    return JSON.parse((0, node_fs_1.readFileSync)(exports.APPROVED_FILE, 'utf-8'));
}
function saveApproved(approved) {
    ensurePipelineDir();
    (0, node_fs_1.writeFileSync)(exports.APPROVED_FILE, JSON.stringify(approved, null, 2));
}
function getPipelineStats() {
    const index = loadPagesIndex();
    const candidates = loadCandidates();
    return {
        totalPages: index?.totalPages ?? 0,
        extractedPages: index?.pages.length ?? 0,
        totalCandidates: candidates.length,
        pending: candidates.filter((c) => c.status === 'pending').length,
        approved: candidates.filter((c) => c.status === 'approved').length,
        rejected: candidates.filter((c) => c.status === 'rejected').length,
    };
}
function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
}
function candidateId(page, index, name) {
    return `cand-p${page}-${index}-${slugify(name) || 'logo'}`;
}
//# sourceMappingURL=storage.js.map