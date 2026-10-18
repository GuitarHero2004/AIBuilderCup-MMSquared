import type { AssistantAction, AssistantCancellation, AssistantEvents, AssistantResult, AssistantRun, AssistantRunList } from '../../api/types';
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const text = (value: unknown, max: number, empty = false): value is string => typeof value === 'string' && Array.from(value).length <= max && (empty || value.trim().length > 0);
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const nullableId = (value: unknown) => value === null || id(value);
const integer = (value: unknown, min: number, max = 1000000): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const timestamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const key = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value);
const oneOf = (value: unknown, options: string[]) => typeof value === 'string' && options.includes(value);
export function isAssistantAction(value: unknown): value is AssistantAction {
  if (!object(value) || !oneOf(value.kind, ['open_review', 'open_comparison', 'open_selection', 'open_intake']) || !text(value.label, 160) || !id(value.case_id) || !integer(value.expected_case_revision, 1) || !nullableId(value.quote_id) || !nullableId(value.selection_id) || !(value.field_path === null || text(value.field_path, 180) && /^[a-z][a-z0-9_.[\]]*$/.test(value.field_path))) return false;
  return value.kind === 'open_review' ? id(value.quote_id) && value.selection_id === null : value.kind === 'open_selection' ? id(value.selection_id) && value.quote_id === null && value.field_path === null : value.quote_id === null && value.selection_id === null && value.field_path === null;
}
function isResult(value: unknown): value is AssistantResult {
  if (!object(value) || !text(value.summary, 3000) || !(value.clarification_draft === null || text(value.clarification_draft, 6000)) || !Array.isArray(value.facts) || value.facts.length > 60 || !Array.isArray(value.referenced_fact_ids) || value.referenced_fact_ids.length > 24 || !Array.isArray(value.actions) || value.actions.length > 6) return false;
  if (!value.facts.every(fact => object(fact) && text(fact.id, 80) && /^[a-z][a-z0-9_]*$/.test(fact.id) && text(fact.label, 250) && text(fact.value, 2000, true) && nullableId(fact.quote_id))) return false;
  const facts = new Set(value.facts.map(fact => fact.id));
  return facts.size === value.facts.length && new Set(value.referenced_fact_ids).size === value.referenced_fact_ids.length && value.referenced_fact_ids.every(reference => typeof reference === 'string' && facts.has(reference)) && value.actions.every(isAssistantAction);
}
export function isAssistantRun(value: unknown): value is AssistantRun {
  if (!object(value) || !id(value.id) || !id(value.case_id) || !key(value.request_key) || !oneOf(value.intent, ['quote_help', 'explain_comparison', 'explain_selection']) || !oneOf(value.screen, ['workspace', 'case', 'intake', 'review', 'comparison', 'selection']) || !text(value.message, 4000) || Array.from(value.message).length > 2000 || !oneOf(value.status, ['running', 'succeeded', 'failed', 'cancelled', 'timed_out', 'interrupted']) || !integer(value.expected_case_revision, 1) || !(value.expected_draft_revision === null || integer(value.expected_draft_revision, 0)) || !nullableId(value.quote_id) || !nullableId(value.selection_id) || typeof value.source_fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.source_fingerprint) || typeof value.has_unsaved_changes !== 'boolean' || !(value.is_current === null || typeof value.is_current === 'boolean') || !timestamp(value.started_at) || !(value.completed_at === null || timestamp(value.completed_at)) || !text(value.model_id, 200) || !text(value.prompt_version, 100) || !integer(value.model_call_count, 0, 6) || !integer(value.tool_call_count, 0, 8)) return false;
  if (!(value.error === null || object(value.error) && text(value.error.code, 100) && text(value.error.message, 2000) && typeof value.error.retryable === 'boolean')) return false;
  if (value.intent === 'quote_help' ? !id(value.quote_id) || value.expected_draft_revision === null || value.selection_id !== null : value.quote_id !== null || value.expected_draft_revision !== null) return false;
  if ((value.intent === 'explain_selection') !== (value.selection_id !== null)) return false;
  if (value.status === 'running' ? value.completed_at !== null : value.completed_at === null) return false;
  if (value.status === 'succeeded') {
    if (!isResult(value.result) || value.error !== null) return false;
    return value.result.actions.every(action => action.case_id === value.case_id && action.expected_case_revision === value.expected_case_revision);
  }
  return value.result === null;
}
export function isAssistantRunList(value: unknown): value is AssistantRunList {
  return object(value) && id(value.case_id) && Array.isArray(value.items) && value.items.length <= 20 && value.items.every(item => isAssistantRun(item) && item.case_id === value.case_id) && new Set(value.items.map(item => item.id)).size === value.items.length;
}
export function isAssistantEvents(value: unknown): value is AssistantEvents {
  if (!object(value) || !id(value.run_id) || !Array.isArray(value.items) || value.items.length > 80) return false;
  return value.items.every((event, index, events) => object(event) && integer(event.sequence, 1, 80) && (index === 0 || event.sequence > events[index - 1].sequence) && oneOf(event.event_type, ['run_started', 'agent_started', 'tool_started', 'tool_completed', 'run_completed', 'run_failed']) && (event.agent_name === null || oneOf(event.agent_name, ['coordinator', 'quotation_specialist', 'sourcing_specialist'])) && (event.tool_name === null || oneOf(event.tool_name, ['quotation_specialist', 'sourcing_specialist', 'read_saved_context'])) && text(event.message, 240) && timestamp(event.timestamp));
}
export function isAssistantCancellation(value: unknown): value is AssistantCancellation {
  return object(value) && key(value.request_key) && id(value.case_id) && oneOf(value.state, ['cancelled', 'recorded']) && nullableId(value.run_id) && (value.state !== 'recorded' || id(value.run_id));
}
