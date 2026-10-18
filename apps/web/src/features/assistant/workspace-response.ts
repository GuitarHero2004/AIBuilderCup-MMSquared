import type { WorkspaceAssistantAction, WorkspaceAssistantSnapshot, WorkspaceNavigationResult } from '../../api/types';
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && Array.from(value).length <= max;
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const fingerprint = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const globalKinds = ['open_workspace', 'open_help', 'create_case'];
export function isWorkspaceAssistantAction(value: unknown): value is WorkspaceAssistantAction {
  if (!object(value) || !text(value.id, 101) || !/^[a-z][a-z0-9_:]*$/.test(value.id) || !text(value.label, 240) || typeof value.kind !== 'string') return false;
  if (globalKinds.includes(value.kind)) return value.case_id === null && value.expected_case_revision === null;
  return ['open_case', 'open_intake', 'open_comparison', 'open_history'].includes(value.kind) && id(value.case_id) && integer(value.expected_case_revision, 1, 1000000);
}
export function isWorkspaceAssistantSnapshot(value: unknown): value is WorkspaceAssistantSnapshot {
  if (!object(value) || !fingerprint(value.workspace_fingerprint) || !Array.isArray(value.cases) || value.cases.length > 2 || !Array.isArray(value.actions) || value.actions.length > 11) return false;
  if (!value.cases.every(item => object(item) && id(item.id) && text(item.name, 160) && integer(item.data_revision, 1, 1000000) && integer(item.quotation_count, 0, 4) && integer(item.confirmed_count, 0, item.quotation_count) && integer(item.selection_count, 0, 20))) return false;
  if (new Set(value.cases.map(item => item.id)).size !== value.cases.length || !value.actions.every(isWorkspaceAssistantAction) || new Set(value.actions.map(action => action.id)).size !== value.actions.length) return false;
  const cases = value.cases;
  return value.actions.every(action => action.case_id === null || cases.some(item => item.id === action.case_id && item.data_revision === action.expected_case_revision));
}
export function isWorkspaceNavigationResult(value: unknown): value is WorkspaceNavigationResult {
  if (!object(value) || !text(value.request_key, 100) || !/^[A-Za-z0-9_-]{8,100}$/.test(value.request_key) || !fingerprint(value.workspace_fingerprint) || !integer(value.model_call_count, 0, 3) || ![null, true, false].includes(value.is_current as boolean | null) || !Array.isArray(value.actions) || value.actions.length > 4 || !value.actions.every(isWorkspaceAssistantAction) || new Set(value.actions.map(action => action.id)).size !== value.actions.length) return false;
  if (!(value.error === null || object(value.error) && text(value.error.code, 100) && text(value.error.message, 2000) && typeof value.error.retryable === 'boolean')) return false;
  if (value.status === 'succeeded') return text(value.summary, 3000) && value.actions.length > 0 && value.error === null;
  return ['running', 'failed', 'cancelled', 'timed_out', 'interrupted'].includes(String(value.status)) && value.summary === null && value.actions.length === 0 && (value.status !== 'running' || value.error === null);
}
