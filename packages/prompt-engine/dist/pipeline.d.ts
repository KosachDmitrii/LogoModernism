import type { ComposedPrompt, PromptGenerationRequest } from '@logo-platform/shared';
import { selectDesignRules } from './design-rules-engine';
export interface PipelineResult {
    prompts: ComposedPrompt[];
    recommendations: ReturnType<typeof selectDesignRules>['recommendations'];
    bestPrompt: ComposedPrompt;
}
export declare function runPromptPipeline(request: PromptGenerationRequest): PipelineResult;
export declare function generateFromTemplate(templateId: string, industry: string): ComposedPrompt | null;
export { selectDesignRules } from './design-rules-engine';
export { composePrompt, composePromptVariations } from './prompt-composer';
export { optimizePrompt, detectPromptIssues } from './prompt-optimizer';
export { scorePrompt } from './prompt-scorer';
export { evolvePrompt, critiqueDesign, suggestMutations } from './prompt-evolution';
//# sourceMappingURL=pipeline.d.ts.map