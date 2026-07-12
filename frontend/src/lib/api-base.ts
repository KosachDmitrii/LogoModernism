/** API base path or full URL (e.g. https://logomodernism-production.up.railway.app/api). */
export function getApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, '');
  return configured || '/api';
}

/** Origin for resolving relative asset paths from the API (/api/images/...). */
export function getApiOrigin(): string {
  const base = getApiBase();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return base.replace(/\/api$/, '');
  }
  return '';
}

export function resolveApiUrl(path: string): string {
  if (/^https?:\/\//.test(path) || path.startsWith('data:')) {
    return path;
  }
  const origin = getApiOrigin();
  if (origin && path.startsWith('/')) {
    return `${origin}${path}`;
  }
  return path;
}
