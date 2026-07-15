import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { normalizeBrandName } from '@logo-platform/shared';
import { Public } from '../auth/public.decorator';
import { GeneratePromptDto } from '../prompts/dto/generate-prompt.dto';
import { PromptsService } from '../prompts/prompts.service';
import { RateLimitService } from '../rate-limit/rate-limit.service';

@Controller('guest')
export class GuestController {
  constructor(
    private readonly prompts: PromptsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Public()
  @Post('prompts/generate')
  async generatePrompt(@Body() body: GeneratePromptDto, @Req() request: Request) {
    await this.rateLimit.consume(`guest-prompt:${request.ip}`, 3, 24 * 60 * 60);
    return this.prompts.generateEphemeral({
      industry: body.industry,
      companyName: normalizeBrandName(body.companyName),
      variationCount: Math.min(3, body.variationCount ?? 3),
      inspirationMode: body.inspirationMode as never,
      preferredEra: body.preferredEra as never,
      minimalismLevel: body.minimalismLevel,
      markType: body.markType,
      typographyStyle: body.typographyStyle,
      useBrain: false,
    });
  }
}
