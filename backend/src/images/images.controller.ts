import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ImagesService } from './images.service';
import { GenerateFromComposedPromptDto, GenerateImageDto } from './dto/generate-image.dto';
import { resolveGeneratedFile } from './image-storage';
import { ALL_MEMBERS, CONTRIBUTORS, Roles } from '../auth/roles.decorator';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get('providers')
  @Roles(...ALL_MEMBERS)
  getProviders() {
    return { providers: this.imagesService.getProviders() };
  }

  @Get('files/:filename')
  @Roles(...ALL_MEMBERS)
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = resolveGeneratedFile(filename);
    if (!filePath) {
      throw new NotFoundException('Image not found');
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (filename.endsWith('.svg') || filename.endsWith('.svg+xml')) {
      res.type('image/svg+xml');
    }
    return res.sendFile(filePath);
  }

  @Post('generate')
  @Roles(...CONTRIBUTORS)
  async generate(@Body() dto: GenerateImageDto) {
    return this.imagesService.generate(dto);
  }

  @Post('generate-from-prompt')
  @Roles(...CONTRIBUTORS)
  async generateFromPrompt(@Body() dto: GenerateFromComposedPromptDto) {
    return this.imagesService.generateFromComposedPrompt(dto);
  }
}
