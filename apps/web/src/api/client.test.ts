import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';
import { demoDefaults, toCaseCreate } from '../features/cases/form';

describe('authenticated API boundary', () => {
  it('sends identity/app verification headers without cookies or following redirects', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ items: [] }));
    const api = createApiClient('http://127.0.0.1:8000', async () => ({ Authorization: 'Bearer test-token', 'X-Firebase-AppCheck': 'test-app-token' }), fetcher);
    expect(await api.listCases()).toEqual({ items: [] });
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/cases', expect.objectContaining({ method: 'GET', credentials: 'omit', redirect: 'error', headers: expect.objectContaining({ Authorization: 'Bearer test-token', 'X-Firebase-AppCheck': 'test-app-token' }) }));
  });
  it('never sends a request if authentication fails', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createApiClient('http://127.0.0.1:8000', () => Promise.reject(new ApiError('Sign in first.', 'UNAUTHENTICATED')), fetcher);
    await expect(api.listCases()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('retains structured safe API errors without rendering raw server pages', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ error: { code: 'CASE_LIMIT', message: 'Two cases are allowed.', request_id: 'test-request' } }, { status: 429 })).mockResolvedValueOnce(new Response('<html>internal server details</html>', { status: 500 }));
    const api = createApiClient('http://127.0.0.1:8000', async () => ({}), fetcher);
    await expect(api.listCases()).rejects.toMatchObject({ code: 'CASE_LIMIT', message: 'Two cases are allowed.', requestId: 'test-request' });
    await expect(api.listCases()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('does not retry an uncertain write automatically', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network failed'));
    const api = createApiClient('http://127.0.0.1:8000', async () => ({}), fetcher);
    await expect(api.createCase(toCaseCreate(demoDefaults()))).rejects.toMatchObject({ code: 'CONNECTION_FAILED', message: expect.stringContaining('Refresh your cases') });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
