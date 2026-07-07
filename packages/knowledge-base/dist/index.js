"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templatesData = exports.graphData = exports.principlesData = exports.buildCatalogPromptContext = exports.getFullCatalog = exports.getCatalogPrincipleIds = exports.matchCatalogToDescription = exports.searchCatalog = exports.getDesignerProfiles = exports.getCaseStudies = exports.getCatalogBySection = exports.getCatalogByChapter = exports.getCatalogEntry = exports.getCatalogStats = exports.getCatalogTaxonomy = exports.CATALOG_TAXONOMY = exports.LOGO_CATALOG = exports.promptTemplates = exports.logoReferences = exports.knowledgeGraph = exports.designPrinciples = void 0;
exports.getPrincipleById = getPrincipleById;
exports.getPrinciplesByCategory = getPrinciplesByCategory;
exports.getCompatiblePrinciples = getCompatiblePrinciples;
exports.getConflictingPrinciples = getConflictingPrinciples;
exports.searchPrinciples = searchPrinciples;
const principles_json_1 = __importDefault(require("./data/principles.json"));
exports.principlesData = principles_json_1.default;
const knowledge_graph_json_1 = __importDefault(require("./data/knowledge-graph.json"));
exports.graphData = knowledge_graph_json_1.default;
const prompt_templates_json_1 = __importDefault(require("./data/prompt-templates.json"));
exports.templatesData = prompt_templates_json_1.default;
const catalog_1 = require("./catalog");
Object.defineProperty(exports, "LOGO_CATALOG", { enumerable: true, get: function () { return catalog_1.LOGO_CATALOG; } });
Object.defineProperty(exports, "getCatalogTaxonomy", { enumerable: true, get: function () { return catalog_1.getCatalogTaxonomy; } });
Object.defineProperty(exports, "getCatalogStats", { enumerable: true, get: function () { return catalog_1.getCatalogStats; } });
Object.defineProperty(exports, "getCatalogEntry", { enumerable: true, get: function () { return catalog_1.getCatalogEntry; } });
Object.defineProperty(exports, "getCatalogByChapter", { enumerable: true, get: function () { return catalog_1.getCatalogByChapter; } });
Object.defineProperty(exports, "getCatalogBySection", { enumerable: true, get: function () { return catalog_1.getCatalogBySection; } });
Object.defineProperty(exports, "getCaseStudies", { enumerable: true, get: function () { return catalog_1.getCaseStudies; } });
Object.defineProperty(exports, "getDesignerProfiles", { enumerable: true, get: function () { return catalog_1.getDesignerProfiles; } });
Object.defineProperty(exports, "searchCatalog", { enumerable: true, get: function () { return catalog_1.searchCatalog; } });
Object.defineProperty(exports, "matchCatalogToDescription", { enumerable: true, get: function () { return catalog_1.matchCatalogToDescription; } });
Object.defineProperty(exports, "getCatalogPrincipleIds", { enumerable: true, get: function () { return catalog_1.getCatalogPrincipleIds; } });
Object.defineProperty(exports, "CATALOG_TAXONOMY", { enumerable: true, get: function () { return catalog_1.CATALOG_TAXONOMY; } });
Object.defineProperty(exports, "getFullCatalog", { enumerable: true, get: function () { return catalog_1.getFullCatalog; } });
Object.defineProperty(exports, "buildCatalogPromptContext", { enumerable: true, get: function () { return catalog_1.buildCatalogPromptContext; } });
exports.designPrinciples = principles_json_1.default;
exports.knowledgeGraph = knowledge_graph_json_1.default;
exports.logoReferences = (0, catalog_1.getFullCatalog)();
exports.promptTemplates = prompt_templates_json_1.default;
function getPrincipleById(id) {
    return exports.designPrinciples.find((p) => p.id === id);
}
function getPrinciplesByCategory(category) {
    return exports.designPrinciples.filter((p) => p.category === category);
}
function getCompatiblePrinciples(principleId) {
    const principle = getPrincipleById(principleId);
    if (!principle)
        return [];
    const compatibleIds = new Set([
        ...principle.compatibility,
        ...exports.knowledgeGraph
            .filter((e) => e.from === principleId && e.relation !== 'conflicts_with')
            .map((e) => e.to),
        ...exports.knowledgeGraph
            .filter((e) => e.to === principleId && e.relation !== 'conflicts_with')
            .map((e) => e.from),
    ]);
    return exports.designPrinciples.filter((p) => compatibleIds.has(p.id));
}
function getConflictingPrinciples(principleIds) {
    const conflicts = [];
    for (const edge of exports.knowledgeGraph) {
        if (edge.relation !== 'conflicts_with')
            continue;
        if (principleIds.includes(edge.from) && principleIds.includes(edge.to)) {
            conflicts.push([edge.from, edge.to]);
        }
    }
    return conflicts;
}
function searchPrinciples(filters) {
    let results = [...exports.designPrinciples];
    if (filters.category) {
        results = results.filter((p) => p.category === filters.category);
    }
    if (filters.era) {
        results = results.filter((p) => p.era?.includes(filters.era));
    }
    if (filters.industry) {
        const industry = filters.industry.toLowerCase();
        results = results.filter((p) => p.industries?.some((i) => i.toLowerCase().includes(industry)) ||
            p.tags.some((t) => t.toLowerCase().includes(industry)));
    }
    if (filters.tags?.length) {
        results = results.filter((p) => filters.tags.some((tag) => p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())));
    }
    if (filters.query) {
        const q = filters.query.toLowerCase();
        results = results.filter((p) => p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.promptFragment.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q)));
    }
    return results;
}
//# sourceMappingURL=index.js.map