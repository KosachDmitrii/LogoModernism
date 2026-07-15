import type { MessageKey } from '../i18n';

type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

export class ApiError extends Error {
  readonly messageKey: MessageKey;
  readonly status?: number;
  readonly detail?: string;

  constructor(messageKey: MessageKey, status?: number, detail?: string) {
    super(messageKey);
    this.name = 'ApiError';
    this.messageKey = messageKey;
    this.status = status;
    this.detail = detail?.trim() || undefined;
  }
}

export async function parseApiError(res: Response, messageKey: MessageKey): Promise<never> {
  const detail = await res.text().catch(() => '');
  throw new ApiError(messageKey, res.status, detail || undefined);
}

function apiErrorPayload(error: ApiError): { code?: string; quotaKey?: string } {
  if (!error.detail) return {};
  try {
    const payload = JSON.parse(error.detail) as { code?: unknown; quotaKey?: unknown };
    return {
      code: typeof payload.code === 'string' ? payload.code : undefined,
      quotaKey: typeof payload.quotaKey === 'string' ? payload.quotaKey : undefined,
    };
  } catch {
    return {};
  }
}

function readableApiDetail(detail: string): string {
  try {
    const payload = JSON.parse(detail) as { message?: unknown };
    if (typeof payload.message === 'string') return payload.message;
    if (Array.isArray(payload.message)) {
      const messages = payload.message.filter((item): item is string => typeof item === 'string');
      if (messages.length > 0) return messages.join('; ');
    }
  } catch {
    // The backend may legitimately return plain text.
  }
  return detail;
}

export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof ApiError && apiErrorPayload(error).code === 'QUOTA_EXCEEDED';
}

export function formatError(error: unknown, t: TranslateFn): string {
  if (error instanceof ApiError) {
    const payload = apiErrorPayload(error);
    if (payload.code === 'QUOTA_EXCEEDED') {
      return payload.quotaKey === 'image.generate'
        ? t('errors.logoQuotaExceeded')
        : t('errors.promptQuotaExceeded');
    }
    const base = t(error.messageKey);
    if (error.detail) {
      return t('errors.api.withDetail', {
        message: base,
        status: error.status ?? 0,
        detail: readableApiDetail(error.detail).slice(0, 300),
      });
    }
    if (error.status) {
      return t('errors.api.withStatus', { message: base, status: error.status });
    }
    return base;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return t('common.generationFailed');
}
