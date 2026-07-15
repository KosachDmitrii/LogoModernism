import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@logo-platform/database';
import type { ComposedPrompt, GeneratedImage, LogoFeedback, PromptGenerationRequest } from '@logo-platform/shared';
import { prisma } from '@logo-platform/database';
import type { TenantScope } from '../auth/tenant-context';

export const MAX_LOGOS_PER_PROMPT = 3;
/** @deprecated */
export type PromptFeedback = 'LIKE' | 'DISLIKE';

function parseFeedback(value: unknown): PromptFeedback | undefined {
  return value === 'LIKE' || value === 'DISLIKE' ? value : undefined;
}

function parseLogoFeedback(value: unknown): LogoFeedback | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as LogoFeedback;
  const hasRating = typeof row.score === 'number';
  const hasTags = Boolean(row.workedTags?.length || row.missedTags?.length);
  if (!hasRating && !hasTags) return undefined;
  return row;
}

function parseLogos(value: unknown): GeneratedImage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is GeneratedImage =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as GeneratedImage).id === 'string' &&
        typeof (item as GeneratedImage).url === 'string',
    )
    .map((item) => ({
      ...item,
      feedback: parseLogoFeedback((item as GeneratedImage).feedback),
    }));
}

function parseCursor(cursor?: string): { savedAt: Date; id: string } | undefined {
  if (!cursor) return undefined;
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      savedAt?: string;
      id?: string;
    };
    const savedAt = new Date(value.savedAt ?? '');
    if (!value.id || Number.isNaN(savedAt.getTime())) throw new Error('invalid cursor');
    return { savedAt, id: value.id };
  } catch {
    throw new BadRequestException('Invalid saved prompts cursor');
  }
}

function encodeCursor(savedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ savedAt: savedAt.toISOString(), id })).toString('base64url');
}

@Injectable()
export class PromptRecordsService {
  async saveBatch(
    request: PromptGenerationRequest,
    result: { prompts: ComposedPrompt[]; recommendations: unknown; bestPrompt: ComposedPrompt },
    tenant?: TenantScope,
  ) {
    return prisma.$transaction(async (tx) => {
      const run = await tx.promptRun.create({
        data: {
          industry: request.industry,
          projectId: tenant?.projectId,
          companyName: request.companyName,
          request: request as object,
          result: {
            bestPromptId: result.bestPrompt.id,
            promptIds: result.prompts.map((prompt) => prompt.id),
            recommendations: result.recommendations,
          } as Prisma.InputJsonValue,
          bestScore: result.bestPrompt.scores.promptQuality,
        },
      });

      await tx.composedPromptRecord.createMany({
        data: result.prompts.map((prompt, index) => ({
          id: prompt.id,
          promptRunId: run.id,
          organizationId: tenant?.organizationId,
          projectId: tenant?.projectId,
          industry: prompt.industry,
          companyName: request.companyName,
          text: prompt.text,
          scores: prompt.scores as object,
          dna: prompt.dna as object,
          metadata: prompt.metadata as object,
          selectedPrinciples: prompt.selectedPrinciples as object,
          rank: index + 1,
          logos: [],
          saved: false,
        })),
        skipDuplicates: true,
      });

      return run.id;
    });
  }

