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
  it('requires readback for ambiguous server failures but allows retry of explicitly aborted contention', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ error: { code: 'STORAGE_UNAVAILABLE', message: 'Retry shortly.' } }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: { code: 'STORAGE_CONTENTION', message: 'Retry shortly.' } }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({}, { status: 502 }));
    const api = createApiClient('http://127.0.0.1:8000', async () => ({}), fetcher);
    const input = toCaseCreate(demoDefaults());
    await expect(api.createCase(input)).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE', outcomeUnknown: true });
    await expect(api.createCase(input)).rejects.toMatchObject({ code: 'STORAGE_CONTENTION', outcomeUnknown: false });
    await expect(api.createCase(input)).rejects.toMatchObject({ code: 'HTTP_502', outcomeUnknown: true });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('rejects malformed successful payloads before the UI discards its draft', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({}, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ items: [{}] }));
    const api = createApiClient('http://127.0.0.1:8000', async () => ({}), fetcher);
    await expect(api.createCase(toCaseCreate(demoDefaults()))).rejects.toMatchObject({ code: 'INVALID_RESPONSE', outcomeUnknown: true });
    await expect(api.listCases()).rejects.toMatchObject({ code: 'INVALID_RESPONSE', outcomeUnknown: false });
  });
  it('accepts the current case contract and rejects damaged nested requirements', async () => {
    const saved = {
      ...toCaseCreate(demoDefaults()), id: 'a'.repeat(32), status: 'draft', data_revision: 1,
      schema_version: '2.0', is_synthetic_demo: true, created_at: '2026-10-14T09:00:00Z', updated_at: '2026-10-14T09:00:00Z',
    };
    const damaged = { ...saved, requirement: { ...saved.requirement, textile_specification: { ...saved.requirement.textile_specification, composition: null } } };
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(saved, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ items: [saved] }))
      .mockResolvedValueOnce(Response.json(damaged, { status: 201 }));
    const api = createApiClient('http://127.0.0.1:8000', async () => ({}), fetcher);
    expect(await api.createCase(toCaseCreate(demoDefaults()))).toEqual(saved);
    expect(await api.listCases()).toEqual({ items: [saved] });
    await expect(api.createCase(toCaseCreate(demoDefaults()))).rejects.toMatchObject({ code: 'INVALID_RESPONSE', outcomeUnknown: true });
  });
});
