import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PromptsService } from './prompts.service';
import { GeneratePromptDto } from './dto/generate-prompt.dto';
import { GeneratePromptLogoDto } from './dto/generate-prompt-logo.dto';
import { PromptFeedbackDto } from './dto/prompt-feedback.dto';
import { PromptSaveDto } from './dto/prompt-save.dto';
import { LogoFeedbackDto } from './dto/logo-feedback.dto';
import { LogoTagsDto } from './dto/logo-tags.dto';
import type { PromptGenerationRequest } from '@logo-platform/shared';
import {
  JOB_PAYLOAD_VERSION,
  normalizeBrandName,
  QUEUE_NAMES,
  resolvePromptGenerateIntent,
  USAGE_OPERATION_COSTS,
  USAGE_OPERATIONS,
} from '@logo-platform/shared';
import { Tenant, type TenantScope } from '../auth/tenant-context';
import { QueueService } from '../queue/queue.service';
import { isAsyncQueueEnabled } from '../queue/queue.config';
import { ALL_MEMBERS, CONTRIBUTORS, Roles } from '../auth/roles.decorator';
import { UsageService } from '../usage/usage.service';

type PipelineOutput = Awaited<ReturnType<PromptsService['generate']>>;

@Controller('prompts')
export class PromptsController {
  private readonly logger = new Logger(PromptsController.name);
  private lastResult: PipelineOutput | null = null;

  constructor(
    private readonly promptsService: PromptsService,
    private readonly queues: QueueService,
    private readonly usage: UsageService,
  ) {}

  @Post('generate')
  @Roles(...CONTRIBUTORS)
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Body() dto: GeneratePromptDto,
    @Query('intent') queryIntent?: string,
    @Tenant() tenant?: TenantScope,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const intent = resolvePromptGenerateIntent(dto.intent, queryIntent);
    const request: PromptGenerationRequest = {
      industry: dto.industry,
      companyName: normalizeBrandName(dto.companyName),
      variationCount: dto.variationCount ?? 5,
      inspirationMode: dto.inspirationMode as PromptGenerationRequest['inspirationMode'],
      preferredEra: dto.preferredEra as PromptGenerationRequest['preferredEra'],
      minimalismLevel: dto.minimalismLevel,
      analysisPrincipleIds: dto.analysisPrincipleIds,
      catalogReferenceIds: dto.catalogReferenceIds,
      autoCatalogReferences: dto.autoCatalogReferences,
      rebusWordmark: dto.rebusWordmark,
      catalogNarrative: dto.catalogNarrative,
      markType: dto.markType,
      typographyStyle: dto.typographyStyle,
      briefContext: dto.briefContext,
      useBrain: dto.useBrain,
      preferredTerritoryId: dto.preferredTerritoryId,
      intent,
    };

    const startedAt = Date.now();
    const operationIdempotencyKey =
      idempotencyKey ??
      `prompt:${tenant?.organizationId ?? 'unscoped'}:${randomUUID()}`;
    this.logger.log(
      JSON.stringify({
        event: 'prompt.generate.start',
        intent,
        industry: request.industry,
        companyName: request.companyName ?? null,
        variationCount: request.variationCount,
        preferredTerritoryId: request.preferredTerritoryId ?? null,
      }),
    );

