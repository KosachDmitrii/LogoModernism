import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { db, type DatabaseClient } from '@logo-platform/database';
import type {
  ComposedPrompt,
  GeneratedImage,
  LogoFeedback,
  PromptGenerationRequest,
} from '@logo-platform/shared';
import type { TenantScope } from '../auth/tenant-context';

export const MAX_LOGOS_PER_PROMPT = 3;
/** @deprecated */
export type PromptFeedback = 'LIKE' | 'DISLIKE';

type PromptRow = {
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
  saved: boolean;
  savedAt?: Date | null;
  updatedAt?: Date;
};
type LogoRow = {
  id: string;
  promptId?: string | null;
  publicUrl: string | null;
  promptText: string | null;
  provider: string | null;
  model: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
  metadata: unknown;
};

function parseFeedback(value: unknown): PromptFeedback | undefined {
  return value === 'LIKE' || value === 'DISLIKE' ? value : undefined;
}

function parseLogoFeedback(value: unknown): LogoFeedback | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as LogoFeedback;
  if (typeof row.score !== 'number' && !row.workedTags?.length && !row.missedTags?.length) {
    return undefined;
  }
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
    .map((item) => ({ ...item, feedback: parseLogoFeedback(item.feedback) }));
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
  return Buffer.from(JSON.stringify({ savedAt: savedAt.toISOString(), id })).toString(
    'base64url',
  );
}

const PROMPT_COLUMNS = `
  id, industry, company_name, text, scores, dna, metadata, selected_principles,
  rank, logos, feedback, saved, saved_at, updated_at
`;

