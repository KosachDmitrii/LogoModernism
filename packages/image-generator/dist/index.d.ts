import type { ImageGenerationRequest, ImageGenerationResult, ImageProvider } from '@logo-platform/shared';
export * from './prompt-enhancer';
export declare function resolveProvider(requested?: ImageProvider): ImageProvider;
export declare function generateImages(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
export declare function getAvailableProviders(): {
    id: ImageProvider;
    name: string;
    available: boolean;
}[];
//# sourceMappingURL=index.d.ts.map