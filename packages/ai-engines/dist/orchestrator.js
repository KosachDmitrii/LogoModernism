"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFullPipeline = runFullPipeline;
const prompt_engine_1 = require("@logo-platform/prompt-engine");
const brand_dna_engine_1 = require("./brand-dna.engine");
const letter_dna_engine_1 = require("./letter-dna.engine");
const geometry_intelligence_engine_1 = require("./geometry-intelligence.engine");
const shape_psychology_engine_1 = require("./shape-psychology.engine");
const typography_intelligence_engine_1 = require("./typography-intelligence.engine");
const construction_solver_engine_1 = require("./construction-solver.engine");
const composition_ai_engine_1 = require("./composition-ai.engine");
const svg_blueprint_engine_1 = require("./svg-blueprint.engine");
const logo_critic_engine_1 = require("./logo-critic.engine");
const evolution_engine_1 = require("./evolution.engine");
function runFullPipeline(input) {
    const brandDNA = (0, brand_dna_engine_1.analyzeBrandDNA)({
        companyName: input.companyName,
        industry: input.industry,
        preferredEra: input.preferredEra,
        personality: input.inspirationMode,
        markType: mapMarkType(input.markType),
    });
    const letterDNA = (0, letter_dna_engine_1.analyzeLetterDNA)({ text: input.companyName, style: 'geometric' });
    const geometry = (0, geometry_intelligence_engine_1.analyzeGeometry)({
        industry: input.industry,
        complexity: brandDNA.visualTraits.complexity,
    });
    const shapePsychology = (0, shape_psychology_engine_1.analyzeShapePsychology)({
        shapes: geometry.recommendations.slice(0, 3).map((r) => r.name.toLowerCase()),
        industry: input.industry,
        brandPersonality: brandDNA.personality,
    });
    const typography = (0, typography_intelligence_engine_1.analyzeTypography)({
        companyName: input.companyName,
        industry: input.industry,
        markType: mapMarkType(input.markType),
    });
    const composition = (0, composition_ai_engine_1.analyzeComposition)({
        markType: mapCompositionMarkType(input.markType ?? brandDNA.markType),
        industry: input.industry,
        hasNegativeSpace: letterDNA.counterSpaceStrategy.toLowerCase().includes('negative'),
    });
    const topPrimitives = geometry.recommendations.slice(0, 2).map((r) => r.primitiveId);
    const construction = (0, construction_solver_engine_1.solveConstruction)({
        primitiveIds: topPrimitives,
        targetComplexity: brandDNA.visualTraits.complexity,
    });
    const svgBlueprint = (0, svg_blueprint_engine_1.generateSVGBlueprint)({
        primitiveIds: topPrimitives,
        construction,
    });
    const analysisPrincipleIds = [
        ...brandDNA.principleIds,
        ...composition.recommendedLayout.principleIds,
        typography.primaryRecommendation.principleId,
        ...typography.alternatives.slice(0, 2).map((a) => a.principleId),
    ].filter((id, i, arr) => arr.indexOf(id) === i);
    const promptRequest = {
        industry: input.industry,
        companyName: input.companyName,
        variationCount: input.variationCount ?? 5,
        preferredEra: input.preferredEra ?? brandDNA.visualTraits.era,
        minimalismLevel: brandDNA.visualTraits.complexity === 'minimal' ? 9 : 7,
        inspirationMode: input.inspirationMode,
        analysisPrincipleIds,
    };
    const prompts = (0, prompt_engine_1.runPromptPipeline)(promptRequest);
    const critique = (0, logo_critic_engine_1.critiqueLogo)({ prompt: prompts.bestPrompt });
    let evolution;
    if (prompts.bestPrompt.scores.promptQuality < 8) {
        evolution = (0, evolution_engine_1.runEvolution)({ prompt: prompts.bestPrompt, maxGenerations: 2 });
    }
    return {
        brandDNA,
        letterDNA,
        geometry,
        shapePsychology,
        typography,
        composition,
        construction,
        svgBlueprint,
        prompts,
        critique,
        evolution,
    };
}
function mapMarkType(markType) {
    if (!markType)
        return undefined;
    if (markType === 'symbol')
        return 'lettermark';
    if (markType === 'emblem')
        return 'combination';
    return markType;
}
function mapCompositionMarkType(markType) {
    if (!markType || markType === 'lettermark')
        return 'wordmark';
    if (markType === 'emblem')
        return 'emblem';
    if (markType === 'symbol')
        return 'symbol';
    return markType;
}
//# sourceMappingURL=orchestrator.js.map