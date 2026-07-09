import { Injectable } from '@nestjs/common';
import type { ComposedPrompt, ImageGenerationResult } from '@logo-platform/shared';
import { normalizeBrandName } from '@logo-platform/shared';
import { generateImages, getAvailableProviders } from '@logo-platform/image-generator';
import type { GenerateFromComposedPromptDto, GenerateImageDto } from './dto/generate-image.dto';
import { persistImageUrl } from './image-storage';

@Injectable()
export class ImagesService {
  getProviders() {
    return getAvailableProviders();
  }

  async generate(dto: GenerateImageDto) {
    const result = await generateImages({
      prompt: dto.prompt,
      companyName: normalizeBrandName(dto.companyName),
      provider: dto.provider,
      size: dto.size,
      count: dto.count ?? 1,
    });
    return this.toPersistedResult(result);
  }

  async generateFromComposedPrompt(dto: GenerateFromComposedPromptDto) {
    const result = await generateImages({
      prompt: dto.text,
      companyName: normalizeBrandName(dto.companyName),
      provider: dto.provider,
      size: dto.size,
      count: 1,
      markType: dto.markType,
      typographyStyle: dto.typographyStyle,
    });
    return this.toPersistedResult(result);
  }

  async generateFromPromptObject(prompt: ComposedPrompt, provider?: GenerateImageDto['provider']) {
    const result = await generateImages({
      prompt: prompt.text,
      companyName: prompt.industry,
      provider,
      count: 1,
    });
    return this.toPersistedResult(result);
  }

  private toPersistedResult(result: ImageGenerationResult): ImageGenerationResult {
    return {
      ...result,
      images: result.images.map((image) => ({
        ...image,
        url: persistImageUrl(image.url, image.id),
      })),
    };
  }
}
