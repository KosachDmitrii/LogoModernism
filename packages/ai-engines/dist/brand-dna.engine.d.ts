import type { Era } from '@logo-platform/shared';
export interface BrandDNAInput {
    companyName: string;
    industry: string;
    values?: string[];
    targetAudience?: string;
    personality?: 'bold' | 'refined' | 'playful' | 'technical' | 'luxurious' | 'approachable';
    preferredEra?: Era;
}
export interface BrandDNAProfile {
    companyName: string;
    industry: string;
    personality: BrandDNAInput['personality'];
    visualTraits: {
        geometry: string[];
        construction: string[];
        composition: string[];
        typography: string[];
        color: string[];
        complexity: 'minimal' | 'medium' | 'high';
        era: Era;
    };
    psychologyProfile: {
        primaryEmotion: string;
        trustLevel: number;
        innovationLevel: number;
        luxuryLevel: number;
        approachability: number;
    };
    principleIds: string[];
    narrative: string;
    constraints: string[];
}
export declare function analyzeBrandDNA(input: BrandDNAInput): BrandDNAProfile;
//# sourceMappingURL=brand-dna.engine.d.ts.map