/** PostgreSQL text columns reject NUL (0x00) and some control bytes. */
export function sanitizePostgresText(text: string | undefined | null): string | undefined {
  if (text == null) return undefined;
  return text
    .split('\0')
    .join('')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

export function sanitizePostgresJson(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizePostgresText(value) ?? '';
  }
  if (Array.isArray(value)) {
    return value.map(sanitizePostgresJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizePostgresJson(entry)]),
    );
  }
  return value;
}
