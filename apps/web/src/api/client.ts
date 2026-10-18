import type { CaseCreate, CaseList, CaseRead, CaseComparison, QuoteList, QuoteRead, MutationReceipt, OperationRead, SaveDraft, ConfirmQuote, ExtractRequest, RunRead, RunEvents, CloseOperation, OperationResolution } from './types';
import { isCaseList, isCaseRead } from './response';
import { isCaseComparison } from '../features/connected-comparison/response';
import { isQuoteList, isQuoteRead, isMutationReceipt, isOperationRead, isRunRead, isRunEvents, isOperationResolution } from '../features/connected-quotations/response';

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly requestId?: string, public readonly outcomeUnknown = false, public readonly runId?: string) { super(message); }
}

function isErrorEnvelope(value: unknown): value is { error: { code: string; message: string; request_id?: string; run_id?: string } } {
  if (!value || typeof value !== 'object' || !('error' in value)) return false;
  const error = value.error;
  return !!error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    && 'message' in error && typeof error.message === 'string';
}

type RequestOptions = { body?: unknown; form?: FormData; key?: string; timeout?: number; cases?: boolean };
export function createApiClient(baseUrl: string, authHeaders: () => Promise<Record<string, string>>, fetcher: typeof fetch = fetch) {
  async function send(path: string, method: 'GET' | 'POST' | 'PATCH', options: RequestOptions = {}): Promise<Response> {
    // Authentication failures occur before dispatch and never imply a successful mutation.
    const headers = await authHeaders();
    try {
      return await fetcher(`${baseUrl}${path}`, {
        method,
        headers: { ...headers, Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.key ? { 'Idempotency-Key': options.key } : {}) },
        body: options.form ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
        credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(options.timeout ?? 15000),
      });
    } catch {
      throw new ApiError(method !== 'GET'
        ? options.cases ? 'The save could not be confirmed. Refresh your cases before creating another.' : 'The result could not be confirmed. Check the recorded operation before trying again.'
        : 'The workspace could not reach the server. Check the connection and try again.', 'CONNECTION_FAILED', undefined, method !== 'GET');
    }
  }
  async function request<T>(path: string, method: 'GET' | 'POST' | 'PATCH', valid: (value: unknown) => value is T, options: RequestOptions = {}): Promise<T> {
    const response = await send(path, method, options);
    let data: unknown;
    try { data = await response.json(); } catch {
      throw new ApiError('The server returned an unreadable response. Check the saved result before trying again.', 'INVALID_RESPONSE', undefined, method !== 'GET');
    }
    if (!response.ok) {
      if (isErrorEnvelope(data)) {
        const unknown = method !== 'GET' && (response.status >= 500 && data.error.code !== 'STORAGE_CONTENTION' || ['IDEMPOTENCY_CONFLICT', 'OPERATION_IN_PROGRESS', 'REVIEW_OPERATION_IN_PROGRESS', 'INTAKE_IN_PROGRESS', 'RUN_IN_PROGRESS'].includes(data.error.code));
        throw new ApiError(unknown ? 'The result could not be confirmed. Check the recorded operation before trying again.' : data.error.message, data.error.code, data.error.request_id, unknown, data.error.run_id);
      }
      throw new ApiError(response.status === 401 ? 'Your session could not be verified. Refresh the page and try again.' : 'The request could not be completed. Check the saved result before trying again.', `HTTP_${response.status}`, undefined, method !== 'GET' && response.status >= 500);
    }
    if (!valid(data)) throw new ApiError('The server response could not be verified. Check the recorded operation before trying again.', 'INVALID_RESPONSE', undefined, method !== 'GET');
    return data;
  }
  const casePath = (caseId: string) => `/api/v1/cases/${encodeURIComponent(caseId)}`;
  const quotePath = (caseId: string, quoteId: string) => `${casePath(caseId)}/quotes/${encodeURIComponent(quoteId)}`;
  return {
    listCases: () => request<CaseList>('/api/v1/cases', 'GET', isCaseList),
    getCase: (caseId: string) => request<CaseRead>(casePath(caseId), 'GET', isCaseRead),
    createCase: (input: CaseCreate) => request<CaseRead>('/api/v1/cases', 'POST', isCaseRead, { body: input, cases: true }),
    getComparison: (caseId: string) => request<CaseComparison>(`${casePath(caseId)}/comparison`, 'GET', (value): value is CaseComparison => isCaseComparison(value) && value.case_id === caseId),
    listQuotes: (caseId: string) => request<QuoteList>(`${casePath(caseId)}/quotes`, 'GET', isQuoteList),
    getQuote: (caseId: string, quoteId: string) => request<QuoteRead>(quotePath(caseId, quoteId), 'GET', isQuoteRead),
    uploadQuote: (caseId: string, file: File, revision: number, key: string) => {
      const form = new FormData(); form.append('file', file); form.append('expected_case_revision', String(revision)); form.append('is_synthetic', 'true');
      return request<MutationReceipt>(`${casePath(caseId)}/quotes`, 'POST', isMutationReceipt, { form, key, timeout: 45000 });
    },
    getIntakeOperation: (caseId: string, key: string) => request<OperationRead>(`${casePath(caseId)}/quote-intakes/${encodeURIComponent(key)}`, 'GET', isOperationRead),
    saveDraft: (caseId: string, quoteId: string, body: SaveDraft, key: string) => request<MutationReceipt>(`${quotePath(caseId, quoteId)}/draft`, 'PATCH', isMutationReceipt, { body, key }),
    confirmQuote: (caseId: string, quoteId: string, body: ConfirmQuote, key: string) => request<MutationReceipt>(`${quotePath(caseId, quoteId)}/confirm`, 'POST', isMutationReceipt, { body, key }),
    getReviewOperation: (caseId: string, quoteId: string, key: string) => request<OperationRead>(`${quotePath(caseId, quoteId)}/review-operations/${encodeURIComponent(key)}`, 'GET', isOperationRead),
    extractQuote: (caseId: string, body: ExtractRequest, key: string) => request<RunRead>(`${casePath(caseId)}/agent-runs`, 'POST', isRunRead, { body, key, timeout: 130000 }),
    getRun: (caseId: string, runId: string) => request<RunRead>(`${casePath(caseId)}/runs/${encodeURIComponent(runId)}`, 'GET', isRunRead),
    getRunOperation: (caseId: string, key: string) => request<RunRead>(`${casePath(caseId)}/run-operations/${encodeURIComponent(key)}`, 'GET', isRunRead),
    getRunEvents: (caseId: string, runId: string) => request<RunEvents>(`${casePath(caseId)}/runs/${encodeURIComponent(runId)}/events`, 'GET', isRunEvents),
    closeOperation: (caseId: string, key: string, body: CloseOperation) => request<OperationResolution>(`${casePath(caseId)}/quotation-operations/${encodeURIComponent(key)}/cancel`, 'POST', isOperationResolution, { body }),
    getDocument: async (caseId: string, quoteId: string): Promise<Blob> => {
      const response = await send(`${quotePath(caseId, quoteId)}/document`, 'GET', { timeout: 30000 });
      if (!response.ok) {
        let error: unknown; try { error = await response.json(); } catch { /* Never render a raw server page. */ }
        throw new ApiError(isErrorEnvelope(error) ? error.error.message : 'The private source PDF could not be loaded.', isErrorEnvelope(error) ? error.error.code : `HTTP_${response.status}`);
      }
      if (response.headers.get('content-type')?.split(';')[0] !== 'application/pdf') throw new ApiError('The source response was not a PDF.', 'INVALID_DOCUMENT');
      const blob = await response.blob();
      if (blob.size > 10 * 1024 * 1024 || new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer()) !== '%PDF-') throw new ApiError('The source PDF could not be verified.', 'INVALID_DOCUMENT');
      return blob;
    },
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
