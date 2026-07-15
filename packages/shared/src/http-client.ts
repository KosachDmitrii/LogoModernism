export class UpstreamDeadlineError extends Error {
  constructor(
    public readonly url: string,
    public readonly timeoutMs: number,
  ) {
    super(`Upstream request exceeded ${timeoutMs}ms: ${url}`);
    this.name = 'UpstreamDeadlineError';
  }
}

export type FetchBudget = {
  timeoutMs?: number;
  retries?: number;
  retryBaseMs?: number;
};

function composeSignal(signal: AbortSignal | null | undefined, timeout: AbortSignal): AbortSignal {
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function retryableMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithDeadline(
  input: string | URL | Request,
  init: RequestInit = {},
  budget: FetchBudget = {},
): Promise<Response> {
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const timeoutMs = budget.timeoutMs ?? 15_000;
  const retries = retryableMethod(method) ? Math.min(2, budget.retries ?? 1) : 0;
  const url = input instanceof Request ? input.url : input.toString();

  for (let attempt = 0; ; attempt += 1) {
    const timeout = AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetch(input, {
        ...init,
        signal: composeSignal(init.signal, timeout),
      });
      if (attempt < retries && retryableStatus(response.status)) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await response.body?.cancel().catch(() => undefined);
        await delay(
          Number.isFinite(retryAfter)
            ? Math.min(2_000, retryAfter * 1_000)
            : (budget.retryBaseMs ?? 200) * 2 ** attempt,
        );
        continue;
      }
      return response;
    } catch (error) {
      const timedOut = timeout.aborted && !init.signal?.aborted;
      if (attempt < retries && !init.signal?.aborted) {
        await delay((budget.retryBaseMs ?? 200) * 2 ** attempt);
        continue;
      }
      if (timedOut) throw new UpstreamDeadlineError(url, timeoutMs);
      throw error;
    }
  }
}
