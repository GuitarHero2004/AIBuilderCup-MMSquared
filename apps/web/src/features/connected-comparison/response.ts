import type { CaseComparison, CaseRequirement } from '../../api/types';

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, maximum = 2000): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum && Array.from(value).every(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127);
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const integer = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const decimal = (value: unknown): value is string => typeof value === 'string' && value.length <= 128 && /^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value);
const inputDecimal = (value: unknown): value is string => decimal(value) && /^(0|[1-9][0-9]{0,11})(\.[0-9]{1,6})?$/.test(value);
const nullableDecimal = (value: unknown) => value === null || decimal(value);
const texts = (value: unknown, maximum = 100): value is string[] => Array.isArray(value) && value.length <= maximum && value.every(item => text(item));
const nullableText = (value: unknown, maximum = 2000) => value === null || text(value, maximum);
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value;
const timestamp = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && date(value.slice(0, 10)) && Number.isFinite(Date.parse(value));

function decimalIntegers(amounts: string[]): bigint[] {
  const scale = Math.max(...amounts.map(amount => amount.split('.')[1]?.length ?? 0));
  return amounts.map(amount => { const [whole, fraction = ''] = amount.split('.'); return BigInt(whole + fraction.padEnd(scale, '0')); });
}
function compareDecimal(left: string, right: string): number {
  const [a, b] = decimalIntegers([left, right]);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isComparisonRequirement(value: unknown): value is CaseRequirement {
  if (!record(value) || !inputDecimal(value.quantity) || /^0(?:\.0+)?$/.test(value.quantity) || value.quantity_unit !== 'metre'
    || !inputDecimal(value.maximum_budget_amount) || /^0(?:\.0+)?$/.test(value.maximum_budget_amount) || value.currency !== 'USD'
    || !integer(value.maximum_lead_time_days, 1, 3650) || !date(value.order_reference_date)
    || !record(value.destination) || !text(value.destination.label, 160) || value.destination.country_code !== 'VN'
    || !text(value.cost_basis_id, 160) || !text(value.cost_basis_description, 160)
    || !text(value.carbon_scope_id, 160) || value.carbon_accounting_boundary !== 'wtw') return false;
  const spec = value.textile_specification;
  return record(spec) && spec.construction === 'woven'
    && Array.isArray(spec.composition) && spec.composition.length >= 1 && spec.composition.length <= 10
    && spec.composition.every(part => record(part) && typeof part.fibre === 'string' && /^[a-z][a-z_]{0,39}$/.test(part.fibre) && inputDecimal(part.percentage) && Number(part.percentage) <= 100)
    && new Set(spec.composition.map(part => (part as { fibre: string }).fibre)).size === spec.composition.length
    && ['composition_tolerance_pp', 'gsm_tolerance_pct'].every(key => inputDecimal(spec[key]) && Number(spec[key]) <= 100)
    && ['target_gsm', 'minimum_usable_width_cm'].every(key => inputDecimal(spec[key]) && !/^0(?:\.0+)?$/.test(String(spec[key])))
    && nullableText(spec.required_colour, 160) && nullableText(spec.required_finish, 160)
    && Array.isArray(spec.required_evidence) && spec.required_evidence.length === 0;
}

export function isCaseComparison(value: unknown): value is CaseComparison {
  if (!record(value) || !id(value.case_id) || !integer(value.case_data_revision, 1) || !timestamp(value.checked_at)
    || typeof value.input_fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(value.input_fingerprint)
    || value.scope !== 'confirmed_quote_checks_v1' || value.carbon_available !== false || value.ranking_available !== false
    || !isComparisonRequirement(value.requirement) || !texts(value.limitations, 20)
    || !Array.isArray(value.rows) || value.rows.length > 4) return false;
  const rows = value.rows;
  if (new Set(rows.map(row => record(row) ? row.quote_id : null)).size !== rows.length) return false;
  const validRows = rows.every(row => {
    if (!record(row) || !id(row.quote_id) || !text(row.source_name, 255) || !nullableText(row.supplier_name, 500)
      || !(row.confirmation_revision_id === null || id(row.confirmation_revision_id)) || !integer(row.draft_revision)
      || !['meets_checked_requirements', 'does_not_meet_requirements', 'needs_review', 'unconfirmed'].includes(String(row.status))
      || !record(row.metrics) || !Array.isArray(row.checks) || row.checks.length < 1 || row.checks.length > 100) return false;
    const metrics = row.metrics;
    if (!['quoted_cost_amount', 'comparable_cost_amount', 'net_fabric_mass_kg'].every(key => nullableDecimal(metrics[key]))
      || !(metrics.currency === null || typeof metrics.currency === 'string' && /^[A-Z]{3}$/.test(metrics.currency))
      || ![null, 'actual', 'estimated'].includes(metrics.net_mass_basis as null | string)
      || !(metrics.end_to_end_lead_time_days === null || integer(metrics.end_to_end_lead_time_days, 0, 3650))
      || !(metrics.arrival_date === null || date(metrics.arrival_date))) return false;
    if ((metrics.net_fabric_mass_kg === null) !== (metrics.net_mass_basis === null)
      || (metrics.arrival_date !== null && metrics.end_to_end_lead_time_days === null)
      || (metrics.comparable_cost_amount !== null && metrics.currency === null)) return false;
    if (!row.checks.every(check => record(check) && text(check.code, 100)
      && ['pass', 'fail', 'needs_review', 'not_applicable'].includes(String(check.status))
      && text(check.message) && texts(check.field_paths, 50))) return false;
    const checks = row.checks as { status: string }[];
    if (row.status === 'unconfirmed') return row.confirmation_revision_id === null && Object.values(metrics).every(item => item === null);
    if (!id(row.confirmation_revision_id)) return false;
    if (row.status === 'meets_checked_requirements') return checks.every(check => ['pass', 'not_applicable'].includes(check.status));
    if (row.status === 'does_not_meet_requirements') return checks.some(check => check.status === 'fail');
    return checks.some(check => check.status === 'needs_review') && !checks.some(check => check.status === 'fail');
  });
  if (!validRows) return false;
  // Older saved snapshots have no trade-off summary. Never invent one during readback.
  const tradeoff = value.tradeoff_summary;
  if (tradeoff === undefined || tradeoff === null) return true;
  if (!record(tradeoff) || tradeoff.kind !== 'faster_costs_more'
    || !id(tradeoff.cheaper_quote_id) || !id(tradeoff.faster_quote_id) || tradeoff.cheaper_quote_id === tradeoff.faster_quote_id
    || !decimal(tradeoff.additional_cost_amount) || /^0(?:\.0+)?$/.test(tradeoff.additional_cost_amount)
    || !integer(tradeoff.delivery_days_saved, 1, 3650)) return false;
  const checked = rows as CaseComparison['rows'];
  const candidates = checked.flatMap(row => {
    const metrics = row.metrics;
    return row.status === 'meets_checked_requirements' && metrics.comparable_cost_amount !== null
      && !/^0(?:\.0+)?$/.test(metrics.comparable_cost_amount) && metrics.currency !== null
      && metrics.end_to_end_lead_time_days !== null
      ? [{ quoteId: row.quote_id, cost: metrics.comparable_cost_amount, currency: metrics.currency, days: metrics.end_to_end_lead_time_days }] : [];
  });
  if (candidates.length < 2 || tradeoff.currency !== value.requirement.currency
    || candidates.some(row => row.currency !== tradeoff.currency)) return false;
  type Candidate = (typeof candidates)[number];
  const byId = (a: Candidate, b: Candidate) => a.quoteId < b.quoteId ? -1 : a.quoteId > b.quoteId ? 1 : 0;
  // Verify the server's extrema and tie rules; this guard never creates a summary.
  const cheaper = [...candidates].sort((a, b) => compareDecimal(a.cost, b.cost) || a.days - b.days || byId(a, b))[0];
  const faster = [...candidates].sort((a, b) => a.days - b.days || compareDecimal(a.cost, b.cost) || byId(a, b))[0];
  if (cheaper.quoteId !== tradeoff.cheaper_quote_id || faster.quoteId !== tradeoff.faster_quote_id
    || faster.days + tradeoff.delivery_days_saved !== cheaper.days) return false;
  // Check the supplied delta without floating-point rounding; display remains server-owned.
  const [lower, additional, higher] = decimalIntegers([cheaper.cost, tradeoff.additional_cost_amount, faster.cost]);
  return lower + additional === higher;
}
