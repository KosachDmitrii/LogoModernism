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

export function formatError(error: unknown, t: TranslateFn): string {
  if (error instanceof ApiError) {
    const base = t(error.messageKey);
    if (error.detail) {
      return t('errors.api.withDetail', {
        message: base,
        status: error.status ?? 0,
        detail: error.detail.slice(0, 300),
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
