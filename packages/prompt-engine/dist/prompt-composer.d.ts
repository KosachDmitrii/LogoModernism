import type { ComposedPrompt, DesignRule, LogoDNA } from '@logo-platform/shared';
export interface ComposeInput {
    industry: string;
    companyName?: string;
    principles: DesignRule[];
    dna: LogoDNA;
    inspirationMode?: string;
    variationIndex?: number;
}
export declare function composePrompt(input: ComposeInput): ComposedPrompt;
export declare function composePromptVariations(baseInput: Omit<ComposeInput, 'variationIndex'>, count: number, selectRules: (seed: number) => {
    principles: DesignRule[];
    dna: LogoDNA;
}): ComposedPrompt[];
export declare function buildPromptFromTemplate(templateFragments: string[], principles: DesignRule[], industry: string, dna: LogoDNA): ComposedPrompt;
//# sourceMappingURL=prompt-composer.d.ts.map