import type { CaseList, CaseRead } from './types';

// Guard the fields consumed by the case UI before treating a response as saved.
// Domain validation and the authoritative contract remain in Pydantic/OpenAPI.
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const decimal = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d{0,11})(\.\d{1,6})?$/.test(value);
const timestamp = (value: unknown): value is string => text(value) && !Number.isNaN(Date.parse(value));
const nullableText = (value: unknown): value is string | null => value === null || text(value);

export function isCaseRead(value: unknown): value is CaseRead {
  if (!record(value) || !text(value.id) || !/^[a-f0-9]{32}$/.test(value.id) || !text(value.name)
    || !['draft', 'collecting_quotes', 'reviewing_quotes', 'ready', 'decided', 'archived'].includes(String(value.status)) || !Number.isInteger(value.data_revision) || Number(value.data_revision) < 1 || value.schema_version !== '2.0'
    || value.is_synthetic_demo !== true || !timestamp(value.created_at) || !timestamp(value.updated_at)) return false;
  const requirement = value.requirement;
  if (!record(requirement) || !decimal(requirement.quantity) || !decimal(requirement.maximum_budget_amount)
    || requirement.quantity_unit !== 'metre' || requirement.currency !== 'USD'
    || !Number.isInteger(requirement.maximum_lead_time_days)
    || !text(requirement.order_reference_date) || !/^\d{4}-\d{2}-\d{2}$/.test(requirement.order_reference_date)
    || !record(requirement.destination) || !text(requirement.destination.label) || requirement.destination.country_code !== 'VN'
    || !text(requirement.cost_basis_id) || !text(requirement.cost_basis_description)
    || !text(requirement.carbon_scope_id) || requirement.carbon_accounting_boundary !== 'wtw') return false;
  const textile = requirement.textile_specification;
  return record(textile) && textile.construction === 'woven'
    && Array.isArray(textile.composition) && textile.composition.length > 0
    && textile.composition.every((part: unknown) => record(part) && text(part.fibre) && decimal(part.percentage))
    && decimal(textile.composition_tolerance_pp) && decimal(textile.target_gsm)
    && decimal(textile.gsm_tolerance_pct) && decimal(textile.minimum_usable_width_cm)
    && nullableText(textile.required_colour) && nullableText(textile.required_finish)
    && Array.isArray(textile.required_evidence) && textile.required_evidence.every(text);
}

export function isCaseList(value: unknown): value is CaseList {
  return record(value) && Array.isArray(value.items) && value.items.every(isCaseRead);
}
