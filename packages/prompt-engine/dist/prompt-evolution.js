"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolvePrompt = evolvePrompt;
exports.suggestMutations = suggestMutations;
exports.critiqueDesign = critiqueDesign;
const knowledge_base_1 = require("@logo-platform/knowledge-base");
const design_rules_engine_1 = require("./design-rules-engine");
const prompt_composer_1 = require("./prompt-composer");
const MUTATION_FIELDS = [
    { field: 'geometry', alternatives: ['geo-circle', 'geo-square', 'geo-triangle', 'geo-hexagon', 'geo-organic-round'] },
    { field: 'grid', alternatives: ['con-modular-grid', 'con-radial-grid', 'grid-8-unit', 'con-golden-ratio'] },
    { field: 'stroke', alternatives: ['stroke-single-stroke', 'stroke-equal-width-lines', 'stroke-bold-stroke', 'stroke-continuous-line'] },
    { field: 'shape', alternatives: ['mark-abstract-symbol', 'mark-pictogram', 'mark-monogram', 'mark-wordmark'] },
];
function evolvePrompt(weakPrompt, maxAttempts = 3) {
    const evolved = [];
    const qualityThreshold = 7.5;
    if (weakPrompt.scores.promptQuality >= qualityThreshold) {
        return [weakPrompt];
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const mutations = suggestMutations(weakPrompt);
        const seed = (weakPrompt.metadata.variationIndex ?? 0) + attempt + 100;
        const selection = (0, design_rules_engine_1.selectDesignRules)({
            industry: weakPrompt.industry,
            preferredEra: weakPrompt.dna.era,
            minimalismLevel: Math.min(10, weakPrompt.dna.minimalism + 1),
            variationSeed: seed,
        });
        for (const mutation of mutations) {
            const altId = mutation.to[0];
            const altRule = (0, knowledge_base_1.getPrincipleById)(altId);
            if (altRule && !selection.principles.find((p) => p.id === altId)) {
                selection.principles = [
                    ...selection.principles.filter((p) => !mutation.from.includes(p.name)),
                    altRule,
                ];
            }
        }
        const newPrompt = (0, prompt_composer_1.composePrompt)({
            industry: weakPrompt.industry,
            principles: selection.principles,
            dna: selection.dna,
            variationIndex: seed,
        });
        evolved.push(newPrompt);
    }
    return evolved.sort((a, b) => b.scores.promptQuality - a.scores.promptQuality);
}
function suggestMutations(prompt) {
    const mutations = [];
    const scores = prompt.scores;
    if (scores.geometryScore < 6) {
        mutations.push({
            field: 'geometry',
            from: prompt.dna.geometry,
            to: ['geo-hexagon'],
            reason: 'Low geometry score — try stronger geometric foundation',
        });
    }
    if (scores.minimalismScore < 6) {
        mutations.push({
            field: 'complexity',
            from: [prompt.dna.complexity],
            to: ['cx-high-simplicity'],
            reason: 'Increase minimalism through radical simplification',
        });
    }
    if (scores.brandRecognitionScore < 6) {
        mutations.push({
            field: 'shape',
            from: [],
            to: ['mark-iconic-symbol'],
            reason: 'Strengthen iconic recognition',
        });
    }
    if (scores.swissScore < 5) {
        mutations.push({
            field: 'era',
            from: [prompt.dna.era],
            to: ['era-swiss'],
            reason: 'Apply Swiss modernist principles',
        });
    }
    const randomMutation = MUTATION_FIELDS[Math.floor(Math.random() * MUTATION_FIELDS.length)];
    mutations.push({
        field: randomMutation.field,
        from: [],
        to: [randomMutation.alternatives[Math.floor(Math.random() * randomMutation.alternatives.length)]],
        reason: 'Exploratory variation',
    });
    return mutations;
}
function critiqueDesign(prompt) {
    const s = prompt.scores;
    const feedback = [];
    if (s.scalabilityScore < 7)
        feedback.push('Add flat vector constraints for better scalability');
    if (s.minimalismScore < 7)
        feedback.push('Reduce visual complexity for timeless appeal');
    if (s.brandRecognitionScore < 7)
        feedback.push('Strengthen distinctive mark type or monogram');
    if (s.geometryScore < 7)
        feedback.push('Define clearer geometric construction system');
    if (s.readabilityScore < 6)
        feedback.push('Balance prompt length for model clarity');
    const overallScore = s.brandRecognitionScore +
        s.scalabilityScore +
        s.readabilityScore +
        s.minimalismScore +
        s.modernismScore;
    return {
        recognizability: s.brandRecognitionScore,
        scalability: s.scalabilityScore,
        balance: prompt.dna.visualWeight.length > 0 ? 8 : 6,
        contrast: prompt.selectedPrinciples.some((p) => p.id.includes('contrast')) ? 9 : 7,
        simplicity: s.minimalismScore,
        modernity: s.modernismScore,
        registrability: s.minimalismScore > 7 && s.geometryScore > 6 ? 8 : 6,
        overallScore: Math.round((overallScore / 6) * 10) / 10,
        feedback,
        suggestedMutations: suggestMutations(prompt),
    };
}
//# sourceMappingURL=prompt-evolution.js.map