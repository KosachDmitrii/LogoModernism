"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptsService = void 0;
const common_1 = require("@nestjs/common");
const prompt_engine_1 = require("@logo-platform/prompt-engine");
let PromptsService = class PromptsService {
    generate(request) {
        return (0, prompt_engine_1.runPromptPipeline)(request);
    }
    critique(promptId, pipelineResult) {
        const prompt = pipelineResult.prompts.find((p) => p.id === promptId) ?? pipelineResult.bestPrompt;
        return (0, prompt_engine_1.critiqueDesign)(prompt);
    }
    evolve(promptId, pipelineResult) {
        const prompt = pipelineResult.prompts.find((p) => p.id === promptId) ?? pipelineResult.bestPrompt;
        return (0, prompt_engine_1.evolvePrompt)(prompt);
    }
};
exports.PromptsService = PromptsService;
exports.PromptsService = PromptsService = __decorate([
    (0, common_1.Injectable)()
], PromptsService);
//# sourceMappingURL=prompts.service.js.map