import type { ReviewDraft, ReviewField, ReviewIssue } from '../features/quotation-review/types';

export const reviewScenarios = [
  ['complete', 'Complete extraction, ready to inspect'],
  ['missing', 'Missing mode and unclear delivery basis'],
  ['known-failure', 'Reviewed clarification exceeds the deadline'],
  ['source-unavailable', 'Original source temporarily unavailable'],
  ['saving', 'Draft save waiting for a result'],
  ['uncertain', 'Draft save response lost'],
  ['conflict', 'A newer draft exists'],
  ['confirmed', 'Previously confirmed demo revision'],
] as const;
export type ReviewScenario = typeof reviewScenarios[number][0];

const source = (page: number, excerpt: string) => ({ page, excerpt, label: 'Synthetic quotation A' });
const units = [{ value: 'metre', label: 'Metre' }, { value: 'kg', label: 'Kilogram' }];

// Presentation fixtures, never an extraction answer key or an API contract.
export function reviewFields(scenario: ReviewScenario): ReviewField[] {
  const fields: ReviewField[] = [
    { id: 'construction', label: 'Construction', group: 'textile', kind: 'select', originalValue: 'woven', options: [{ value: 'woven', label: 'Woven' }, { value: 'knitted', label: 'Knitted' }], source: source(1, 'Construction: woven'), requiredFor: ['Technical checks'] },
    { id: 'polyester', label: 'Polyester', group: 'textile', kind: 'decimal', unit: '%', originalValue: '65', source: source(1, 'Composition: 65% polyester / 35% cotton'), requiredFor: ['Technical checks'], help: 'This two-fibre example requires the complete composition. Do not silently rescale percentages.' },
    { id: 'cotton', label: 'Cotton', group: 'textile', kind: 'decimal', unit: '%', originalValue: '35', source: source(1, 'Composition: 65% polyester / 35% cotton'), requiredFor: ['Technical checks'] },
    { id: 'gsm', label: 'Fabric weight', group: 'textile', kind: 'decimal', unit: 'GSM', originalValue: '130', source: source(1, 'Fabric weight: 130 GSM'), requiredFor: ['Technical checks', 'Mass basis'] },
    { id: 'usableWidth', label: 'Usable width', group: 'textile', kind: 'decimal', unit: 'cm', originalValue: '150', source: source(1, 'Usable fabric width: 150 cm'), requiredFor: ['Technical checks'], help: 'Usable cutting width is checked against the minimum 150 cm requirement.' },
    { id: 'totalWidth', label: 'Total width', group: 'textile', kind: 'decimal', unit: 'cm', originalValue: '152', source: source(1, 'Total fabric width: 152 cm'), requiredFor: ['Mass basis'], help: 'Total width is used for fabric mass. It can differ from usable width; neither is gross shipment weight.' },
    { id: 'quantity', label: 'Quoted quantity', group: 'commercial', kind: 'decimal', originalValue: '50000', source: source(1, 'Order quantity: 50,000 metres'), requiredFor: ['Cost', 'Order coverage'] },
    { id: 'quantityUnit', label: 'Quantity unit', group: 'commercial', kind: 'select', originalValue: 'metre', options: units, source: source(1, 'Order quantity: 50,000 metres'), requiredFor: ['Cost', 'Order coverage'] },
    { id: 'unitPrice', label: 'Unit price', group: 'commercial', kind: 'decimal', originalValue: '2.85', source: source(1, 'Unit price: USD 2.85 per metre'), requiredFor: ['Cost'], help: 'Keep the price unit and currency explicit. This preview does not calculate a comparison price.' },
    { id: 'priceUnit', label: 'Price unit', group: 'commercial', kind: 'select', originalValue: 'metre', options: units, source: source(1, 'Unit price: USD 2.85 per metre'), requiredFor: ['Cost'] },
    { id: 'currency', label: 'Currency', group: 'commercial', kind: 'select', originalValue: 'USD', options: [{ value: 'USD', label: 'USD' }, { value: 'VND', label: 'VND' }], source: source(1, 'Unit price: USD 2.85 per metre'), requiredFor: ['Cost'] },
    { id: 'moq', label: 'Minimum order quantity', group: 'commercial', kind: 'decimal', originalValue: '20000', source: source(1, 'Minimum order quantity: 20,000 metres'), requiredFor: ['MOQ check'] },
    { id: 'moqUnit', label: 'Minimum order unit', group: 'commercial', kind: 'select', originalValue: 'metre', options: units, source: source(1, 'Minimum order quantity: 20,000 metres'), requiredFor: ['MOQ check'] },
    { id: 'costBasis', label: 'Included and excluded charges', group: 'commercial', kind: 'select', originalValue: 'delivered_excluding_tax_duties', options: [{ value: 'delivered_excluding_tax_duties', label: 'Material + delivery; excludes tax and duties' }, { value: 'material_only', label: 'Material only; delivery excluded' }], source: source(1, 'Price includes material and delivery to the buyer facility. Price excludes tax and duties.'), requiredFor: ['Comparable cost'], help: 'An Incoterm alone would not establish the reviewed comparison scope.' },
    { id: 'leadTime', label: 'Full-order lead time', group: 'delivery', kind: 'decimal', unit: 'calendar days', originalValue: '20', source: source(2, 'Full order arrives within 20 calendar days of the order reference date.'), requiredFor: ['Delivery'] },
    { id: 'leadTimeBasis', label: 'Delivery basis', group: 'delivery', kind: 'select', originalValue: 'full_order_calendar_days_to_buyer', options: [{ value: 'full_order_calendar_days_to_buyer', label: 'Full order arrives at buyer, calendar days' }, { value: 'production_only', label: 'Production only; arrival not established' }], source: source(2, 'The stated period covers production and transport to the buyer facility.'), requiredFor: ['Delivery'] },
    { id: 'referenceDate', label: 'Order reference date', group: 'delivery', kind: 'date', originalValue: '2026-10-15', source: source(2, 'Order reference date: 15 October 2026'), requiredFor: ['Delivery'], help: 'Day zero is 15 October 2026 for this saved demonstration case.' },
    { id: 'origin', label: 'Route origin', group: 'logistics', kind: 'text', originalValue: 'Fictional origin A', source: source(2, 'Origin: Fictional origin A'), requiredFor: ['Logistics coverage'] },
    { id: 'destination', label: 'Route destination', group: 'logistics', kind: 'text', originalValue: 'Fictional HCMC buyer facility', source: source(2, 'Destination: Fictional HCMC buyer facility'), requiredFor: ['Logistics coverage'] },
    { id: 'transportMode', label: 'Transport mode', group: 'logistics', kind: 'select', originalValue: 'road', options: [{ value: 'road', label: 'Road' }, { value: 'sea', label: 'Sea' }], source: source(2, 'Transport mode: road'), requiredFor: ['Carbon'] },
    { id: 'distance', label: 'Route distance', group: 'logistics', kind: 'decimal', unit: 'km', originalValue: '600', source: source(2, 'Scenario distance: 600 km'), requiredFor: ['Carbon'], help: 'Synthetic scenario distance, not verified geography. No live route lookup is included.' },
    { id: 'routeComplete', label: 'Route coverage', group: 'logistics', kind: 'select', originalValue: 'complete', options: [{ value: 'complete', label: 'Complete origin-to-buyer route' }, { value: 'partial', label: 'Partial route; remaining legs unknown' }], source: source(2, 'Route coverage: complete, origin facility to buyer facility'), requiredFor: ['Carbon'] },
    { id: 'packaging', label: 'Packaging mass', group: 'logistics', kind: 'decimal', unit: 'kg', originalValue: '250', source: source(2, 'Packaging mass: 250 kg for the full 50,000-metre order'), help: 'Packaging is separate from net fabric mass. No measured gross shipment mass is supplied.' },
  ];
  for (const field of fields) {
    if (field.kind !== 'decimal') continue;
    field.numeric = field.id === 'polyester' || field.id === 'cotton'
      ? { minimum: '0', maximum: '100' }
      : field.id === 'leadTime' ? { minimum: '0', integer: true }
      : field.id === 'packaging' ? { minimum: '0' }
      : { minimum: '0', exclusiveMinimum: true };
  }
  if (scenario === 'missing') {
    return fields.map((field) => field.id === 'transportMode' || field.id === 'leadTimeBasis'
      ? { ...field, originalValue: null, source: undefined, help: `This illustrative extraction omitted ${field.label.toLowerCase()}. Inspect the source or record that it remains unknown.` }
      : field);
  }
  return fields;
}

