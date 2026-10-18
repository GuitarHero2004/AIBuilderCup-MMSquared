import type { SelectionList, SelectionOperation, SelectionRead, SelectionRecord } from '../../api/types';
import { isCaseComparison } from '../connected-comparison/response';

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const fingerprint = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = (value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const text = (value: unknown, max = 2000): value is string => typeof value === 'string' && value.trim().length > 0 && Array.from(value).length <= max && Array.from(value).every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127);
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value.slice(0, 10) + 'T00:00:00Z').toISOString().slice(0, 10) === value.slice(0, 10);
export function selectionReasonIssue(value: string): string | null {
  if (!value.replace(/[\s\p{Cf}]/gu, '')) return 'Explain why you selected this quotation.';
  if (Array.from(value.trim()).length > 2000) return 'Keep your reason within 2,000 characters.';
  if (Array.from(value).some(char => (char.charCodeAt(0) < 32 && char !== '\n' && char !== '\t') || char.charCodeAt(0) === 127)) return 'Remove unsupported control characters from the reason.';
  return null;
}
const reason = (value: unknown): value is string => typeof value === 'string' && value === value.trim() && selectionReasonIssue(value) === null;
export function isSelectionRecord(value: unknown): value is SelectionRecord {
  if (!object(value) || !id(value.id) || !id(value.case_id) || value.record_type !== 'buyer_selection_note'
    || !id(value.selected_quote_id) || !id(value.selected_confirmed_revision_id) || !text(value.selected_by_uid, 128)
    || !reason(value.selection_reason) || !timestamp(value.created_at) || !integer(value.case_data_revision) || !fingerprint(value.input_fingerprint)
    || !isCaseComparison(value.comparison_snapshot) || !Array.isArray(value.limitations) || value.limitations.length > 30 || !value.limitations.every(item => text(item))) return false;
  const snapshot = value.comparison_snapshot;
  const selected = snapshot.rows.find(row => row.quote_id === value.selected_quote_id);
  return snapshot.case_id === value.case_id && snapshot.case_data_revision === value.case_data_revision && snapshot.input_fingerprint === value.input_fingerprint
    && selected?.confirmation_revision_id === value.selected_confirmed_revision_id && selected.status === 'meets_checked_requirements';
}
export function isSelectionRead(value: unknown): value is SelectionRead {
  if (!object(value) || !isSelectionRecord(value.selection) || !object(value.current_context) || !text(value.current_context.message)) return false;
  const context = value.current_context, revision = value.selection.case_data_revision;
  if (context.case_data_revision === null) return context.is_current === null;
  if (!integer(context.case_data_revision, revision)) return false;
  return context.is_current === null || context.is_current === false || context.is_current === true && context.case_data_revision === revision;
}
export function isSelectionList(value: unknown): value is SelectionList {
  if (!object(value) || !id(value.case_id) || value.maximum_selections !== 10 || !integer(value.remaining_selection_slots, 0, 10)
    || !Array.isArray(value.items) || value.items.length > 10 || value.remaining_selection_slots !== 10 - value.items.length) return false;
  if (new Set(value.items.map(item => object(item) ? item.id : null)).size !== value.items.length) return false;
  return value.items.every(item => object(item) && id(item.id) && item.case_id === value.case_id && id(item.selected_quote_id)
    && id(item.selected_confirmed_revision_id) && reason(item.selection_reason) && timestamp(item.created_at) && integer(item.case_data_revision)
    && fingerprint(item.input_fingerprint) && (item.supplier_name === null || text(item.supplier_name, 500)) && text(item.source_name, 255));
}
export function isSelectionOperation(value: unknown): value is SelectionOperation {
  return object(value) && typeof value.request_key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value.request_key)
    && id(value.case_id) && value.kind === 'selection_save'
    && (value.state === 'committed' && id(value.selection_id) || value.state === 'cancelled' && value.selection_id === null);
}
