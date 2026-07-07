import type { ComposedPrompt, DesignCriticResult, EvolutionMutation } from '@logo-platform/shared';
export declare function evolvePrompt(weakPrompt: ComposedPrompt, maxAttempts?: number): ComposedPrompt[];
export declare function suggestMutations(prompt: ComposedPrompt): EvolutionMutation[];
export declare function critiqueDesign(prompt: ComposedPrompt): DesignCriticResult;
//# sourceMappingURL=prompt-evolution.d.ts.map