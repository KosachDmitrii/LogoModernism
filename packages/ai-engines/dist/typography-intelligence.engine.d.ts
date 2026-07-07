export interface TypographyInput {
    companyName: string;
    industry: string;
    style?: 'swiss' | 'bauhaus' | 'corporate' | 'custom';
    markType?: 'wordmark' | 'lettermark' | 'combination';
}
export interface TypographyRecommendation {
    category: string;
    name: string;
    principleId: string;
    score: number;
    characteristics: string[];
    pairingSuggestion?: string;
}
export interface TypographyIntelligenceResult {
    primaryRecommendation: TypographyRecommendation;
    alternatives: TypographyRecommendation[];
    hierarchy: {
        level: string;
        weight: string;
        tracking: string;
    }[];
    constructionRules: string[];
    antiPatterns: string[];
}
export declare function analyzeTypography(input: TypographyInput): TypographyIntelligenceResult;
//# sourceMappingURL=typography-intelligence.engine.d.ts.map