import type { QuoteData, QuoteList, QuoteRead, MutationReceipt, RunRead, RunEvents, OperationResolution } from '../../api/types';
const obj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string';
const id = (v: unknown) => text(v) && /^[a-f0-9]{32}$/.test(v);
const key = (v: unknown) => text(v) && /^[A-Za-z0-9_-]{8,100}$/.test(v);
const integer = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v));
const nullableText = (v: unknown) => v === null || text(v);
const nullableNumber = (v: unknown) => v === null || integer(v);
const nullableBoolean = (v: unknown) => v === null || typeof v === 'boolean';
const texts = (v: unknown) => Array.isArray(v) && v.every(text);
const runError = (v: unknown) => v === null || obj(v) && text(v.code) && text(v.message) && typeof v.retryable === 'boolean';
const provenance = (v: unknown) => obj(v) && text(v.field_path) && text(v.source_type) && nullableText(v.document_sha256) && nullableNumber(v.page_number) && nullableText(v.excerpt) && text(v.review_state) && nullableText(v.note);
const decision = (v: unknown) => obj(v) && text(v.field_path) && typeof v.reviewed === 'boolean' && ['extracted', 'correction', 'assumption'].includes(String(v.basis)) && nullableText(v.note);
export function isQuoteData(v: unknown): v is QuoteData {
  if (!obj(v) || !nullableText(v.supplier_name) || !obj(v.commercial) || !obj(v.textile_specification) || !obj(v.supply_chain) || !texts(v.evidence_claims) || !texts(v.evidence_reviews)) return false;
  const c = v.commercial, t = v.textile_specification, s = v.supply_chain;
  return ['unit_price_amount','price_unit','currency','quoted_quantity','quantity_unit','moq','moq_unit','incoterm_text','payment_terms','quote_valid_until','cost_basis_id'].every(k => nullableText(c[k]))
    && texts(c.included_charges) && texts(c.excluded_charges) && texts(c.cost_adjustments) && nullableBoolean(c.cost_basis_reviewed)
    && ['construction','gsm','usable_width_cm','total_width_cm','colour','finish','recycled_content_pct'].every(k => nullableText(t[k]))
    && Array.isArray(t.composition) && t.composition.every(p => obj(p) && text(p.fibre) && text(p.percentage))
    && ['production_lead_time_days','shipping_lead_time_days','end_to_end_lead_time_days'].every(k => nullableNumber(s[k]))
    && ['lead_time_basis','actual_net_fabric_mass_kg','actual_gross_shipment_mass_kg','packaging_mass_kg','carbon_scope_id'].every(k => nullableText(s[k]))
    && ['lead_time_basis_reviewed','actual_mass_covers_order','route_complete'].every(k => nullableBoolean(s[k]))
    && Array.isArray(s.legs) && s.legs.every(l => obj(l) && text(l.leg_id) && ['origin_label','destination_label','transport_mode','distance_km','distance_source_type','distance_source_note','factor_id'].every(k => nullableText(l[k])));
}
export function isRunRead(v: unknown): v is RunRead {
  return obj(v) && id(v.id) && id(v.quote_id) && key(v.request_key) && ['running','succeeded','awaiting_review','failed','cancelled','timed_out','interrupted'].includes(String(v.status)) && v.ai_mode === 'live'
    && integer(v.expected_case_revision) && integer(v.expected_draft_revision) && date(v.started_at) && (v.completed_at === null || date(v.completed_at)) && runError(v.error) && integer(v.model_call_count);
}
export function isQuoteRead(v: unknown): v is QuoteRead {
  if (!obj(v) || !id(v.id) || !id(v.case_id) || !integer(v.case_data_revision) || v.case_data_revision < 1 || !integer(v.draft_revision) || !obj(v.source_file) || v.source_kind !== 'upload' || v.is_synthetic !== true || !['uploaded','extracting','needs_review','confirmed','failed'].includes(String(v.status)) || !date(v.created_at) || !date(v.updated_at)) return false;
  const source = v.source_file;
  return text(source.name) && source.mime_type === 'application/pdf' && integer(source.bytes) && integer(source.pages) && source.pages > 0 && text(source.sha256) && /^[a-f0-9]{64}$/.test(source.sha256)
    && (v.source_extraction_run_id === null || id(v.source_extraction_run_id)) && (v.draft_data === null || isQuoteData(v.draft_data))
    && (v.raw_extraction === null || obj(v.raw_extraction) && isQuoteData(v.raw_extraction.draft_data) && Array.isArray(v.raw_extraction.field_provenance) && v.raw_extraction.field_provenance.every(provenance) && texts(v.raw_extraction.warnings))
    && Array.isArray(v.field_provenance) && v.field_provenance.every(provenance) && Array.isArray(v.review_decisions) && v.review_decisions.every(decision)
    && Array.isArray(v.issues) && v.issues.every(i => obj(i) && text(i.field_path) && text(i.code) && text(i.message) && text(i.severity) && texts(i.blocks) && typeof i.blocks_confirmation === 'boolean')
    && (v.confirmation === null || obj(v.confirmation) && id(v.confirmation.revision_id) && integer(v.confirmation.draft_revision) && date(v.confirmation.confirmed_at) && typeof v.confirmation.is_current === 'boolean')
    && (v.latest_run === null || isRunRead(v.latest_run));
}
export function isQuoteList(v: unknown): v is QuoteList {
  return obj(v) && id(v.case_id) && integer(v.case_data_revision) && v.case_data_revision > 0 && Array.isArray(v.items) && v.items.length <= 4 && v.items.every(i => isQuoteRead(i) && i.case_id === v.case_id && i.case_data_revision === v.case_data_revision) && new Set(v.items.map(i => (i as QuoteRead).id)).size === v.items.length
    && obj(v.limits) && ['maximum_quotes_per_case','remaining_quote_slots','maximum_file_bytes','maximum_pdf_pages'].every(k => integer(v.limits && obj(v.limits) ? v.limits[k] : null))
    && obj(v.capabilities) && typeof v.capabilities.upload_enabled === 'boolean' && typeof v.capabilities.extraction_enabled === 'boolean' && nullableText(v.capabilities.upload_reason) && nullableText(v.capabilities.extraction_reason)
    && obj(v.data_handling) && text(v.data_handling.processing_notice) && text(v.data_handling.retention_notice) && Array.isArray(v.samples) && v.samples.length === 0;
}
export function isMutationReceipt(v: unknown): v is MutationReceipt {
  if (!obj(v) || !key(v.request_key) || !['upload','save','confirm'].includes(String(v.kind)) || !['receiving','saving','committed','rejected','interrupted'].includes(String(v.state)) || !nullableNumber(v.case_data_revision) || !nullableNumber(v.draft_revision) || !nullableText(v.quote_id) || !nullableText(v.revision_id) || !runError(v.error) || typeof v.retryable !== 'boolean' || !(v.quote === null || isQuoteRead(v.quote))) return false;
  return v.state !== 'committed' || isQuoteRead(v.quote) && v.quote_id === v.quote.id && v.case_data_revision === v.quote.case_data_revision && v.draft_revision === v.quote.draft_revision && (v.kind !== 'confirm' || v.revision_id === v.quote.confirmation?.revision_id && v.quote.confirmation?.is_current === true && v.quote.confirmation.draft_revision === v.draft_revision);
}
export const isOperationRead = isMutationReceipt;
export function isRunEvents(v: unknown): v is RunEvents {
  return obj(v) && id(v.run_id) && Array.isArray(v.items) && v.items.every(e => obj(e) && integer(e.sequence) && text(e.event_type) && e.agent_name === null && text(e.tool_name) && text(e.message) && date(e.timestamp));
}

export function isOperationResolution(v: unknown): v is OperationResolution {
  return obj(v) && key(v.request_key) && ['upload','save','confirm','extract'].includes(String(v.kind)) && ['cancelled','recorded'].includes(String(v.state)) && (v.quote_id === null || id(v.quote_id)) && (v.run_id === null || id(v.run_id)) && text(v.message);
}