  async getById(id: string, tenant?: TenantScope) {
    const record = await prisma.composedPromptRecord.findUnique({
      where: { id, ...(tenant ? { organizationId: tenant.organizationId } : {}) },
      select: {
        id: true,
        industry: true,
        companyName: true,
        text: true,
        scores: true,
        dna: true,
        metadata: true,
        selectedPrinciples: true,
        rank: true,
        feedback: true,
        saved: true,
        generatedLogos: true,
      },
    });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }
    return this.toClientRecord(record, record.generatedLogos);
  }

  async appendLogo(
    id: string,
    image: GeneratedImage,
    tenant?: TenantScope,
    storage?: { storageKey: string; mimeType: string },
  ) {
    await prisma.$transaction(async (tx) => {
      const record = await tx.composedPromptRecord.findUnique({
        where: { id, ...(tenant ? { organizationId: tenant.organizationId } : {}) },
        select: {
          companyName: true,
          generatedLogos: { select: { id: true } },
        },
      });
      if (!record) throw new NotFoundException(`Prompt not found: ${id}`);

      if (record.generatedLogos.length >= MAX_LOGOS_PER_PROMPT) {
        throw new BadRequestException(`Maximum ${MAX_LOGOS_PER_PROMPT} logos per prompt`);
      }
      await tx.logo.upsert({
        where: { id: image.id },
        create: {
          id: image.id,
          name: record.companyName ?? 'Generated logo',
          promptId: id,
          organizationId: tenant?.organizationId,
          publicUrl: image.url,
          storageKey: storage?.storageKey,
          mimeType: storage?.mimeType,
          promptText: image.prompt,
          provider: image.provider,
          model: image.model,
          width: image.width,
          height: image.height,
          metadata: image.feedback ? ({ feedback: image.feedback } as object) : undefined,
        },
        update: {
          promptId: id,
          organizationId: tenant?.organizationId,
          publicUrl: image.url,
          storageKey: storage?.storageKey,
          mimeType: storage?.mimeType,
          promptText: image.prompt,
          provider: image.provider,
          model: image.model,
          width: image.width,
          height: image.height,
          metadata: image.feedback ? ({ feedback: image.feedback } as object) : undefined,
        },
      });
    }, { maxWait: 10_000, timeout: 20_000 });
    return this.getById(id, tenant);
  }

  async reserveLogo(
    id: string,
    imageId: string,
    promptText: string,
    tenant?: TenantScope,
  ) {
    return prisma.$transaction(async (tx) => {
      const record = await tx.composedPromptRecord.findUnique({
        where: { id, ...(tenant ? { organizationId: tenant.organizationId } : {}) },
        select: {
          companyName: true,
          generatedLogos: { select: { id: true } },
        },
      });
      if (!record) throw new NotFoundException(`Prompt not found: ${id}`);
      if (record.generatedLogos.length >= MAX_LOGOS_PER_PROMPT) {
        throw new BadRequestException(`Maximum ${MAX_LOGOS_PER_PROMPT} logos per prompt`);
      }
      await tx.logo.create({
        data: {
          id: imageId,
          name: record.companyName ?? 'Generated logo',
          promptId: id,
          organizationId: tenant?.organizationId,
          projectId: tenant?.projectId,
          promptText,
          metadata: { queued: true },
        },
      });
      return { remaining: MAX_LOGOS_PER_PROMPT - record.generatedLogos.length - 1 };
    }, { maxWait: 10_000, timeout: 20_000 });
  }

  async setSaved(id: string, saved: boolean, idempotencyKey?: string, tenant?: TenantScope) {
    const now = new Date();
    const eventKey = idempotencyKey ?? `prompt:${id}:saved:${saved}:${randomUUID()}`;
    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.composedPromptRecord.update({
        where: { id, ...(tenant ? { organizationId: tenant.organizationId } : {}) },
        data: { saved, savedAt: saved ? now : null },
        include: { generatedLogos: true },
      });
      await tx.outboxEvent.upsert({
        where: { idempotencyKey: eventKey },
        create: {
          aggregateType: 'generated_prompt',
          aggregateId: id,
          eventType: saved ? 'prompt.saved' : 'prompt.unsaved',
          idempotencyKey: eventKey,
          payload: {
            promptId: id,
            companyName: record.companyName,
            industry: record.industry,
            text: record.text.slice(0, 600),
            scores: record.scores,
            organizationId: record.organizationId,
            projectId: record.projectId,
          },
        },
        update: {},
      });
      return record;
    });
    return this.toClientRecord(updated, updated.generatedLogos);
  }

  async setLogoFeedback(id: string, logoId: string, feedback: LogoFeedback) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    const logos = parseLogos(record.logos);
    const index = logos.findIndex((logo) => logo.id === logoId);
    if (index === -1) {
      throw new NotFoundException(`Logo not found: ${logoId}`);
    }

    logos[index] = { ...logos[index]!, feedback };
    const [updated] = await prisma.$transaction([
      prisma.composedPromptRecord.update({
        where: { id },
        data: { logos: logos as unknown as Prisma.InputJsonValue },
      }),
      prisma.logo.updateMany({
        where: { id: logoId, promptId: id },
        data: { metadata: { feedback } as unknown as Prisma.InputJsonValue },
      }),
      prisma.outboxEvent.create({
        data: {
          aggregateType: 'generated_logo',
          aggregateId: logoId,
          eventType: 'logo.feedback',
          idempotencyKey: `logo:${logoId}:feedback:${randomUUID()}`,
          payload: {
            promptId: id,
            logoId,
            rating: feedback.score,
            comments: feedback.emoji,
            organizationId: record.organizationId,
            projectId: record.projectId,
          },
        },
      }),
    ]);

    return this.toClientRecord(updated);
  }

  async setLogoTags(
    id: string,
    logoId: string,
    tags: { workedTags?: string[]; missedTags?: string[] },
  ) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    const logos = parseLogos(record.logos);
    const index = logos.findIndex((logo) => logo.id === logoId);
    if (index === -1) {
      throw new NotFoundException(`Logo not found: ${logoId}`);
    }

    const prev = logos[index]!.feedback;
    const now = new Date().toISOString();
    logos[index] = {
      ...logos[index]!,
      feedback: {
        ...prev,
        workedTags: tags.workedTags,
        missedTags: tags.missedTags,
        submittedAt: prev?.submittedAt ?? now,
        tagsUpdatedAt: now,
      },
    };

    const [updated] = await prisma.$transaction([
      prisma.composedPromptRecord.update({
        where: { id },
        data: { logos: logos as unknown as Prisma.InputJsonValue },
      }),
      prisma.logo.updateMany({
        where: { id: logoId, promptId: id },
        data: {
          metadata: {
            feedback: logos[index]!.feedback,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
      prisma.outboxEvent.create({
        data: {
          aggregateType: 'generated_logo',
          aggregateId: logoId,
          eventType: 'logo.tags',
          idempotencyKey: `logo:${logoId}:tags:${randomUUID()}`,
          payload: {
            promptId: id,
            logoId,
            tags: [...(tags.workedTags ?? []), ...(tags.missedTags ?? [])],
            comments: JSON.stringify(tags),
            organizationId: record.organizationId,
            projectId: record.projectId,
          },
        },
      }),
    ]);

    return this.toClientRecord(updated);
  }

  /** @deprecated use setSaved */
  async setFeedback(id: string, feedback: PromptFeedback) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const record = await tx.composedPromptRecord.update({
        where: { id },
        data: { feedback },
      });
      await tx.outboxEvent.create({
        data: {
          aggregateType: 'generated_prompt',
          aggregateId: id,
          eventType: 'prompt.feedback',
          idempotencyKey: `prompt:${id}:feedback:${randomUUID()}`,
          payload: {
            promptId: id,
            verdict: feedback === 'LIKE' ? 'approved' : 'rejected',
            organizationId: record.organizationId,
            projectId: record.projectId,
          },
        },
      });
      return record;
    });

    return this.toClientRecord(updated);
  }

  attachLogosToPrompts<T extends ComposedPrompt>(
    prompts: T[],
  ): Array<T & { logos: GeneratedImage[]; saved?: boolean }> {
    return prompts.map((prompt) => ({ ...prompt, logos: [], saved: false }));
  }

  async attachStoredState<T extends ComposedPrompt>(
    prompts: T[],
  ): Promise<Array<T & { logos: GeneratedImage[]; saved?: boolean }>> {
    if (!prompts.length) return [];

    const ids = prompts.map((p) => p.id);
    const rows = await prisma.composedPromptRecord.findMany({
      where: { id: { in: ids } },
      select: { id: true, logos: true, saved: true },
    });
    const stateMap = new Map(
      rows.map((row) => [row.id, { logos: parseLogos(row.logos), saved: row.saved }]),
    );

    return prompts.map((prompt) => {
      const stored = stateMap.get(prompt.id);
      return {
        ...prompt,
        logos: stored?.logos ?? [],
        saved: stored?.saved ?? false,
      };
    });
  }

  /** @deprecated use attachStoredState */
  async attachStoredLogos<T extends ComposedPrompt>(prompts: T[]) {
    return this.attachStoredState(prompts);
  }

  async listSaved(limit = 24, cursorValue?: string, tenant?: TenantScope) {
    const pageSize = Math.min(100, Math.max(1, limit));
    const cursor = parseCursor(cursorValue);
    const records = await prisma.composedPromptRecord.findMany({
      where: {
        saved: true,
        savedAt: { not: null },
        ...(tenant ? { organizationId: tenant.organizationId } : {}),
        ...(cursor
          ? {
              OR: [
                { savedAt: { lt: cursor.savedAt } },
                { savedAt: cursor.savedAt, id: { lt: cursor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ savedAt: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      select: {
        id: true,
        industry: true,
        companyName: true,
        text: true,
        scores: true,
        dna: true,
        metadata: true,
        selectedPrinciples: true,
        rank: true,
        feedback: true,
        saved: true,
        savedAt: true,
        generatedLogos: {
          where: {
            publicUrl: {
              not: { startsWith: 'data:' },
            },
          },
          select: {
            id: true,
            publicUrl: true,
            promptText: true,
            provider: true,
            model: true,
            width: true,
            height: true,
            createdAt: true,
            metadata: true,
          },
        },
      },
    });
    const hasMore = records.length > pageSize;
    const page = records.slice(0, pageSize);
    const last = page.at(-1);
    return {
      prompts: page.map((record) => ({
        ...this.toClientRecord(record, record.generatedLogos),
        savedAt: record.savedAt!.toISOString(),
      })),
      nextCursor:
        hasMore && last?.savedAt ? encodeCursor(last.savedAt, last.id) : null,
    };
  }

  /** @deprecated use listSaved */
  async listWithFeedback(filter: 'all' | 'like' | 'dislike' = 'all', limit = 200) {
    const feedbackFilter =
      filter === 'like'
        ? { feedback: 'LIKE' as const }
        : filter === 'dislike'
          ? { feedback: 'DISLIKE' as const }
          : { feedback: { in: ['LIKE', 'DISLIKE'] } };

    const records = await prisma.composedPromptRecord.findMany({
      where: feedbackFilter,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return records.map((record) => ({
      ...this.toClientRecord(record),
      savedAt: record.updatedAt.toISOString(),
    }));
  }

  private toClientRecord(record: {
    id: string;
    industry: string;
    companyName: string | null;
    text: string;
    scores: unknown;
    dna: unknown;
    metadata: unknown;
    selectedPrinciples: unknown;
    rank: number | null;
    logos?: unknown;
    feedback: string | null;
    saved?: boolean;
  }, normalizedLogos?: Array<{
    id: string;
    publicUrl: string | null;
    promptText: string | null;
    provider: string | null;
    model: string | null;
    width: number | null;
    height: number | null;
    createdAt: Date;
    metadata: unknown;
  }>) {
    const normalized = normalizedLogos
      ?.filter((logo) => Boolean(logo.publicUrl))
      .map((logo) => {
        const metadata =
          logo.metadata && typeof logo.metadata === 'object'
            ? (logo.metadata as { feedback?: unknown })
            : undefined;
        return {
          id: logo.id,
          url: logo.publicUrl!,
          prompt: logo.promptText ?? '',
          provider: logo.provider === 'openai' ? ('openai' as const) : ('mock' as const),
          model: logo.model ?? undefined,
          width: logo.width ?? 1024,
          height: logo.height ?? 1024,
          createdAt: logo.createdAt.toISOString(),
          feedback: parseLogoFeedback(metadata?.feedback),
        };
      });
    return {
      id: record.id,
      industry: record.industry,
      companyName: record.companyName ?? undefined,
      text: record.text,
      scores: record.scores,
      dna: record.dna,
      metadata: record.metadata,
      selectedPrinciples: record.selectedPrinciples,
      rank: record.rank,
      logos: normalized?.length ? normalized : parseLogos(record.logos),
      saved: record.saved ?? false,
      feedback: parseFeedback(record.feedback),
    };
  }
}
