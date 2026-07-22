const CONNECTION_ERROR_CODES = new Set([
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '08007',
  '08P01',
  '53300',
  '57P01',
  '57P02',
  '57P03',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
]);

const CONNECTION_ERROR_PATTERN =
  /closed|connection|ECONNRESET|ETIMEDOUT|timeout exceeded when trying to connect|timeout expired|remaining connection slots|too many clients|terminating connection/i;

export interface PostgresErrorLike {
  code?: string;
  constraint?: string;
  detail?: string;
  message?: string;
}

export function isPostgresError(error: unknown): error is PostgresErrorLike {
  return Boolean(
    error &&
      typeof error === 'object' &&
      ('code' in error || 'constraint' in error || 'detail' in error),
  );
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code) : '';
  if (CONNECTION_ERROR_CODES.has(code)) return true;

  const message = 'message' in error ? String(error.message) : String(error);
  return CONNECTION_ERROR_PATTERN.test(message);
}

export function isUniqueViolation(
  error: unknown,
  constraint?: string,
): boolean {
  return (
    isPostgresError(error) &&
    error.code === '23505' &&
    (!constraint || error.constraint === constraint)
  );
}
