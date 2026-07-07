"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnginesController = void 0;
const common_1 = require("@nestjs/common");
const engines_service_1 = require("./engines.service");
const engine_dto_1 = require("./dto/engine.dto");
const prompt_engine_1 = require("@logo-platform/prompt-engine");
let EnginesController = class EnginesController {
    engines;
    constructor(engines) {
        this.engines = engines;
    }
    getPrimitives() {
        return this.engines.getPrimitives();
    }
    getKnowledgeGraph() {
        return this.engines.getKnowledgeGraph();
    }
    queryGraph(nodeId) {
        return this.engines.queryGraph(nodeId);
    }
    brandDNA(body) {
        return this.engines.analyzeBrandDNA(body);
    }
    letterDNA(body) {
        return this.engines.analyzeLetterDNA(body);
    }
    geometry(body) {
        return this.engines.analyzeGeometry(body);
    }
    typography(body) {
        return this.engines.analyzeTypography({
            companyName: body.companyName,
            industry: body.industry,
            markType: body.markType,
        });
    }
    composition(body) {
        return this.engines.analyzeComposition({
            industry: body.industry,
            markType: body.markType,
            hasNegativeSpace: body.hasNegativeSpace,
        });
    }
    construction(body) {
        return this.engines.solveConstruction(body.primitiveIds);
    }
    svgBlueprint(body) {
        return this.engines.generateSVGBlueprint(body.primitiveIds);
    }
    reverseAnalysis(body) {
        return this.engines.reverseAnalyze(body);
    }
    critique(body) {
        const pipeline = (0, prompt_engine_1.runPromptPipeline)(body.prompt);
        return this.engines.critique(pipeline.bestPrompt);
    }
    evolution(body) {
        const pipeline = (0, prompt_engine_1.runPromptPipeline)(body);
        return this.engines.evolve(pipeline.bestPrompt);
    }
    fullPipeline(body) {
        return this.engines.runFullPipeline(body);
    }
};
exports.EnginesController = EnginesController;
__decorate([
    (0, common_1.Get)('primitives'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "getPrimitives", null);
__decorate([
    (0, common_1.Get)('knowledge-graph'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "getKnowledgeGraph", null);
__decorate([
    (0, common_1.Get)('knowledge-graph/:nodeId'),
    __param(0, (0, common_1.Param)('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "queryGraph", null);
__decorate([
    (0, common_1.Post)('brand-dna'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.BrandDNARequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "brandDNA", null);
__decorate([
    (0, common_1.Post)('letter-dna'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.LetterDNARequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "letterDNA", null);
__decorate([
    (0, common_1.Post)('geometry'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.GeometryRequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "geometry", null);
__decorate([
    (0, common_1.Post)('typography'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "typography", null);
__decorate([
    (0, common_1.Post)('composition'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "composition", null);
__decorate([
    (0, common_1.Post)('construction'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.SVGBlueprintRequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "construction", null);
__decorate([
    (0, common_1.Post)('svg-blueprint'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.SVGBlueprintRequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "svgBlueprint", null);
__decorate([
    (0, common_1.Post)('reverse-analysis'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.ReverseAnalysisRequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "reverseAnalysis", null);
__decorate([
    (0, common_1.Post)('critique'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "critique", null);
__decorate([
    (0, common_1.Post)('evolution'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "evolution", null);
__decorate([
    (0, common_1.Post)('pipeline'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [engine_dto_1.FullPipelineRequestDto]),
    __metadata("design:returntype", void 0)
], EnginesController.prototype, "fullPipeline", null);
exports.EnginesController = EnginesController = __decorate([
    (0, common_1.Controller)('engines'),
    __metadata("design:paramtypes", [engines_service_1.EnginesService])
], EnginesController);
//# sourceMappingURL=engines.controller.js.map