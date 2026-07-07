"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slimPrompt = slimPrompt;
exports.slimPipelineResult = slimPipelineResult;
function slimPrompt(prompt) {
    return {
        ...prompt,
        selectedPrinciples: prompt.selectedPrinciples.map((principle) => ({
            id: principle.id,
            name: principle.name,
            category: principle.category,
            description: principle.description,
            promptFragment: principle.promptFragment,
            examples: [],
            weight: 1,
            compatibility: [],
            antiPatterns: [],
            tags: [],
        })),
    };
}
function slimPipelineResult(result) {
    return {
        prompts: result.prompts.map(slimPrompt),
        recommendations: result.recommendations,
        bestPrompt: slimPrompt(result.bestPrompt),
    };
}
//# sourceMappingURL=prompt-response.js.map