import type { Era, TypographyStyle } from '@logo-platform/shared';
import { analyzeLetterDNA } from './letter-dna.engine';
import { analyzeTypography } from './typography-intelligence.engine';
export interface BrandDNAInput {
    companyName: string;
    industry: string;
    values?: string[];
    targetAudience?: string;
    personality?: 'bold' | 'refined' | 'playful' | 'technical' | 'luxurious' | 'approachable';
    preferredEra?: Era;
    markType?: 'wordmark' | 'lettermark' | 'combination';
    typographyStyle?: TypographyStyle;
}
export interface BrandDNAProfile {
    companyName: string;
    industry: string;
    personality: NonNullable<BrandDNAInput['personality']>;
    markType: NonNullable<BrandDNAInput['markType']>;
    typographyStyle: TypographyStyle;
    visualTraits: {
        typography: string[];
        letterformStyle: string[];
        composition: string[];
        color: string[];
        complexity: 'minimal' | 'medium' | 'high';
        era: Era;
    };
    typography: ReturnType<typeof analyzeTypography>;
    letterDNA: ReturnType<typeof analyzeLetterDNA>;
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