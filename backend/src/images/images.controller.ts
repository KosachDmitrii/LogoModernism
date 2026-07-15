import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { USAGE_OPERATIONS } from '@logo-platform/shared';
import type { Response } from 'express';
import { ImagesService } from './images.service';
import { GenerateFromComposedPromptDto, GenerateImageDto } from './dto/generate-image.dto';
import { resolveGeneratedFile } from './image-storage';
import { ALL_MEMBERS, CONTRIBUTORS, Roles } from '../auth/roles.decorator';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { UsageService } from '../usage/usage.service';

@Controller('images')
export class ImagesController {
  constructor(
    private readonly imagesService: ImagesService,
    private readonly usage: UsageService,
  ) {}

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
  async generate(
    @Body() dto: GenerateImageDto,
    @Tenant() tenant?: TenantScope,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.withUsage(
      dto.provider,
      tenant!,
      idempotencyKey,
      dto.count ?? 1,
      () => this.imagesService.generate(dto),
    );
  }

  @Post('generate-from-prompt')
  @Roles(...CONTRIBUTORS)
  async generateFromPrompt(
    @Body() dto: GenerateFromComposedPromptDto,
    @Tenant() tenant?: TenantScope,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.withUsage(
      dto.provider,
      tenant!,
      idempotencyKey,
      1,
      () => this.imagesService.generateFromComposedPrompt(dto),
    );
  }

  private async withUsage<T>(
    provider: string | undefined,
    tenant: TenantScope,
    idempotencyKey: string | undefined,
    units: number,
    action: () => Promise<T>,
  ): Promise<T> {
    if (provider === 'mock') return action();
    const reservation = await this.usage.reserve({
      tenant,
      operationKey: USAGE_OPERATIONS.imageGenerate,
      units,
      idempotencyKey:
        idempotencyKey ??
        `image:${tenant.organizationId}:${randomUUID()}`,
    });
    try {
      const result = await action();
      await this.usage.commit(reservation.id);
      return result;
    } catch (error) {
      await this.usage.release(reservation.id).catch(() => undefined);
      throw error;
    }
  }
}
