import type { ComposedPrompt } from '@logo-platform/shared';
export declare function slimPrompt(prompt: ComposedPrompt): ComposedPrompt;
export declare function slimPipelineResult(result: {
    prompts: ComposedPrompt[];
    recommendations: unknown;
    bestPrompt: ComposedPrompt;
}): {
    prompts: ComposedPrompt[];
    recommendations: unknown;
    bestPrompt: ComposedPrompt;
};
