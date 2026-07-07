"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoReferences = exports.getCatalogPrincipleIdsFromContext = exports.buildCatalogPromptContext = exports.LOGO_CATALOG = exports.DESIGNER_PROFILE_IDS = exports.CASE_STUDY_IDS = exports.CATALOG_TAXONOMY = void 0;
exports.getFullCatalog = getFullCatalog;
exports.getCatalogTaxonomy = getCatalogTaxonomy;
exports.getCatalogStats = getCatalogStats;
exports.getCatalogEntry = getCatalogEntry;
exports.getCatalogByChapter = getCatalogByChapter;
exports.getCatalogBySection = getCatalogBySection;
exports.getCaseStudies = getCaseStudies;
exports.getDesignerProfiles = getDesignerProfiles;
exports.searchCatalog = searchCatalog;
exports.matchCatalogToDescription = matchCatalogToDescription;
exports.getCatalogPrincipleIds = getCatalogPrincipleIds;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const entries_1 = require("./entries");
const taxonomy_1 = require("./taxonomy");
Object.defineProperty(exports, "CATALOG_TAXONOMY", { enumerable: true, get: function () { return taxonomy_1.CATALOG_TAXONOMY; } });
Object.defineProperty(exports, "CASE_STUDY_IDS", { enumerable: true, get: function () { return taxonomy_1.CASE_STUDY_IDS; } });
Object.defineProperty(exports, "DESIGNER_PROFILE_IDS", { enumerable: true, get: function () { return taxonomy_1.DESIGNER_PROFILE_IDS; } });
const repo_root_1 = require("./repo-root");
const catalog_prompt_1 = require("./catalog-prompt");
const IMPORTED_FILE = 'data/catalog-pipeline/imported-catalog.json';
function loadImportedCatalog() {
    try {
        const importedPath = (0, node_path_1.join)((0, repo_root_1.resolveRepoRoot)(), IMPORTED_FILE);
        if (!(0, node_fs_1.existsSync)(importedPath))
            return [];
        return JSON.parse((0, node_fs_1.readFileSync)(importedPath, 'utf-8'));
    }
    catch {
        return [];
    }
}
function getFullCatalog() {
    return [...entries_1.LOGO_CATALOG, ...loadImportedCatalog()];
}
exports.LOGO_CATALOG = entries_1.LOGO_CATALOG;
function getCatalogTaxonomy() {
    return taxonomy_1.CATALOG_TAXONOMY;
}
function getCatalogStats() {
    const byChapter = { geometric: 0, effect: 0, typographic: 0 };
    const byKind = { logo: 0, case_study: 0, designer_profile: 0 };
    for (const e of getFullCatalog()) {
        if (e.catalogChapter)
            byChapter[e.catalogChapter]++;
        byKind[e.entryKind ?? 'logo']++;
    }
    return {
        total: getFullCatalog().length,
        curated: entries_1.LOGO_CATALOG.length,
        imported: loadImportedCatalog().length,
        byChapter,
        byKind,
        sections: taxonomy_1.CATALOG_TAXONOMY.flatMap((c) => c.sections).length,
        caseStudies: taxonomy_1.CASE_STUDY_IDS.length,
        designerProfiles: taxonomy_1.DESIGNER_PROFILE_IDS.length,
    };
}
function getCatalogEntry(id) {
    return getFullCatalog().find((e) => e.id === id);
}
function getCatalogByChapter(chapter) {
    return getFullCatalog().filter((e) => e.catalogChapter === chapter);
}
function getCatalogBySection(chapter, section) {
    return getFullCatalog().filter((e) => e.catalogChapter === chapter && e.catalogSection === section);
}
function getCaseStudies() {
    return getFullCatalog().filter((e) => e.entryKind === 'case_study');
}
function getDesignerProfiles() {
    return getFullCatalog().filter((e) => e.entryKind === 'designer_profile');
}
function searchCatalog(filters) {
    let results = getFullCatalog();
    if (filters.chapter) {
        results = results.filter((e) => e.catalogChapter === filters.chapter);
    }
    if (filters.section) {
        results = results.filter((e) => e.catalogSection === filters.section);
    }
    if (filters.era) {
        results = results.filter((e) => e.era === filters.era);
    }
    if (filters.industry) {
        const ind = filters.industry.toLowerCase();
        results = results.filter((e) => e.industry.toLowerCase().includes(ind) ||
            e.keywords.some((k) => k.toLowerCase().includes(ind)));
    }
    if (filters.designer) {
        const d = filters.designer.toLowerCase();
        results = results.filter((e) => e.designer?.toLowerCase().includes(d));
    }
    if (filters.entryKind) {
        results = results.filter((e) => e.entryKind === filters.entryKind);
    }
    if (filters.markType) {
        results = results.filter((e) => e.markType === filters.markType);
    }
    if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((e) => e.name.toLowerCase().includes(q) ||
            e.designer?.toLowerCase().includes(q) ||
            e.country?.toLowerCase().includes(q) ||
            e.significance?.toLowerCase().includes(q) ||
            e.keywords.some((k) => k.toLowerCase().includes(q)) ||
            e.geometry.some((g) => g.toLowerCase().includes(q)));
    }
    const limit = filters.limit ?? 200;
    return results.slice(0, limit);
}
function matchCatalogToDescription(description, limit = 8) {
    const q = description.toLowerCase();
    const scored = getFullCatalog().map((e) => {
        let score = 0;
        if (e.name.toLowerCase().includes(q))
            score += 5;
        if (e.designer?.toLowerCase().includes(q))
            score += 4;
        for (const g of e.geometry)
            if (q.includes(g))
                score += 2;
        for (const k of e.keywords)
            if (q.includes(k))
                score += 1.5;
        if (e.significance?.toLowerCase().includes(q))
            score += 1;
        for (const p of e.principleIds)
            if (q.includes(p.replace(/-/g, ' ')))
                score += 0.5;
        return { entry: e, score };
    });
    return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((s) => s.entry);
}
function getCatalogPrincipleIds(referenceIds) {
    return (0, catalog_prompt_1.getCatalogPrincipleIdsFromContext)(referenceIds);
}
var catalog_prompt_2 = require("./catalog-prompt");
Object.defineProperty(exports, "buildCatalogPromptContext", { enumerable: true, get: function () { return catalog_prompt_2.buildCatalogPromptContext; } });
Object.defineProperty(exports, "getCatalogPrincipleIdsFromContext", { enumerable: true, get: function () { return catalog_prompt_2.getCatalogPrincipleIdsFromContext; } });
/** Backward-compatible alias */
exports.logoReferences = entries_1.LOGO_CATALOG;
//# sourceMappingURL=index.js.map