import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
export declare class PromptsController {
    private readonly promptsService;
    private lastResult;
    constructor(promptsService: PromptsService);
    generate(dto: GeneratePromptDto): {
        prompts: import("@logo-platform/shared").ComposedPrompt[];
        recommendations: unknown;
        bestPrompt: import("@logo-platform/shared").ComposedPrompt;
    };
    recommend(industry: string): {
        industry: string;
        recommendations: import("@logo-platform/shared").Recommendation[];
        suggestedPrinciples: {
            id: string;
            name: string;
            category: import("@logo-platform/shared").DesignRuleCategory;
        }[];
        dna: import("@logo-platform/shared").LogoDNA;
    };
    critique(id: string): import("@logo-platform/shared").DesignCriticResult | {
        error: string;
    };
    evolve(id: string): import("@logo-platform/shared").ComposedPrompt[] | {
        error: string;
    };
}