export function initialReviewDraft(fields: ReviewField[], reviewed = false): ReviewDraft {
  return Object.fromEntries(fields.map((field) => [field.id, { value: field.originalValue ?? '', reviewed, basis: 'extracted' as const, note: '' }]));
}

function decimalParts(value: string): { digits: bigint; scale: number } | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match || value.length > 1000) return null;
  return { digits: BigInt(match[1] + (match[2] ?? '')), scale: (match[2] ?? '').length };
}
function compareDecimal(left: string, right: string): number | null {
  const a = decimalParts(left); const b = decimalParts(right);
  if (!a || !b) return null;
  const scale = Math.max(a.scale, b.scale);
  const aScaled = a.digits * 10n ** BigInt(scale - a.scale);
  const bScaled = b.digits * 10n ** BigInt(scale - b.scale);
  return aScaled < bScaled ? -1 : aScaled > bScaled ? 1 : 0;
}
export function reviewLimitations(draft: ReviewDraft): ReviewIssue[] {
  const issues: ReviewIssue[] = [{ id: 'no-factor', title: 'Carbon estimate remains unavailable', message: 'No reviewed emission factor is supplied. Confirming this demonstration does not calculate emissions, eligibility or ranking.', impact: ['Carbon', 'Ranking'], kind: 'information', blocksConfirmation: false }];
  if (compareDecimal(draft.leadTime?.value ?? '', '25') === 1 && draft.leadTime.reviewed && draft.leadTimeBasis?.value === 'full_order_calendar_days_to_buyer') issues.push({ id: 'known-deadline', fieldId: 'leadTime', title: 'Recorded delivery exceeds the case deadline', message: 'The reviewed full-order lead time exceeds this demonstration case’s 25-day maximum. Recording accurate terms cannot remove this hard failure. Final eligibility must still come from the backend.', impact: ['Delivery', 'Eligibility'], kind: 'hard_failure', blocksConfirmation: false });
  if (draft.leadTimeBasis?.value === 'production_only') issues.push({ id: 'arrival-unknown', fieldId: 'leadTimeBasis', title: 'Arrival commitment remains unknown', message: 'Production time does not establish when the full order arrives. Delivery and ranking remain blocked until arrival is clarified.', impact: ['Delivery', 'Ranking'], kind: 'information', blocksConfirmation: false });
  if (draft.costBasis?.value === 'material_only') issues.push({ id: 'freight-unknown', fieldId: 'costBasis', title: 'Delivery charges still need clarification', message: 'Material-only pricing does not match the case budget scope. No missing freight amount is treated as zero.', impact: ['Cost', 'Ranking'], kind: 'information', blocksConfirmation: false });
  if (draft.routeComplete?.value === 'partial') issues.push({ id: 'route-incomplete', fieldId: 'routeComplete', title: 'Route is incomplete', message: 'Unknown route legs prevent a complete origin-to-buyer carbon estimate.', impact: ['Carbon', 'Ranking'], kind: 'information', blocksConfirmation: false });
  if (draft.currency?.value === 'VND') issues.push({ id: 'currency-mismatch', fieldId: 'currency', title: 'Currency differs from this USD case', message: 'No currency conversion is included. Cost comparison remains blocked until a compatible reviewed basis exists.', impact: ['Cost', 'Ranking'], kind: 'information', blocksConfirmation: false });
  const polyester = decimalParts(draft.polyester?.value ?? '');
  const cotton = decimalParts(draft.cotton?.value ?? '');
  if (polyester && cotton) {
    const scale = Math.max(polyester.scale, cotton.scale, 1);
    const sum = polyester.digits * 10n ** BigInt(scale - polyester.scale) + cotton.digits * 10n ** BigInt(scale - cotton.scale);
    const tolerance = 10n ** BigInt(scale - 1);
    const target = 100n * 10n ** BigInt(scale);
    if (sum < target - tolerance || sum > target + tolerance) issues.push({ id: 'composition-total', fieldId: 'cotton', title: 'Check the complete composition', message: 'The two declared fibres must total 100% within 0.1 percentage point. Values are not silently rescaled.', impact: ['Technical checks'], kind: 'validation', blocksConfirmation: true });
  }
  if (compareDecimal(draft.usableWidth?.value ?? '', draft.totalWidth?.value ?? '') === 1) issues.push({ id: 'inconsistent-widths', fieldId: 'usableWidth', title: 'Usable width exceeds total width', message: 'Check whether these labels or units were reversed before confirming the data.', impact: ['Technical checks', 'Mass basis'], kind: 'validation', blocksConfirmation: true });
  return issues;
}
