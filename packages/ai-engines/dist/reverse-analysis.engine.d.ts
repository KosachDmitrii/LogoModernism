import type { LogoDNA } from '@logo-platform/shared';
export interface ReverseAnalysisInput {
    description: string;
    observedShapes?: string[];
    observedColors?: number;
    observedStyle?: string;
}
export interface ReverseAnalysisResult {
    estimatedDNA: LogoDNA;
    matchedReferences: {
        id: string;
        name: string;
        similarity: number;
    }[];
    matchedPrinciples: {
        id: string;
        name: string;
        confidence: number;
    }[];
    eraEstimate: string;
    complexityEstimate: 'minimal' | 'medium' | 'high';
    constructionHypothesis: string[];
    modernismScore: number;
}
export declare function reverseAnalyzeLogo(input: ReverseAnalysisInput): ReverseAnalysisResult;
//# sourceMappingURL=reverse-analysis.engine.d.ts.map