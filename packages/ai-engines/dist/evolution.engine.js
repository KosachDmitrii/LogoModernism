"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runEvolution = runEvolution;
const prompt_engine_1 = require("@logo-platform/prompt-engine");
function runEvolution(input) {
    const maxGen = input.maxGenerations ?? 3;
    const target = input.targetScore ?? 8;
    const generations = [];
    let current = input.prompt;
    let initialScore = current.scores.promptQuality;
    for (let gen = 0; gen < maxGen; gen++) {
        const attempts = input.strategy === 'aggressive' ? 5 : input.strategy === 'exploratory' ? 4 : 2;
        const evolved = (0, prompt_engine_1.evolvePrompt)(current, attempts);
        const mutations = (0, prompt_engine_1.suggestMutations)(current).map((m) => m.reason);
        const bestScore = evolved[0]?.scores.promptQuality ?? current.scores.promptQuality;
        generations.push({
            generation: gen + 1,
            prompts: evolved,
            bestScore,
            mutationsApplied: mutations,
        });
        if (evolved[0] && evolved[0].scores.promptQuality > current.scores.promptQuality) {
            current = evolved[0];
        }
        if (current.scores.promptQuality >= target)
            break;
    }
    const finalBest = generations.length
        ? generations[generations.length - 1].prompts[0] ?? current
        : current;
    return {
        generations,
        finalBest,
        totalImprovement: finalBest.scores.promptQuality - initialScore,
        converged: finalBest.scores.promptQuality >= target,
    };
}
//# sourceMappingURL=evolution.engine.js.map