"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnginesService = void 0;
const common_1 = require("@nestjs/common");
const ai_engines_1 = require("@logo-platform/ai-engines");
let EnginesService = class EnginesService {
    analyzeBrandDNA(input) {
        return (0, ai_engines_1.analyzeBrandDNA)(input);
    }
    analyzeLetterDNA(input) {
        return (0, ai_engines_1.analyzeLetterDNA)(input);
    }
    analyzeGeometry(input) {
        return (0, ai_engines_1.analyzeGeometry)(input);
    }
    analyzeShapePsychology(shapes, industry) {
        return (0, ai_engines_1.analyzeShapePsychology)({ shapes, industry });
    }
    analyzeTypography(input) {
        return (0, ai_engines_1.analyzeTypography)(input);
    }
    solveConstruction(primitiveIds) {
        return (0, ai_engines_1.solveConstruction)({ primitiveIds });
    }
    analyzeComposition(input) {
        return (0, ai_engines_1.analyzeComposition)(input);
    }
    generateSVGBlueprint(primitiveIds) {
        const construction = (0, ai_engines_1.solveConstruction)({ primitiveIds });
        return (0, ai_engines_1.generateSVGBlueprint)({ primitiveIds, construction });
    }
    reverseAnalyze(input) {
        return (0, ai_engines_1.reverseAnalyzeLogo)(input);
    }
    critique(prompt) {
        return (0, ai_engines_1.critiqueLogo)({ prompt });
    }
    evolve(prompt) {
        return (0, ai_engines_1.runEvolution)({ prompt, maxGenerations: 3 });
    }
    getKnowledgeGraph() {
        return (0, ai_engines_1.getKnowledgeGraphVisualization)();
    }
    queryGraph(nodeId) {
        return (0, ai_engines_1.queryKnowledgeGraph)(nodeId);
    }
    runFullPipeline(input) {
        return (0, ai_engines_1.runFullPipeline)(input);
    }
    getPrimitives() {
        return ai_engines_1.GEOMETRY_PRIMITIVES;
    }
};
exports.EnginesService = EnginesService;
exports.EnginesService = EnginesService = __decorate([
    (0, common_1.Injectable)()
], EnginesService);
//# sourceMappingURL=engines.service.js.map