import type { Response } from 'express';
import { ImagesService } from './images.service';
import { GenerateFromComposedPromptDto, GenerateImageDto } from './dto/generate-image.dto';
export declare class ImagesController {
    private readonly imagesService;
    constructor(imagesService: ImagesService);
    getProviders(): {
        providers: {
            id: import("@logo-platform/shared").ImageProvider;
            name: string;
            available: boolean;
        }[];
    };
    serveFile(filename: string, res: Response): void;
    generate(dto: GenerateImageDto): Promise<import("@logo-platform/shared").ImageGenerationResult>;
    generateFromPrompt(dto: GenerateFromComposedPromptDto): Promise<import("@logo-platform/shared").ImageGenerationResult>;
}
