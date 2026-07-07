import type { ImageProvider, ImageSize } from '@logo-platform/shared';
export declare class GenerateImageDto {
    prompt: string;
    companyName?: string;
    provider?: ImageProvider;
    size?: ImageSize;
    count?: number;
}
export declare class GenerateFromComposedPromptDto {
    text: string;
    industry?: string;
    companyName?: string;
    provider?: ImageProvider;
    size?: ImageSize;
}
