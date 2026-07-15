import { getSupabaseClient } from './supabase';

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
    const {
      data: { session },
    } = await getSupabaseClient().auth.getSession();
    const projectId =
      window.localStorage.getItem('logo-platform.project-id') ??
      (import.meta.env.DEV ? import.meta.env.VITE_PROJECT_ID : undefined);
    if (session?.access_token && !authHeaders.has('Authorization')) {
      authHeaders.set('Authorization', `Bearer ${session.access_token}`);
    }
    if (projectId) authHeaders.set('x-project-id', projectId);
    const response = await fetch(input, { ...init, headers: authHeaders, signal });
    if (response.status === 401) {
      window.dispatchEvent(new Event('logo-platform:unauthorized'));
    }
    return response;
  } catch (error) {
    if (signal?.aborted) throw new ApiAbortError();
    throw error;
  }
}