    let reservation:
      | Awaited<ReturnType<UsageService['reserve']>>
      | undefined;
    try {
      reservation = await this.usage.reserve({
        tenant: tenant!,
        operationKey: USAGE_OPERATIONS.promptCompose,
        credits: USAGE_OPERATION_COSTS[USAGE_OPERATIONS.promptCompose],
        idempotencyKey: operationIdempotencyKey,
      });
      if (isAsyncQueueEnabled()) {
        const submission = await this.queues.enqueue(QUEUE_NAMES.prompt, {
          version: JOB_PAYLOAD_VERSION,
          idempotencyKey: operationIdempotencyKey,
          requestedAt: new Date().toISOString(),
          organizationId: tenant?.organizationId,
          projectId: tenant?.projectId,
          requestedBy: tenant?.userId,
          usageReservationId: reservation.id,
          request,
        });
        reservation = undefined;
        this.logger.log(
          JSON.stringify({
            event: 'prompt.generate.queued',
            intent,
            industry: request.industry,
            durationMs: Date.now() - startedAt,
            jobId: submission.id,
          }),
        );
        return { ...submission, status: 'queued' as const };
      }

      const response = await this.promptsService.generateResponse(request, tenant);
      await this.usage.commit(reservation.id);
      reservation = undefined;
      this.logger.log(
        JSON.stringify({
          event: 'prompt.generate.complete',
          intent,
          industry: request.industry,
          durationMs: Date.now() - startedAt,
          promptCount: response.prompts.length,
          brainPowered: 'brainPowered' in response && response.brainPowered,
        }),
      );
      return { ...response, meta: { intent } };
    } catch (error) {
      if (reservation) {
        await this.usage.release(reservation.id).catch(() => undefined);
      }
      this.logger.error(
        JSON.stringify({
          event: 'prompt.generate.error',
          intent,
          industry: request.industry,
          durationMs: Date.now() - startedAt,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
      throw error;
    }
  }

  @Get('recommend/:industry')
  @Roles(...CONTRIBUTORS)
  async recommend(@Param('industry') industry: string, @Tenant() tenant?: TenantScope) {
    const reservation = await this.usage.reserve({
      tenant: tenant!,
      operationKey: USAGE_OPERATIONS.promptRecommend,
      credits: USAGE_OPERATION_COSTS[USAGE_OPERATIONS.promptRecommend],
      idempotencyKey: `recommend:${tenant!.organizationId}:${randomUUID()}`,
    });
    try {
      const result = await this.promptsService.generate(
        {
          industry,
          variationCount: 1,
        },
        tenant,
      );
      await this.usage.commit(reservation.id);
      return {
        industry,
        recommendations: result.recommendations,
        suggestedPrinciples: result.bestPrompt.selectedPrinciples.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
        })),
        dna: result.bestPrompt.dna,
      };
    } catch (error) {
      await this.usage.release(reservation.id).catch(() => undefined);
      throw error;
    }
  }

  @Get('saved')
  @Roles(...ALL_MEMBERS)
  listSaved(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Tenant() tenant?: TenantScope,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.promptsService.listSavedPrompts(
      parsedLimit && Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      cursor,
      tenant,
    );
  }

  @Post(':id/save')
  @Roles(...CONTRIBUTORS)
  toggleSave(
    @Param('id') id: string,
    @Body() body: PromptSaveDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.promptsService.togglePromptSave(id, body.saved, idempotencyKey, tenant);
  }

  @Post(':id/logos/:logoId/feedback')
  @Roles(...CONTRIBUTORS)
  submitLogoFeedback(
    @Param('id') id: string,
    @Param('logoId') logoId: string,
    @Body() body: LogoFeedbackDto,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.promptsService.submitLogoFeedback(id, logoId, body, tenant);
  }

  @Post(':id/logos/:logoId/tags')
  @Roles(...CONTRIBUTORS)
  submitLogoTags(
    @Param('id') id: string,
    @Param('logoId') logoId: string,
    @Body() body: LogoTagsDto,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.promptsService.submitLogoTags(id, logoId, body, tenant);
  }

  @Get(':id')
  @Roles(...ALL_MEMBERS)
  getPrompt(@Param('id') id: string, @Tenant() tenant?: TenantScope) {
    return this.promptsService.getPrompt(id, tenant);
  }

  @Post(':id/logos/generate')
  @Roles(...CONTRIBUTORS)
  @HttpCode(HttpStatus.ACCEPTED)
  async generateLogo(
    @Param('id') id: string,
    @Body() body: GeneratePromptLogoDto,
    @Tenant() tenant?: TenantScope,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (body.provider === 'mock') {
      return this.promptsService.generateLogoForPrompt(id, body, tenant);
    }
    let reservation:
      | Awaited<ReturnType<UsageService['reserve']>>
      | undefined = await this.usage.reserve({
      tenant: tenant!,
      operationKey: USAGE_OPERATIONS.imageGenerate,
      credits: USAGE_OPERATION_COSTS[USAGE_OPERATIONS.imageGenerate],
      idempotencyKey:
        idempotencyKey ??
        `prompt-logo:${tenant!.organizationId}:${id}:${randomUUID()}`,
    });
    try {
      const result = await this.promptsService.generateLogoForPrompt(
        id,
        body,
        tenant,
        reservation.id,
      );
      if ('status' in result && result.status === 'queued') {
        reservation = undefined;
      } else {
        await this.usage.commit(reservation.id);
        reservation = undefined;
      }
      return result;
    } catch (error) {
      if (reservation) {
        await this.usage.release(reservation.id).catch(() => undefined);
      }
      throw error;
    }
  }

  @Post(':id/feedback')
  @Roles(...CONTRIBUTORS)
  submitFeedback(
    @Param('id') id: string,
    @Body() body: PromptFeedbackDto,
    @Tenant() tenant?: TenantScope,
  ) {
    return this.promptsService.submitPromptFeedback(id, body.signalType, tenant);
  }

  @Post(':id/critique')
  @Roles(...CONTRIBUTORS)
  critique(@Param('id') id: string) {
    if (!this.lastResult) {
      return { error: 'Generate prompts first' };
    }
    return this.promptsService.critique(id, this.lastResult);
  }

  @Post(':id/evolve')
  @Roles(...CONTRIBUTORS)
  evolve(@Param('id') id: string) {
    if (!this.lastResult) {
      return { error: 'Generate prompts first' };
    }
    return this.promptsService.evolve(id, this.lastResult);
  }
}
