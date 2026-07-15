export class ApiAbortError extends Error {
  constructor() {
    super('Request was cancelled');
    this.name = 'ApiAbortError';
  }
}

export type ApiFetchOptions = RequestInit;

export async function apiFetch(
  input: RequestInfo | URL,
  { signal, headers, ...init }: ApiFetchOptions = {},
): Promise<Response> {
  try {
    const authHeaders = new Headers(headers);
    const token = window.localStorage.getItem('logo-platform.access-token');
    const organizationId =
      window.localStorage.getItem('logo-platform.organization-id') ??
      import.meta.env.VITE_ORGANIZATION_ID;
    const projectId =
      window.localStorage.getItem('logo-platform.project-id') ??
      import.meta.env.VITE_PROJECT_ID;
    const userId =
      window.localStorage.getItem('logo-platform.user-id') ?? import.meta.env.VITE_USER_ID;
    if (token && !authHeaders.has('Authorization')) {
      authHeaders.set('Authorization', `Bearer ${token}`);
    }
    if (organizationId) authHeaders.set('x-organization-id', organizationId);
    if (projectId) authHeaders.set('x-project-id', projectId);
    if (userId) authHeaders.set('x-user-id', userId);
    return await fetch(input, { ...init, headers: authHeaders, signal });
  } catch (error) {
    if (signal?.aborted) throw new ApiAbortError();
    throw error;
  }
}
