import type { ComposedPrompt, DesignCriticResult } from '@logo-platform/shared';
export interface LogoCriticInput {
    prompt?: ComposedPrompt;
    svgContent?: string;
    description?: string;
}
export interface ExtendedCriticResult extends DesignCriticResult {
    trademarkRisk: 'low' | 'medium' | 'high';
    scalabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    modernismGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    industryFit: number;
    improvementPlan: {
        priority: number;
        action: string;
        impact: string;
    }[];
}
export declare function critiqueLogo(input: LogoCriticInput): ExtendedCriticResult;
//# sourceMappingURL=logo-critic.engine.d.ts.map