async function findPrompt(
  client: DatabaseClient,
  id: string,
  organizationId?: string,
  forUpdate = false,
): Promise<PromptRow | null> {
  return client.maybeOne<PromptRow>(
    `SELECT ${PROMPT_COLUMNS} FROM generated_prompts
     WHERE id = $1 AND ($2::text IS NULL OR organization_id = $2)
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [id, organizationId ?? null],
  );
}

@Injectable()
export class PromptRecordsService {
  async saveBatch(
    request: PromptGenerationRequest,
    result: {
      prompts: ComposedPrompt[];
      recommendations: unknown;
      bestPrompt: ComposedPrompt;
    },
    tenant?: TenantScope,
  ) {
    return db.transaction(async (tx) => {
      const runId = randomUUID();
      await tx.query(
        `INSERT INTO prompt_generation_runs (
           id, project_id, industry, company_name, request, result, best_score
         ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)`,
        [
          runId,
          tenant?.projectId ?? null,
          request.industry,
          request.companyName ?? null,
          JSON.stringify(request),
          JSON.stringify({
            bestPromptId: result.bestPrompt.id,
            promptIds: result.prompts.map((prompt) => prompt.id),
            recommendations: result.recommendations,
          }),
          result.bestPrompt.scores.promptQuality,
        ],
      );
      for (const [index, prompt] of result.prompts.entries()) {
        await tx.query(
          `INSERT INTO generated_prompts (
             id, prompt_run_id, organization_id, project_id, industry, company_name,
             text, scores, dna, metadata, selected_principles, rank, logos, saved,
             updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb,
             $11::jsonb, $12, '[]'::jsonb, FALSE, NOW()
           ) ON CONFLICT (id) DO NOTHING`,
          [
            prompt.id,
            runId,
            tenant?.organizationId ?? null,
            tenant?.projectId ?? null,
            prompt.industry,
            request.companyName ?? null,
            prompt.text,
            JSON.stringify(prompt.scores),
            JSON.stringify(prompt.dna),
            JSON.stringify(prompt.metadata),
            JSON.stringify(prompt.selectedPrinciples),
            index + 1,
          ],
        );
      }
      return runId;
    }, { isolationLevel: 'READ COMMITTED' });
  }

  async getById(id: string, tenant?: TenantScope) {
    const record = await findPrompt(db, id, tenant?.organizationId);
    if (!record) throw new NotFoundException(`Prompt not found: ${id}`);
    const logos = await this.logosForPrompt(id);
    return this.toClientRecord(record, logos);
  }

  async appendLogo(
    id: string,
    image: GeneratedImage,
    tenant?: TenantScope,
    storage?: { storageKey: string; mimeType: string },
  ) {
    await db.transaction(async (tx) => {
      const record = await findPrompt(tx, id, tenant?.organizationId, true);
      if (!record) throw new NotFoundException(`Prompt not found: ${id}`);
      const count = await tx.one<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM generated_logos WHERE prompt_id = $1',
        [id],
      );
      if (count.count >= MAX_LOGOS_PER_PROMPT) {
        throw new BadRequestException(`Maximum ${MAX_LOGOS_PER_PROMPT} logos per prompt`);
      }
      await tx.query(
        `INSERT INTO generated_logos (
           id, name, prompt_id, organization_id, public_url, storage_key, mime_type,
           prompt_text, provider, model, width, height, metadata, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, NOW()
         )
         ON CONFLICT (id) DO UPDATE SET
           prompt_id = EXCLUDED.prompt_id, organization_id = EXCLUDED.organization_id,
           public_url = EXCLUDED.public_url, storage_key = EXCLUDED.storage_key,
           mime_type = EXCLUDED.mime_type, prompt_text = EXCLUDED.prompt_text,
           provider = EXCLUDED.provider, model = EXCLUDED.model,
           width = EXCLUDED.width, height = EXCLUDED.height,
           metadata = EXCLUDED.metadata, updated_at = NOW()`,
        [
          image.id,
          record.companyName ?? 'Generated logo',
          id,
          tenant?.organizationId ?? null,
          image.url,
          storage?.storageKey ?? null,
          storage?.mimeType ?? null,
          image.prompt,
          image.provider,
          image.model ?? null,
          image.width,
          image.height,
          JSON.stringify(image.feedback ? { feedback: image.feedback } : null),
        ],
      );
    }, { isolationLevel: 'READ COMMITTED' });
    return this.getById(id, tenant);
  }

  async reserveLogo(
    id: string,
    imageId: string,
    promptText: string,
    tenant?: TenantScope,
  ) {
    return db.transaction(async (tx) => {
      const record = await findPrompt(tx, id, tenant?.organizationId, true);
      if (!record) throw new NotFoundException(`Prompt not found: ${id}`);
      const count = await tx.one<{ count: number }>(
        'SELECT COUNT(*)::int AS count FROM generated_logos WHERE prompt_id = $1',
        [id],
      );
      if (count.count >= MAX_LOGOS_PER_PROMPT) {
        throw new BadRequestException(`Maximum ${MAX_LOGOS_PER_PROMPT} logos per prompt`);
      }
      await tx.query(
        `INSERT INTO generated_logos (
           id, name, prompt_id, organization_id, project_id, prompt_text,
           metadata, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, '{"queued":true}'::jsonb, NOW())`,
        [
          imageId,
          record.companyName ?? 'Generated logo',
          id,
          tenant?.organizationId ?? null,
          tenant?.projectId ?? null,
          promptText,
        ],
      );
      return { remaining: MAX_LOGOS_PER_PROMPT - count.count - 1 };
    }, { isolationLevel: 'READ COMMITTED' });
  }

  async setSaved(id: string, saved: boolean, idempotencyKey?: string, tenant?: TenantScope) {
    void idempotencyKey;
    const record = await db.maybeOne<PromptRow>(
      `UPDATE generated_prompts
       SET saved = $3, saved_at = CASE WHEN $3 THEN NOW() ELSE NULL END, updated_at = NOW()
       WHERE id = $1 AND ($2::text IS NULL OR organization_id = $2)
       RETURNING ${PROMPT_COLUMNS}`,
      [id, tenant?.organizationId ?? null, saved],
    );
    if (!record) throw new NotFoundException(`Prompt not found: ${id}`);
    return this.toClientRecord(record, await this.logosForPrompt(id));
  }

  async setLogoFeedback(
    id: string,
    logoId: string,
    feedback: LogoFeedback,
    tenant: TenantScope,
  ) {
    return this.updateLegacyLogo(id, logoId, tenant, (logo) => ({ ...logo, feedback }));
  }

  async setLogoTags(
    id: string,
    logoId: string,
    tags: { workedTags?: string[]; missedTags?: string[] },
    tenant: TenantScope,
  ) {
    return this.updateLegacyLogo(id, logoId, tenant, (logo) => {
      const now = new Date().toISOString();
      return {
        ...logo,
        feedback: {
          ...logo.feedback,
          workedTags: tags.workedTags,
          missedTags: tags.missedTags,
          submittedAt: logo.feedback?.submittedAt ?? now,
          tagsUpdatedAt: now,
        },
      };
    });
  }

  /** @deprecated use setSaved */
  async setFeedback(id: string, feedback: PromptFeedback, tenant: TenantScope) {
    const updated = await db.maybeOne<PromptRow>(
      `UPDATE generated_prompts SET feedback = $3, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING ${PROMPT_COLUMNS}`,
      [id, tenant.organizationId, feedback],
    );
    if (!updated) throw new NotFoundException(`Prompt not found: ${id}`);
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
    const rows = await db.query<Pick<PromptRow, 'id' | 'logos' | 'saved'>>(
      'SELECT id, logos, saved FROM generated_prompts WHERE id = ANY($1::text[])',
      [prompts.map((prompt) => prompt.id)],
    );
    const state = new Map<string, { logos: GeneratedImage[]; saved: boolean }>(
      rows.rows.map((row) => [
        row.id,
        { logos: parseLogos(row.logos), saved: row.saved },
      ]),
    );
    return prompts.map((prompt) => ({
      ...prompt,
      logos: state.get(prompt.id)?.logos ?? [],
      saved: state.get(prompt.id)?.saved ?? false,
    }));
  }

  /** @deprecated use attachStoredState */
  attachStoredLogos<T extends ComposedPrompt>(prompts: T[]) {
    return this.attachStoredState(prompts);
  }

  async listSaved(limit = 24, cursorValue?: string, tenant?: TenantScope) {
    const pageSize = Math.min(100, Math.max(1, limit));
    const cursor = parseCursor(cursorValue);
    const records = await db.query<PromptRow>(
      `SELECT ${PROMPT_COLUMNS} FROM generated_prompts
       WHERE saved = TRUE AND saved_at IS NOT NULL
         AND ($1::text IS NULL OR organization_id = $1)
         AND ($2::timestamptz IS NULL OR saved_at < $2 OR (saved_at = $2 AND id < $3))
       ORDER BY saved_at DESC, id DESC
       LIMIT $4`,
      [
        tenant?.organizationId ?? null,
        cursor?.savedAt ?? null,
        cursor?.id ?? null,
        pageSize + 1,
      ],
    );
    const hasMore = records.rows.length > pageSize;
    const page = records.rows.slice(0, pageSize);
    const logos = await this.logosForPrompts(page.map((record) => record.id));
    const last = page.at(-1);
    return {
      prompts: page.map((record) => ({
        ...this.toClientRecord(record, logos.get(record.id)),
        savedAt: record.savedAt!.toISOString(),
      })),
      nextCursor:
        hasMore && last?.savedAt ? encodeCursor(last.savedAt, last.id) : null,
    };
  }

  /** @deprecated use listSaved */
  async listWithFeedback(filter: 'all' | 'like' | 'dislike' = 'all', limit = 200) {
    const values =
      filter === 'like' ? ['LIKE'] : filter === 'dislike' ? ['DISLIKE'] : ['LIKE', 'DISLIKE'];
    const records = await db.query<PromptRow>(
      `SELECT ${PROMPT_COLUMNS} FROM generated_prompts
       WHERE feedback = ANY($1::text[])
       ORDER BY updated_at DESC LIMIT $2`,
      [values, limit],
    );
    return records.rows.map((record) => ({
      ...this.toClientRecord(record),
      savedAt: record.updatedAt!.toISOString(),
    }));
  }

  private async updateLegacyLogo(
    id: string,
    logoId: string,
    tenant: TenantScope,
    update: (logo: GeneratedImage) => GeneratedImage,
  ) {
    await db.transaction(async (tx) => {
      const record = await findPrompt(tx, id, tenant.organizationId, true);
      if (!record) throw new NotFoundException(`Prompt not found: ${id}`);
      const normalized = await tx.maybeOne<{ metadata: unknown }>(
        `SELECT metadata FROM generated_logos
         WHERE id = $1 AND prompt_id = $2 AND organization_id = $3
         FOR UPDATE`,
        [logoId, id, tenant.organizationId],
      );
      if (normalized) {
        const metadata =
          normalized.metadata && typeof normalized.metadata === 'object'
            ? (normalized.metadata as Record<string, unknown>)
            : {};
        const next = update({
          id: logoId,
          feedback: metadata.feedback as LogoFeedback | undefined,
        } as GeneratedImage);
        await tx.query(
          `UPDATE generated_logos
           SET metadata = $4::jsonb, updated_at = NOW()
           WHERE id = $1 AND prompt_id = $2 AND organization_id = $3`,
          [
            logoId,
            id,
            tenant.organizationId,
            JSON.stringify({ ...metadata, feedback: next.feedback }),
          ],
        );
        return;
      }

      const logos = parseLogos(record.logos);
      const index = logos.findIndex((logo) => logo.id === logoId);
      if (index === -1) throw new NotFoundException(`Logo not found: ${logoId}`);
      logos[index] = update(logos[index]!);
      await tx.query(
        `UPDATE generated_prompts
         SET logos = $3::jsonb, updated_at = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING id`,
        [id, tenant.organizationId, JSON.stringify(logos)],
      );
    }, { isolationLevel: 'READ COMMITTED' });
    return this.getById(id, tenant);
  }

  private async logosForPrompt(promptId: string): Promise<LogoRow[]> {
    const result = await db.query<LogoRow>(
      `SELECT id, prompt_id, public_url, prompt_text, provider, model,
              width, height, created_at, metadata
       FROM generated_logos
       WHERE prompt_id = $1 AND public_url IS NOT NULL AND public_url NOT LIKE 'data:%'
       ORDER BY created_at ASC`,
      [promptId],
    );
    return result.rows;
  }

  private async logosForPrompts(promptIds: string[]): Promise<Map<string, LogoRow[]>> {
    if (!promptIds.length) return new Map();
    const rows = await db.query<LogoRow>(
      `SELECT id, prompt_id, public_url, prompt_text, provider, model,
              width, height, created_at, metadata
       FROM generated_logos
       WHERE prompt_id = ANY($1::text[])
         AND public_url IS NOT NULL AND public_url NOT LIKE 'data:%'
       ORDER BY created_at ASC`,
      [promptIds],
    );
    const grouped = new Map<string, LogoRow[]>();
    for (const row of rows.rows) {
      if (!row.promptId) continue;
      grouped.set(row.promptId, [...(grouped.get(row.promptId) ?? []), row]);
    }
    return grouped;
  }

  private toClientRecord(record: PromptRow, normalizedLogos?: LogoRow[]) {
    const normalized = normalizedLogos?.map((logo) => {
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
