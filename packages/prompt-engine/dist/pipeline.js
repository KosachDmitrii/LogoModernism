"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestMutations = exports.critiqueDesign = exports.evolvePrompt = exports.scorePrompt = exports.detectPromptIssues = exports.optimizePrompt = exports.composePromptVariations = exports.composePrompt = exports.selectDesignRules = void 0;
exports.runPromptPipeline = runPromptPipeline;
exports.generateFromTemplate = generateFromTemplate;
const knowledge_base_1 = require("@logo-platform/knowledge-base");
const design_rules_engine_1 = require("./design-rules-engine");
const prompt_composer_1 = require("./prompt-composer");
const prompt_evolution_1 = require("./prompt-evolution");
function runPromptPipeline(request) {
    const variationCount = Math.min(request.variationCount ?? 5, 100);
    const baseSelection = (0, design_rules_engine_1.selectDesignRules)({
        industry: request.industry,
        companyName: request.companyName,
        preferredEra: request.preferredEra,
        minimalismLevel: request.minimalismLevel ?? 8,
        inspirationMode: request.inspirationMode,
        variationSeed: 42,
    });
    const prompts = (0, prompt_composer_1.composePromptVariations)({
        industry: request.industry,
        companyName: request.companyName,
        principles: baseSelection.principles,
        dna: baseSelection.dna,
        inspirationMode: request.inspirationMode,
    }, variationCount, (seed) => (0, design_rules_engine_1.selectDesignRules)({
        industry: request.industry,
        companyName: request.companyName,
        preferredEra: request.preferredEra,
        minimalismLevel: request.minimalismLevel ?? 8,
        inspirationMode: request.inspirationMode,
        variationSeed: seed * 137,
    }));
    let bestPrompt = prompts[0];
    if (bestPrompt.scores.promptQuality < 7) {
        const evolved = (0, prompt_evolution_1.evolvePrompt)(bestPrompt, 2);
        if (evolved[0]?.scores.promptQuality > bestPrompt.scores.promptQuality) {
            bestPrompt = evolved[0];
            prompts.unshift(...evolved.filter((p) => p.id !== bestPrompt.id));
        }
    }
    return {
        prompts: prompts.slice(0, variationCount),
        recommendations: baseSelection.recommendations,
        bestPrompt,
    };
}
function generateFromTemplate(templateId, industry) {
    const template = knowledge_base_1.promptTemplates.find((t) => t.id === templateId);
    if (!template)
        return null;
    const principles = template.principleIds
        .map((id) => (0, knowledge_base_1.getPrincipleById)(id))
        .filter((p) => Boolean(p));
    const selection = (0, design_rules_engine_1.selectDesignRules)({ industry, variationSeed: 1 });
    return (0, prompt_composer_1.buildPromptFromTemplate)(template.templateFragments, principles.length ? principles : selection.principles, industry, selection.dna);
}
var design_rules_engine_2 = require("./design-rules-engine");
Object.defineProperty(exports, "selectDesignRules", { enumerable: true, get: function () { return design_rules_engine_2.selectDesignRules; } });
var prompt_composer_2 = require("./prompt-composer");
Object.defineProperty(exports, "composePrompt", { enumerable: true, get: function () { return prompt_composer_2.composePrompt; } });
Object.defineProperty(exports, "composePromptVariations", { enumerable: true, get: function () { return prompt_composer_2.composePromptVariations; } });
var prompt_optimizer_1 = require("./prompt-optimizer");
Object.defineProperty(exports, "optimizePrompt", { enumerable: true, get: function () { return prompt_optimizer_1.optimizePrompt; } });
Object.defineProperty(exports, "detectPromptIssues", { enumerable: true, get: function () { return prompt_optimizer_1.detectPromptIssues; } });
var prompt_scorer_1 = require("./prompt-scorer");
Object.defineProperty(exports, "scorePrompt", { enumerable: true, get: function () { return prompt_scorer_1.scorePrompt; } });
var prompt_evolution_2 = require("./prompt-evolution");
Object.defineProperty(exports, "evolvePrompt", { enumerable: true, get: function () { return prompt_evolution_2.evolvePrompt; } });
Object.defineProperty(exports, "critiqueDesign", { enumerable: true, get: function () { return prompt_evolution_2.critiqueDesign; } });
Object.defineProperty(exports, "suggestMutations", { enumerable: true, get: function () { return prompt_evolution_2.suggestMutations; } });
//# sourceMappingURL=pipeline.js.map