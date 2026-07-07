export interface LetterDNAInput {
    text: string;
    style?: 'geometric' | 'humanist' | 'grotesque' | 'monoline' | 'custom';
    emphasis?: 'first' | 'last' | 'middle' | 'all' | 'none';
}
export interface LetterAnalysis {
    character: string;
    index: number;
    formType: 'vertical' | 'horizontal' | 'diagonal' | 'curved' | 'compound' | 'symmetric';
    strokeCount: number;
    negativeSpacePotential: number;
    monogramCandidate: boolean;
    constructionHint: string;
    psychologyTag: string;
}
export interface LetterDNAProfile {
    text: string;
    letters: LetterAnalysis[];
    monogramOptions: string[];
    ligatureOpportunities: string[];
    balanceAxis: 'vertical' | 'horizontal' | 'diagonal';
    recommendedWeight: 'light' | 'regular' | 'bold' | 'black';
    counterSpaceStrategy: string;
    customLetterformIdeas: string[];
}
export declare function analyzeLetterDNA(input: LetterDNAInput): LetterDNAProfile;
//# sourceMappingURL=letter-dna.engine.d.ts.map