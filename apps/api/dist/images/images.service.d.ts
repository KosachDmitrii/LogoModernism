import type { ComposedPrompt, ImageGenerationResult } from '@logo-platform/shared';
import type { GenerateFromComposedPromptDto, GenerateImageDto } from './dto/generate-image.dto';
export declare class ImagesService {
    getProviders(): {
        id: import("@logo-platform/shared").ImageProvider;
        name: string;
        available: boolean;
    }[];
    generate(dto: GenerateImageDto): Promise<ImageGenerationResult>;
    generateFromComposedPrompt(dto: GenerateFromComposedPromptDto): Promise<ImageGenerationResult>;
    generateFromPromptObject(prompt: ComposedPrompt, provider?: GenerateImageDto['provider']): Promise<ImageGenerationResult>;
    private toPersistedResult;
}
