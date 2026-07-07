export interface CompositionInput {
    markType: 'symbol' | 'wordmark' | 'combination' | 'emblem';
    industry: string;
    elementCount?: number;
    hasNegativeSpace?: boolean;
}
export interface CompositionLayout {
    id: string;
    name: string;
    description: string;
    alignment: string;
    spacing: string;
    balance: string;
    score: number;
    principleIds: string[];
}
export interface CompositionAIResult {
    recommendedLayout: CompositionLayout;
    alternatives: CompositionLayout[];
    goldenRatioApplied: boolean;
    negativeSpaceStrategy?: string;
    visualHierarchy: string[];
}
export declare function analyzeComposition(input: CompositionInput): CompositionAIResult;
//# sourceMappingURL=composition-ai.engine.d.ts.map