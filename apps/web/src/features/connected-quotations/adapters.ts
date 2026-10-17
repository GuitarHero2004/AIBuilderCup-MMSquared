import type { CaseRead, QuoteData, QuoteRead, SaveDraft } from '../../api/types';
import type { IntakeCaseInfo, IntakeQuotation } from '../quotations/types';
import type { ReviewDraft, ReviewField, ReviewIssue } from '../quotation-review/types';
import { collectReviewIssues, hasFieldEvidence } from '../quotation-review/model';
import { formatDecimal } from '../cases/format';

type FieldSpec = Omit<ReviewField, 'id' | 'originalValue' | 'source'> & { path: string; conversion?: 'integer' | 'boolean' | 'list' | 'composition' };
const units = [{ value: 'metre', label: 'Metre' }, { value: 'kg', label: 'Kilogram' }];
const yesNo = [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }];
const baseSpecs: FieldSpec[] = [
  { path: 'supplier_name', label: 'Supplier name', group: 'commercial', kind: 'text', requiredFor: ['Quotation identity'] },
  { path: 'textile_specification.construction', label: 'Construction', group: 'textile', kind: 'text', requiredFor: ['Technical checks'] },
  { path: 'textile_specification.composition', label: 'Fibre composition', group: 'textile', kind: 'text', conversion: 'composition', requiredFor: ['Technical checks'], help: 'Enter each fibre and percentage, separated by semicolons. For example: polyester 65%; cotton 35%. Keep the full composition; values are not rescaled.' },
  { path: 'textile_specification.gsm', label: 'Fabric weight', unit: 'GSM', group: 'textile', kind: 'decimal', requiredFor: ['Technical checks', 'Mass basis'] },
  { path: 'textile_specification.usable_width_cm', label: 'Usable width', unit: 'cm', group: 'textile', kind: 'decimal', requiredFor: ['Technical checks'] },
  { path: 'textile_specification.total_width_cm', label: 'Total width', unit: 'cm', group: 'textile', kind: 'decimal', requiredFor: ['Mass basis'], help: 'Total fabric width can differ from usable cutting width. Sharing one width requires a reviewed assumption.' },
  { path: 'textile_specification.colour', label: 'Colour', group: 'textile', kind: 'text' },
  { path: 'textile_specification.finish', label: 'Finish', group: 'textile', kind: 'text' },
  { path: 'textile_specification.recycled_content_pct', label: 'Claimed recycled content', group: 'textile', kind: 'decimal', unit: '%', numeric: { minimum: '0', maximum: '100' }, help: 'A supplier claim does not verify recycled content or certification.' },
  { path: 'commercial.quoted_quantity', label: 'Quoted quantity', group: 'commercial', kind: 'decimal', requiredFor: ['Order coverage'] },
  { path: 'commercial.quantity_unit', label: 'Quantity unit', group: 'commercial', kind: 'select', options: units, requiredFor: ['Order coverage'] },
  { path: 'commercial.unit_price_amount', label: 'Unit price', group: 'commercial', kind: 'decimal', requiredFor: ['Cost'] },
  { path: 'commercial.price_unit', label: 'Price unit', group: 'commercial', kind: 'select', options: units, requiredFor: ['Cost'] },
  { path: 'commercial.currency', label: 'Currency', group: 'commercial', kind: 'text', requiredFor: ['Cost'], help: 'Use the three-letter currency code from the quotation. No currency conversion is performed.' },
  { path: 'commercial.moq', label: 'Minimum order quantity', group: 'commercial', kind: 'decimal', numeric: { minimum: '0' }, requiredFor: ['MOQ check'] },
  { path: 'commercial.moq_unit', label: 'Minimum order unit', group: 'commercial', kind: 'select', options: units, requiredFor: ['MOQ check'] },
  { path: 'commercial.incoterm_text', label: 'Quoted Incoterm', group: 'commercial', kind: 'text' },
  { path: 'commercial.payment_terms', label: 'Payment terms', group: 'commercial', kind: 'text' },
  { path: 'commercial.quote_valid_until', label: 'Quote valid until', group: 'commercial', kind: 'date' },
  { path: 'commercial.cost_basis_id', label: 'Comparison cost boundary', group: 'commercial', kind: 'select', options: [{ value: 'delivered_to_buyer_excluding_tax_v1', label: 'Material and delivery to buyer; excludes tax and duties' }], requiredFor: ['Comparable cost'], help: 'Only select this boundary when the source or an explicit reviewed assumption supports it.' },
  { path: 'commercial.included_charges', label: 'Included charges', group: 'commercial', kind: 'text', conversion: 'list', help: 'Separate charge categories with semicolons, for example: material; delivery.' },
  { path: 'commercial.excluded_charges', label: 'Excluded charges', group: 'commercial', kind: 'text', conversion: 'list', help: 'Separate charge categories with semicolons, for example: tax; duties.' },
  { path: 'commercial.cost_basis_reviewed', label: 'Cost boundary established', group: 'commercial', kind: 'select', conversion: 'boolean', options: yesNo, requiredFor: ['Comparable cost'], help: 'Record your review of the boundary, including which charges are included. Unknown charges are never zero.' },
  { path: 'supply_chain.production_lead_time_days', label: 'Production time', group: 'delivery', kind: 'decimal', conversion: 'integer', unit: 'days' },
  { path: 'supply_chain.shipping_lead_time_days', label: 'Shipping time', group: 'delivery', kind: 'decimal', conversion: 'integer', unit: 'days' },
  { path: 'supply_chain.end_to_end_lead_time_days', label: 'Full-order lead time', group: 'delivery', kind: 'decimal', conversion: 'integer', unit: 'calendar days', requiredFor: ['Delivery'] },
  { path: 'supply_chain.lead_time_basis', label: 'Delivery basis', group: 'delivery', kind: 'select', options: [{ value: 'full_order_calendar_days_to_buyer', label: 'Full order arrives at buyer, calendar days' }, { value: 'production_only', label: 'Production only; arrival not established' }, { value: 'shipping_only', label: 'Shipping only; arrival not established' }, { value: 'unknown', label: 'Unclear quoted delivery basis' }], requiredFor: ['Delivery'] },
  { path: 'supply_chain.lead_time_basis_reviewed', label: 'Delivery basis established', group: 'delivery', kind: 'select', conversion: 'boolean', options: yesNo, requiredFor: ['Delivery'], help: 'Production and shipping time are not automatically added. Explain how the full-order arrival commitment is supported.' },
  { path: 'supply_chain.actual_net_fabric_mass_kg', label: 'Actual net fabric mass', group: 'logistics', kind: 'decimal', unit: 'kg', help: 'Net material mass is distinct from gross shipment mass.' },
  { path: 'supply_chain.actual_gross_shipment_mass_kg', label: 'Actual gross shipment mass', group: 'logistics', kind: 'decimal', unit: 'kg' },
  { path: 'supply_chain.actual_mass_covers_order', label: 'Actual mass covers the full order', group: 'logistics', kind: 'select', conversion: 'boolean', options: yesNo },
  { path: 'supply_chain.packaging_mass_kg', label: 'Packaging mass', group: 'logistics', kind: 'decimal', unit: 'kg', numeric: { minimum: '0' } },
  { path: 'supply_chain.carbon_scope_id', label: 'Transport boundary', group: 'logistics', kind: 'select', options: [{ value: 'origin_facility_to_buyer_facility_v1', label: 'Supplier origin facility to buyer facility' }], requiredFor: ['Carbon'] },
  { path: 'supply_chain.route_complete', label: 'Complete origin-to-buyer route', group: 'logistics', kind: 'select', conversion: 'boolean', options: yesNo, requiredFor: ['Carbon'] },
  { path: 'evidence_claims', label: 'Document and certificate claims', group: 'evidence', kind: 'text', conversion: 'list', help: 'Separate claims with semicolons. Recording a claim does not verify its issuer or applicability.' },
];

