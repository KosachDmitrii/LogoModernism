import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@logo-platform/database';
import type { ComposedPrompt, GeneratedImage, LogoFeedback, PromptGenerationRequest } from '@logo-platform/shared';
import { prisma } from '@logo-platform/database';

export const MAX_LOGOS_PER_PROMPT = 3;
/** @deprecated */
export type PromptFeedback = 'LIKE' | 'DISLIKE';

function parseFeedback(value: unknown): PromptFeedback | undefined {
  return value === 'LIKE' || value === 'DISLIKE' ? value : undefined;
}

function parseLogoFeedback(value: unknown): LogoFeedback | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as LogoFeedback;
  if (typeof row.score !== 'number' || typeof row.emoji !== 'string') return undefined;
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

@Injectable()
export class PromptRecordsService {
  async saveBatch(
    request: PromptGenerationRequest,
    result: { prompts: ComposedPrompt[]; recommendations: unknown; bestPrompt: ComposedPrompt },
  ) {
    const run = await prisma.promptRun.create({
      data: {
        industry: request.industry,
        companyName: request.companyName,
        request: request as object,
        result: result as object,
        bestScore: result.bestPrompt.scores.promptQuality,
      },
    });

    await prisma.composedPromptRecord.createMany({
      data: result.prompts.map((prompt, index) => ({
        id: prompt.id,
        promptRunId: run.id,
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
  }

  async getById(id: string) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }
    return this.toClientRecord(record);
  }

  async appendLogo(id: string, image: GeneratedImage) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    const logos = parseLogos(record.logos);
    if (logos.length >= MAX_LOGOS_PER_PROMPT) {
      throw new BadRequestException(`Maximum ${MAX_LOGOS_PER_PROMPT} logos per prompt`);
    }

    const updated = await prisma.composedPromptRecord.update({
      where: { id },
      data: { logos: [...logos, image] as unknown as Prisma.InputJsonValue },
    });

    return this.toClientRecord(updated);
  }

  async setSaved(id: string, saved: boolean) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    const updated = await prisma.composedPromptRecord.update({
      where: { id },
      data: { saved },
    });

    return this.toClientRecord(updated);
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
    const updated = await prisma.composedPromptRecord.update({
      where: { id },
      data: { logos: logos as unknown as Prisma.InputJsonValue },
    });

    return this.toClientRecord(updated);
  }

  /** @deprecated use setSaved */
  async setFeedback(id: string, feedback: PromptFeedback) {
    const record = await prisma.composedPromptRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Prompt not found: ${id}`);
    }

    const updated = await prisma.composedPromptRecord.update({
      where: { id },
      data: { feedback },
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

  async listSaved(limit = 200) {
    const records = await prisma.composedPromptRecord.findMany({
      where: { saved: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return records.map((record) => ({
      ...this.toClientRecord(record),
      savedAt: record.updatedAt.toISOString(),
    }));
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
    logos: unknown;
    feedback: string | null;
    saved?: boolean;
  }) {
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
      logos: parseLogos(record.logos),
      saved: record.saved ?? false,
      feedback: parseFeedback(record.feedback),
    };
  }
}
