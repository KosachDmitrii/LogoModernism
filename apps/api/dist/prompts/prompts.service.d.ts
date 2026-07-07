import type { PromptGenerationRequest } from '@logo-platform/shared';
import { runPromptPipeline } from '@logo-platform/prompt-engine';
export declare class PromptsService {
    generate(request: PromptGenerationRequest): import("@logo-platform/prompt-engine").PipelineResult;
    critique(promptId: string, pipelineResult: ReturnType<typeof runPromptPipeline>): import("@logo-platform/shared").DesignCriticResult;
    evolve(promptId: string, pipelineResult: ReturnType<typeof runPromptPipeline>): import("@logo-platform/shared").ComposedPrompt[];
}
