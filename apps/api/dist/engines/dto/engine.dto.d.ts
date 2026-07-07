export declare class BrandDNARequestDto {
    companyName: string;
    industry: string;
    values?: string[];
    targetAudience?: string;
    personality?: 'bold' | 'refined' | 'playful' | 'technical' | 'luxurious' | 'approachable';
    markType?: 'wordmark' | 'lettermark' | 'combination';
    typographyStyle?: 'standard' | 'constructed';
}
export declare class LetterDNARequestDto {
    text: string;
    style?: 'geometric' | 'humanist' | 'grotesque' | 'monoline' | 'custom';
}
export declare class GeometryRequestDto {
    industry: string;
    preferredShapes?: string[];
    complexity?: 'minimal' | 'medium' | 'high';
}
export declare class ReverseAnalysisRequestDto {
    description: string;
    observedShapes?: string[];
    observedColors?: number;
}
export declare class FullPipelineRequestDto {
    companyName: string;
    industry: string;
    variationCount?: number;
    markType?: 'symbol' | 'wordmark' | 'combination' | 'emblem';
}
export declare class SVGBlueprintRequestDto {
    primitiveIds: string[];
}