function readPath(data: unknown, path: string): unknown {
  return path.replace(/\[(\d+)\]/g, '.$1').split('.').reduce<unknown>((value, key) => value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined, data);
}
function writePath(data: QuoteData, path: string, value: unknown) {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let node: unknown = data;
  for (const key of keys.slice(0, -1)) node = (node as Record<string, unknown>)[key];
  (node as Record<string, unknown>)[keys.at(-1)!] = value;
}
function specs(quote: QuoteRead): FieldSpec[] {
  const result = [...baseSpecs];
  const legs = quote.draft_data?.supply_chain?.legs ?? [];
  if (!legs.length) result.push({ path: 'supply_chain.legs', label: 'Transport route details', group: 'logistics', kind: 'text', requiredFor: ['Carbon'], help: 'No route legs were extracted. Keep this unknown and explain the missing route; adding a route is not available in this slice.' });
  legs.forEach((_, index) => {
    const base = `supply_chain.legs[${index}]`, label = `Leg ${index + 1}`;
    result.push(
      { path: `${base}.origin_label`, label: `${label} · origin`, group: 'logistics', kind: 'text', requiredFor: ['Route coverage'] },
      { path: `${base}.destination_label`, label: `${label} · destination`, group: 'logistics', kind: 'text', requiredFor: ['Route coverage'] },
      { path: `${base}.transport_mode`, label: `${label} · transport mode`, group: 'logistics', kind: 'select', options: [{ value: 'road', label: 'Road' }, { value: 'sea', label: 'Sea' }], requiredFor: ['Carbon'] },
      { path: `${base}.distance_km`, label: `${label} · distance`, group: 'logistics', kind: 'decimal', unit: 'km', requiredFor: ['Carbon'] },
      { path: `${base}.distance_source_type`, label: `${label} · distance basis`, group: 'logistics', kind: 'select', options: [{ value: 'quotation_pdf', label: 'Quotation document' }, { value: 'synthetic_demo', label: 'Synthetic scenario distance' }, { value: 'user_entered_assumption', label: 'Buyer assumption' }], requiredFor: ['Carbon'] },
      { path: `${base}.distance_source_note`, label: `${label} · distance explanation`, group: 'logistics', kind: 'text' },
    );
  });
  return result.sort((a, b) => ['textile', 'commercial', 'delivery', 'logistics', 'evidence'].indexOf(a.group) - ['textile', 'commercial', 'delivery', 'logistics', 'evidence'].indexOf(b.group));
}
function displayValue(value: unknown, spec: FieldSpec): string {
  if (value === null || value === undefined) return '';
  if (spec.conversion === 'composition' && Array.isArray(value)) return value.map(part => `${part.fibre} ${part.percentage}%`).join('; ');
  if (Array.isArray(value)) return value.join('; ');
  return String(value);
}
export function reviewFields(quote: QuoteRead): ReviewField[] {
  return specs(quote).map(spec => {
    const evidence = quote.raw_extraction?.field_provenance?.find(item => item.field_path === spec.path);
    const matched = evidence?.document_sha256 === quote.source_file.sha256 && evidence?.page_number && evidence.page_number <= quote.source_file.pages;
    return { ...spec, id: spec.path, originalValue: displayValue(readPath(quote.raw_extraction?.draft_data, spec.path), spec) || null,
      numeric: spec.numeric ?? (spec.kind === 'decimal' ? spec.conversion === 'integer' ? { minimum: '0', maximum: '3650', integer: true } : { minimum: '0', exclusiveMinimum: true } : undefined),
      source: matched ? { page: evidence.page_number ?? null, excerpt: evidence.excerpt ?? null, label: 'Original extraction citation · check against the PDF' } : undefined };
  });
}
export function reviewDraft(quote: QuoteRead): ReviewDraft {
  return Object.fromEntries(specs(quote).map(spec => {
    const decision = quote.review_decisions?.find(item => item.field_path === spec.path);
    return [spec.path, { value: displayValue(readPath(quote.draft_data, spec.path), spec), reviewed: decision?.reviewed ?? false, basis: decision?.basis ?? 'extracted', note: decision?.note ?? '' }];
  }));
}
export function parseComposition(value: string): NonNullable<NonNullable<QuoteData['textile_specification']>['composition']> {
  if (!value.trim()) return [];
  const parts = value.split(';').map(part => {
    const match = /^\s*([^;%]+?)\s+(\d+(?:\.\d+)?)\s*%\s*$/.exec(part);
    if (!match) throw new Error('Use fibre and percentage for each entry, for example: polyester 65%; cotton 35%.');
    return { fibre: match[1].trim().toLowerCase().replaceAll(' ', '_'), percentage: match[2] };
  });
  if (parts.length > 10 || new Set(parts.map(p => p.fibre)).size !== parts.length || parts.some(p => Number(p.percentage) > 100)) throw new Error('Use up to 10 different fibres, each with a percentage from 0 to 100.');
  return parts;
}
export function draftIssues(quote: QuoteRead, draft: ReviewDraft, dirty: boolean): ReviewIssue[] {
  const fields = reviewFields(quote), issues = collectReviewIssues(fields, draft);
  const invalid = (path: string, message: string) => issues.push({ id: `${path}-shape`, fieldId: path, title: 'Check the entered value', message, impact: [], kind: 'validation', blocksConfirmation: true });
  try { parseComposition(draft['textile_specification.composition']?.value ?? ''); } catch (error) { invalid('textile_specification.composition', (error as Error).message); }
  for (const spec of specs(quote)) {
    const value = draft[spec.path]?.value ?? '', note = draft[spec.path]?.note ?? '';
    if (value && draft[spec.path]?.basis === 'correction' && !hasFieldEvidence(fields.find(field => field.id === spec.path)!)) invalid(spec.path, 'This field has no extracted citation. Label the new value as a buyer assumption and explain its limitation.');
    if (value.length > 500 || note.length > 500) invalid(spec.path, 'Keep the value and review note within 500 characters each.');
    if (spec.conversion === 'list' && value.split(';').filter(v => v.trim()).length > 12) invalid(spec.path, 'Use no more than 12 entries separated by semicolons.');
  }
  if (draft['commercial.currency']?.value && !/^[A-Z]{3}$/.test(draft['commercial.currency'].value)) invalid('commercial.currency', 'Use a three-letter uppercase currency code, such as USD.');
  if (draft['supply_chain.legs']?.value) invalid('supply_chain.legs', 'Keep an unextracted route unknown. Adding route legs is not available in this slice.');
  if (!dirty) issues.push(...(quote.issues ?? []).filter(issue => !issues.some(local => local.fieldId === issue.field_path && local.blocksConfirmation === issue.blocks_confirmation)).map((issue, index) => ({ id: `server-${index}-${issue.code}`, fieldId: fields.some(f => f.id === issue.field_path) ? issue.field_path : undefined, title: issue.code.replaceAll('_', ' ').toLowerCase(), message: issue.message, impact: issue.blocks, kind: issue.blocks_confirmation ? 'review' as const : 'information' as const, blocksConfirmation: issue.blocks_confirmation })));
  return issues;
}
export function toSaveDraft(quote: QuoteRead, draft: ReviewDraft): SaveDraft {
  if (!quote.draft_data || !quote.source_extraction_run_id) throw new Error('A saved extraction is required before editing.');
  const data = structuredClone(quote.draft_data);
  for (const spec of specs(quote)) {
    const value = draft[spec.path]?.value.trim() ?? '';
    if (spec.path === 'supply_chain.legs') continue;
    writePath(data, spec.path, spec.conversion === 'composition' ? parseComposition(value) : spec.conversion === 'list' ? value.split(';').map(v => v.trim()).filter(Boolean) : !value ? null : spec.conversion === 'integer' ? Number(value) : spec.conversion === 'boolean' ? value === 'true' : value);
  }
  return { expected_case_revision: quote.case_data_revision, expected_draft_revision: quote.draft_revision, source_extraction_run_id: quote.source_extraction_run_id, draft_data: data,
    review_decisions: Object.entries(draft).map(([field_path, entry]) => ({ field_path, reviewed: entry.reviewed, basis: entry.basis, note: entry.note.trim() || null })) };
}
export function intakeQuote(quote: QuoteRead): IntakeQuotation {
  const run = quote.latest_run;
  return { id: quote.id, fileName: quote.source_file.name, source: quote.source_kind, byteSize: quote.source_file.bytes, pageCount: quote.source_file.pages,
    processingStatus: quote.status === 'extracting' || run?.status === 'running' ? 'running' : quote.draft_data ? 'succeeded' : run?.status === 'interrupted' || run?.status === 'timed_out' ? 'interrupted' : quote.status === 'failed' ? 'failed' : 'uploaded',
    reviewStatus: quote.confirmation?.is_current ? 'confirmed' : quote.draft_data ? 'needs_review' : 'not_ready',
    missingFieldCount: quote.draft_data ? (quote.issues ?? []).filter(i => i.code.startsWith('MISSING')).length : null,
    message: run?.error?.message, retryAllowed: !!run?.error?.retryable };
}
export function intakeCase(item: CaseRead, revision = item.data_revision): IntakeCaseInfo {
  const r = item.requirement, t = r.textile_specification;
  return { name: item.name, revision, quantityLabel: `${formatDecimal(r.quantity)} metres`, budgetLabel: `${r.currency} ${formatDecimal(r.maximum_budget_amount)}`, deliveryLabel: `${r.maximum_lead_time_days} calendar days`, fabricLabel: `${t.construction} · ${t.composition.map(p => `${p.percentage}% ${p.fibre}`).join(' / ')} · ${t.target_gsm} GSM ±${t.gsm_tolerance_pct}% · minimum usable width ${t.minimum_usable_width_cm} cm` };
}
