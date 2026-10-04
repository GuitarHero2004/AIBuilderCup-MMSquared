import type { CaseCreate, CaseList, CaseRead } from './types';

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly requestId?: string) { super(message); }
}

function isErrorEnvelope(value: unknown): value is { error: { code: string; message: string; request_id?: string } } {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = value.error;
  return !!error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    && 'message' in error && typeof error.message === 'string';
}

export function createApiClient(baseUrl: string, authHeaders: () => Promise<Record<string, string>>, fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<T> {
    const headers = await authHeaders();
    let response: Response;
    try {
      response = await fetcher(`${baseUrl}${path}`, {
        method,
        headers: { ...headers, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ApiError(method === 'POST'
        ? 'The save could not be confirmed. Refresh your cases before creating another.'
        : 'The workspace could not reach the server. Check the connection and try again.', 'CONNECTION_FAILED');
    }
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new ApiError('The server returned an unreadable response. Refresh your cases before trying again.', 'INVALID_RESPONSE');
    }
    if (!response.ok) {
      if (isErrorEnvelope(data)) throw new ApiError(data.error.message, data.error.code, data.error.request_id);
      throw new ApiError(response.status === 401 ? 'Your session could not be verified. Refresh the page and try again.' : 'The request could not be completed. Please try again.', `HTTP_${response.status}`);
    }
    return data as T;
  }
  return {
    listCases: () => request<CaseList>('/api/v1/cases', 'GET'),
    createCase: (input: CaseCreate) => request<CaseRead>('/api/v1/cases', 'POST', input),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
