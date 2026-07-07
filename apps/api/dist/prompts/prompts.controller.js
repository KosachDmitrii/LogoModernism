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
exports.PromptsController = void 0;
const common_1 = require("@nestjs/common");
const prompts_service_1 = require("./prompts.service");
const generate_prompt_dto_1 = require("./dto/generate-prompt.dto");
const prompt_response_1 = require("./prompt-response");
let PromptsController = class PromptsController {
    promptsService;
    lastResult = null;
    constructor(promptsService) {
        this.promptsService = promptsService;
    }
    generate(dto) {
        const request = {
            industry: dto.industry,
            companyName: dto.companyName,
            variationCount: dto.variationCount ?? 10,
            inspirationMode: dto.inspirationMode,
            preferredEra: dto.preferredEra,
            minimalismLevel: dto.minimalismLevel,
            analysisPrincipleIds: dto.analysisPrincipleIds,
            catalogReferenceIds: dto.catalogReferenceIds,
            catalogNarrative: dto.catalogNarrative,
        };
        this.lastResult = this.promptsService.generate(request);
        return (0, prompt_response_1.slimPipelineResult)(this.lastResult);
    }
    recommend(industry) {
        const result = this.promptsService.generate({
            industry,
            variationCount: 1,
        });
        return {
            industry,
            recommendations: result.recommendations,
            suggestedPrinciples: result.bestPrompt.selectedPrinciples.map((p) => ({
                id: p.id,
                name: p.name,
                category: p.category,
            })),
            dna: result.bestPrompt.dna,
        };
    }
    critique(id) {
        if (!this.lastResult) {
            return { error: 'Generate prompts first' };
        }
        return this.promptsService.critique(id, this.lastResult);
    }
    evolve(id) {
        if (!this.lastResult) {
            return { error: 'Generate prompts first' };
        }
        return this.promptsService.evolve(id, this.lastResult);
    }
};
exports.PromptsController = PromptsController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_prompt_dto_1.GeneratePromptDto]),
    __metadata("design:returntype", void 0)
], PromptsController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('recommend/:industry'),
    __param(0, (0, common_1.Param)('industry')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromptsController.prototype, "recommend", null);
__decorate([
    (0, common_1.Post)(':id/critique'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromptsController.prototype, "critique", null);
__decorate([
    (0, common_1.Post)(':id/evolve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PromptsController.prototype, "evolve", null);
exports.PromptsController = PromptsController = __decorate([
    (0, common_1.Controller)('prompts'),
    __metadata("design:paramtypes", [prompts_service_1.PromptsService])
], PromptsController);
//# sourceMappingURL=prompts.controller.js.map