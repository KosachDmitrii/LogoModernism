const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

const CONNECTION_ERROR_PATTERN =
  /closed|connection|ECONNRESET|ETIMEDOUT|Can't reach database server|engine is not yet connected|not yet connected|client has already been destroyed|response from the engine was empty/i;

export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code) : '';
  if (CONNECTION_ERROR_CODES.has(code)) return true;

  const message = 'message' in error ? String(error.message) : String(error);
  return CONNECTION_ERROR_PATTERN.test(message);
}
