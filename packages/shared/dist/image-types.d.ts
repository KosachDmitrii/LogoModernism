export type ImageProvider = 'openai' | 'mock';
export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024';
import type { LogoMarkType, TypographyStyle } from './types';
export interface ImageGenerationRequest {
    prompt: string;
    provider?: ImageProvider;
    size?: ImageSize;
    count?: number;
    companyName?: string;
    markType?: LogoMarkType;
    typographyStyle?: TypographyStyle;
}
export interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    provider: ImageProvider;
    model?: string;
    revisedPrompt?: string;
    width: number;
    height: number;
    createdAt: string;
}
export interface ImageGenerationResult {
    images: GeneratedImage[];
    provider: ImageProvider;
    model?: string;
    enhancedPrompt: string;
}
//# sourceMappingURL=image-types.d.ts.map