import type { IntakeCaseInfo, IntakeCollection, IntakeQuotation, IntakeSample, IntakeTransfer } from '../features/quotations/types';

export const previewCase: IntakeCaseInfo = {
  name: 'Woven fabric · synthetic demo', revision: 1,
  quantityLabel: '50,000 metres', budgetLabel: 'USD 150,000',
  deliveryLabel: 'Full order within 25 calendar days of 15 Oct 2026',
  fabricLabel: 'Woven · 65% polyester / 35% cotton (±2 pp) · 130 GSM (±5%) · usable width ≥150 cm',
};

// Illustrative preview limits; connected intake must use server metadata.
export const previewLimits = { maxFileBytes: 10 * 1024 * 1024, maxPages: 10, maxQuotes: 4 };
export const previewSamples: IntakeSample[] = ['A', 'B', 'C', 'D'].map((letter) => ({
  id: `sample-${letter.toLowerCase()}`, label: `Synthetic quotation ${letter}`,
  fileName: `synthetic-quotation-${letter.toLowerCase()}.pdf`,
  description: 'Illustrative UI record. No source PDF or extraction is included in this preview.',
}));

export const scenarios = [
  ['empty', 'Start with no quotations'],
  ['mixed', 'Saved quotations at different stages'],
  ['loading', 'Loading saved quotations'],
  ['load-error', 'Saved quotations could not load'],
  ['unavailable', 'Intake service unavailable'],
  ['uploading', 'Upload in progress'],
  ['uncertain', 'Upload response lost'],
  ['processing', 'Extraction in progress'],
  ['failed', 'Extraction failed or interrupted'],
  ['review', 'Extracted quotation needs review'],
  ['full', 'Four-quotation limit reached'],
] as const;
export type Scenario = typeof scenarios[number][0];

export function fixtureQuote(id: string, overrides: Partial<IntakeQuotation> = {}): IntakeQuotation {
  return {
    id, fileName: `synthetic-quotation-${id}.pdf`, source: 'synthetic_sample',
    byteSize: null, pageCount: null, processingStatus: 'uploaded',
    reviewStatus: 'not_ready', missingFieldCount: null, ...overrides,
  };
}

export function scenarioState(scenario: Scenario): {
  collection: IntakeCollection; transfer: IntakeTransfer; pending: IntakeQuotation | null;
} {
  const state: ReturnType<typeof scenarioState> = {
    collection: { status: 'ready', quotations: [] }, transfer: { status: 'idle' }, pending: null,
  };
  if (scenario === 'mixed' || scenario === 'full') {
    state.collection.quotations = [
      fixtureQuote('a', { processingStatus: 'succeeded', reviewStatus: 'needs_review', missingFieldCount: 3 }),
      fixtureQuote('b'),
      fixtureQuote('c', { processingStatus: 'failed', retryAllowed: true, message: 'Illustrative extraction failure. The saved PDF remains available.' }),
    ];
    if (scenario === 'full') state.collection.quotations.push(fixtureQuote('d'));
  }
  if (scenario === 'loading') state.collection.status = 'loading';
  if (scenario === 'load-error') state.collection = { status: 'error', quotations: [], message: 'The quotation list could not be retrieved. Refresh before adding another file.' };
  if (scenario === 'unavailable') state.collection = { status: 'unavailable', quotations: [], message: 'Quotation intake is not connected yet. Your saved case requirements are unchanged.' };
  if (scenario === 'uploading' || scenario === 'uncertain') {
    state.transfer = { status: scenario, message: scenario === 'uncertain' ? 'The response was lost. Check the saved result before trying again.' : 'Waiting for the upload response.' };
    state.pending = fixtureQuote('pending');
  }
  if (scenario === 'processing') state.collection.quotations = [fixtureQuote('a', { processingStatus: 'running' }), fixtureQuote('b')];
  if (scenario === 'failed') state.collection.quotations = [
    fixtureQuote('a', { processingStatus: 'failed', retryAllowed: true, message: 'Extraction could not finish. No reviewed fields were saved.' }),
    fixtureQuote('b', { processingStatus: 'interrupted', retryAllowed: true, message: 'The request was interrupted. It is no longer shown as running.' }),
  ];
  if (scenario === 'review') state.collection.quotations = [fixtureQuote('a', { processingStatus: 'succeeded', reviewStatus: 'needs_review', missingFieldCount: 3 })];
  return state;
}
