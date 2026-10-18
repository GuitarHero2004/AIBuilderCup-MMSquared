import type { CaseComparison, SelectionCreate, SelectionRecord } from '../../api/types';
export interface SelectionSource { comparison: CaseComparison; quoteId: string }
export interface SelectionAttempt { key: string; selectionId?: string; body?: SelectionCreate }
export const selectionStorageKey = (ownerId: string, caseId: string) => 'greenprocure:pending-selection:' + ownerId + ':' + caseId;
export function readSelectionAttempt(ownerId: string, caseId: string): SelectionAttempt | null {
  try {
    const raw = sessionStorage.getItem(selectionStorageKey(ownerId, caseId));
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== 'object' || !('key' in value) || typeof value.key !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(value.key)) return null;
    const selectionId = 'selectionId' in value ? value.selectionId : undefined;
    if (selectionId !== undefined && (typeof selectionId !== 'string' || !/^[a-f0-9]{32}$/.test(selectionId))) return null;
    return { key: value.key, selectionId };
  } catch { return null; }
}
export function selectionMatchesAttempt(record: SelectionRecord, attempt: SelectionAttempt): boolean {
  if (attempt.selectionId && record.id !== attempt.selectionId) return false;
  const input = attempt.body;
  return !input || record.selected_quote_id === input.selected_quote_id
    && record.selected_confirmed_revision_id === input.expected_confirmed_revision_id
    && record.case_data_revision === input.expected_case_revision
    && record.input_fingerprint === input.expected_input_fingerprint
    && record.selection_reason === input.selection_reason;
}
