import type { ComposedPrompt } from '@logo-platform/shared';
export interface EvolutionInput {
    prompt: ComposedPrompt;
    maxGenerations?: number;
    targetScore?: number;
    strategy?: 'aggressive' | 'conservative' | 'exploratory';
}
export interface EvolutionGeneration {
    generation: number;
    prompts: ComposedPrompt[];
    bestScore: number;
    mutationsApplied: string[];
}
export interface EvolutionResult {
    generations: EvolutionGeneration[];
    finalBest: ComposedPrompt;
    totalImprovement: number;
    converged: boolean;
}
export declare function runEvolution(input: EvolutionInput): EvolutionResult;
//# sourceMappingURL=evolution.engine.d.ts.map