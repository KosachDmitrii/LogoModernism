"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrinciplesService = void 0;
const common_1 = require("@nestjs/common");
const knowledge_base_1 = require("@logo-platform/knowledge-base");
let PrinciplesService = class PrinciplesService {
    findAll() {
        return {
            total: knowledge_base_1.designPrinciples.length,
            categories: [...new Set(knowledge_base_1.designPrinciples.map((p) => p.category))],
        };
    }
    search(filters) {
        return (0, knowledge_base_1.searchPrinciples)({
            ...filters,
            category: filters.category,
        });
    }
    findOne(id) {
        return (0, knowledge_base_1.getPrincipleById)(id);
    }
    findByCategory(category) {
        return (0, knowledge_base_1.getPrinciplesByCategory)(category);
    }
    getGraph() {
        return knowledge_base_1.knowledgeGraph;
    }
    getReferences() {
        return (0, knowledge_base_1.getFullCatalog)();
    }
    getCatalogTaxonomy() {
        return (0, knowledge_base_1.getCatalogTaxonomy)();
    }
    getCatalogStats() {
        return (0, knowledge_base_1.getCatalogStats)();
    }
    getCatalogEntry(id) {
        return (0, knowledge_base_1.getCatalogEntry)(id) ?? null;
    }
    getCaseStudies() {
        return (0, knowledge_base_1.getCaseStudies)();
    }
    getDesignerProfiles() {
        return (0, knowledge_base_1.getDesignerProfiles)();
    }
    searchCatalog(filters) {
        return (0, knowledge_base_1.searchCatalog)({
            ...filters,
            chapter: filters.chapter,
            era: filters.era,
            entryKind: filters.entryKind,
            markType: filters.markType,
        });
    }
    getTemplates(tags) {
        if (!tags)
            return knowledge_base_1.promptTemplates;
        const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
        return knowledge_base_1.promptTemplates.filter((t) => tagList.some((tag) => t.tags.some((tt) => tt.toLowerCase().includes(tag))));
    }
};
exports.PrinciplesService = PrinciplesService;
exports.PrinciplesService = PrinciplesService = __decorate([
    (0, common_1.Injectable)()
], PrinciplesService);
//# sourceMappingURL=principles.service.js.map