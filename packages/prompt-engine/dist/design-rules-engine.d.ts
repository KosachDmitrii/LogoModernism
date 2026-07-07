import type { DesignRule, Era, InspirationMode, LogoDNA, Recommendation } from '@logo-platform/shared';
declare const INSPIRATION_MAP: Record<InspirationMode, string[]>;
declare const CATEGORY_ORDER: DesignRule['category'][];
export interface RuleSelectionInput {
    industry: string;
    companyName?: string;
    preferredEra?: Era;
    minimalismLevel?: number;
    inspirationMode?: InspirationMode;
    variationSeed?: number;
    /** Locked-in from Brand DNA / Pipeline / Knowledge Graph analysis */
    analysisPrincipleIds?: string[];
    /** Logo catalog reference IDs (Müller Logo Modernism) */
    catalogReferenceIds?: string[];
    catalogNarrative?: string;
}
export interface RuleSelectionResult {
    principles: DesignRule[];
    dna: LogoDNA;
    recommendations: Recommendation[];
    conflicts: string[][];
    catalogInspiration?: string[];
}
export declare function selectDesignRules(input: RuleSelectionInput): RuleSelectionResult;
export { INSPIRATION_MAP, CATEGORY_ORDER };
//# sourceMappingURL=design-rules-engine.d.ts.map