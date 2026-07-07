export type DesignRuleCategory = 'geometry' | 'construction' | 'composition' | 'grid' | 'typography' | 'stroke' | 'color' | 'symmetry' | 'negative_space' | 'era' | 'industry' | 'complexity' | 'effects' | 'rendering' | 'mark_type' | 'balance' | 'inspiration' | 'symmetry';
export type Era = 'swiss' | 'bauhaus' | 'international_style' | 'corporate_identity' | '1960s' | '1970s' | 'mid_century';
export interface DesignRule {
    id: string;
    name: string;
    category: DesignRuleCategory;
    description: string;
    examples: string[];
    promptFragment: string;
    weight: number;
    compatibility: string[];
    antiPatterns: string[];
    tags: string[];
    era?: Era[];
    industries?: string[];
}
export interface KnowledgeGraphEdge {
    from: string;
    to: string;
    relation: 'works_with' | 'requires' | 'conflicts_with' | 'enhances';
}
export interface LogoReference {
    id: string;
    name: string;
    designer?: string;
    year?: number;
    country?: string;
    industry: string;
    construction: string[];
    shape: string[];
    geometry: string[];
    composition: string[];
    grid: string[];
    negativeSpace: string[];
    typography: string[];
    stroke: string[];
    weight: string[];
    symmetry: string[];
    colorCount: number;
    visualComplexity: 'minimal' | 'medium' | 'high';
    minimalismLevel: number;
    era: Era;
    keywords: string[];
    principleIds: string[];
}
export interface LogoDNA {
    geometry: string[];
    construction: string[];
    balance: string[];
    complexity: 'minimal' | 'medium' | 'high';
    era: Era;
    typography: string[];
    recognition: number;
    minimalism: number;
    visualWeight: string[];
    harmony: string[];
}
export interface PromptScores {
    modernismScore: number;
    swissScore: number;
    minimalismScore: number;
    geometryScore: number;
    readabilityScore: number;
    scalabilityScore: number;
    brandRecognitionScore: number;
    promptQuality: number;
}
export interface ComposedPrompt {
    id: string;
    text: string;
    industry: string;
    selectedPrinciples: DesignRule[];
    scores: PromptScores;
    dna: LogoDNA;
    metadata: {
        era: Era;
        variationIndex?: number;
        inspirationMode?: string;
    };
}
export interface PromptGenerationRequest {
    industry: string;
    companyName?: string;
    variationCount?: number;
    inspirationMode?: InspirationMode;
    preferredEra?: Era;
    minimalismLevel?: number;
}
export type InspirationMode = 'swiss' | 'bauhaus' | 'ibm' | 'nasa' | 'lufthansa' | 'braun' | 'cbs' | 'abc' | 'olivetti' | 'westinghouse';
export interface Recommendation {
    principleId: string;
    name: string;
    reason: string;
    confidence: number;
}
export interface PromptTemplate {
    id: string;
    name: string;
    industry?: string;
    era?: Era;
    tags: string[];
    principleIds: string[];
    templateFragments: string[];
}
export interface SearchFilters {
    query?: string;
    grid?: string[];
    negativeSpace?: boolean;
    shape?: string[];
    era?: Era[];
    markType?: string[];
    industry?: string[];
    minimalism?: number;
    tags?: string[];
}
export interface EvolutionMutation {
    field: keyof LogoDNA | 'shape' | 'grid' | 'stroke' | 'hierarchy';
    from: string[];
    to: string[];
    reason: string;
}
export interface DesignCriticResult {
    recognizability: number;
    scalability: number;
    balance: number;
    contrast: number;
    simplicity: number;
    modernity: number;
    registrability: number;
    overallScore: number;
    feedback: string[];
    suggestedMutations: EvolutionMutation[];
}
//# sourceMappingURL=types.d.ts.map