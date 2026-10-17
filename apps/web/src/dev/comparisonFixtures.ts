import type { ComparisonContext, ComparisonExplanation, ComparisonOffer, ComparisonSnapshot } from '../features/comparison/types';

export const comparisonScenarios = [
  ['unreviewed-inputs', 'Quotation confirmation still required'],
  ['ready-before-evaluate', 'Confirmed example inputs, before evaluation'],
  ['complete', 'Complete comparison: A and B eligible'],
  ['missing-B-mode', 'B transport mode remains unknown'],
  ['missingapprovedfactor', 'No approved carbon factor'],
  ['singleton', 'One eligible offer'],
  ['noeligible', 'All offers fail mandatory requirements'],
  ['nofeasible', 'No offer meets the scenario constraints'],
  ['stale', 'Inputs changed after this evaluation'],
  ['running', 'Evaluation awaiting a result'],
  ['uncertain', 'Evaluation response lost'],
  ['read-error', 'Refresh failed; last known snapshot retained'],
  ['explanation-unavailable', 'Comparison available, explanation unavailable'],
  ['mismatch', 'Explanation does not match this evaluation'],
  ['tied', 'Equal metrics; supplied tie order'],
] as const;
export type ComparisonScenario = typeof comparisonScenarios[number][0];

export function comparisonContext(revision = 10): ComparisonContext {
  return { id: 'demo-comparison-case', name: 'Woven fabric · independent comparison example', currentRevision: revision,
    quantityLabel: '50,000 metres', budgetLabel: 'USD 150,000', deliveryLabel: 'Full order within 25 calendar days of 1 Oct 2026' };
}
const staticTerms = [
  { id: 'a', amount: '142500', unitPrice: '2.85', days: '20', carbon: '600', distance: '600', date: '2026-10-21', score: 70 },
  { id: 'b', amount: '147000', unitPrice: '2.94', days: '23', carbon: '150', distance: '150', date: '2026-10-24', score: 30 },
  { id: 'c', amount: '135000', unitPrice: '2.70', days: '30', carbon: '400', distance: '400', date: '2026-10-31', score: null },
  { id: 'd', amount: '125000', unitPrice: '2.50', days: '10', carbon: '80', distance: '80', date: '2026-10-11', score: null },
] as const;

function canonicalOffers(): ComparisonOffer[] {
  return staticTerms.map((term) => ({
    id: term.id, supplierName: `Fictional supplier ${term.id.toUpperCase()}`, confirmedRevisionId: `demo-${term.id}-confirmed-r1`,
    eligibility: term.id === 'c' || term.id === 'd' ? 'ineligible' : 'eligible',
    scenarioFeasible: term.id === 'c' || term.id === 'd' ? false : true,
    reasons: term.id === 'c' ? ['The full order arrives after the 25-day maximum.'] : term.id === 'd' ? ['The quoted 80/20 composition fails the required 65/35 composition tolerance.'] : [],
    cost: { value: term.amount, unit: 'USD' }, delivery: { value: term.days, unit: 'calendar days' }, carbon: { value: term.carbon, unit: 'kg CO₂e' }, arrivalDate: term.date, weightedScore: term.score,
    checks: [
      { label: 'Fabric specification', state: term.id === 'd' ? 'fail' : 'pass', reason: term.id === 'd' ? '80% polyester / 20% cotton is outside the ±2 percentage-point composition tolerance.' : 'Woven 65/35 polyester-cotton, 130 GSM and 150 cm usable width meet the case specification.' },
      { label: 'Minimum order', state: 'pass', reason: 'The required 50,000 metres meets the quoted minimum of 20,000 metres.' },
      { label: 'Budget and cost basis', state: 'pass', reason: 'The supplied comparable cost is within USD 150,000 and includes material and declared delivery, excluding tax and duties.' },
      { label: 'Full-order delivery', state: term.id === 'c' ? 'fail' : 'pass', reason: term.id === 'c' ? '30 calendar days exceeds the maximum 25 days from 1 October 2026.' : 'The quoted full-order arrival is within the 25-calendar-day maximum.' },
      { label: 'Logistics inputs', state: 'pass', reason: 'This fixture supplies a complete synthetic road route, labelled shipment-mass basis and a test-only factor. It is not a live carbon assessment.' },
    ],
    evidence: [
      { label: 'Fixture provenance', value: 'CALCULATION_SPEC §9 canonical synthetic arithmetic example; these are supplied values, not browser calculations.' },
      { label: 'Review reference', value: `demo-${term.id}-confirmed-r1 is illustrative metadata, not a human confirmation performed in the intake/review preview.` },
      { label: 'Composition', value: term.id === 'd' ? '80% polyester / 20% cotton' : '65% polyester / 35% cotton' },
      { label: 'Construction and weight', value: 'Woven · 130 GSM' },
      { label: 'Total / usable width', value: '150 cm total / 150 cm usable. Separate from the review walkthrough PDF with 152 cm total width.' },
      { label: 'Order and MOQ', value: '50,000 metres requested · 20,000 metres minimum order' },
      { label: 'Unit price', value: `USD ${term.unitPrice} per metre` },
      { label: 'Delivery basis', value: `${term.days} calendar days for the full order to arrive; day zero is 1 October 2026.` },
      { label: 'Supplied arrival date', value: term.date },
      { label: 'Net fabric mass', value: '9,750 kg · supplied geometry estimate for the same order, not a measured actual weight' },
      { label: 'Packaging mass', value: '250 kg · synthetic known packaging for the full order' },
      { label: 'Shipment mass basis', value: '10,000 kg · net fabric mass plus packaging, not an actual measured gross weight' },
      { label: 'Route and distance', value: `Road · ${term.distance} km · complete fictional supplier-gate to buyer-gate route; not verified geography` },
      { label: 'Factor provenance', value: 'TEST_ONLY_ROAD_ARITHMETIC · 0.1 kg CO₂e per tonne-km · arithmetic-only fixture; no live geography/category suitability or published reference approval' },
      { label: 'Cost scope', value: 'Material and declared delivery to buyer; excludes tax and duties. Not a total landed-cost claim.' },
      { label: 'Certificate requirement', value: 'None in this case. No certificate or issuer verification is implied.' },
    ],
    limitations: ['All source inputs, confirmation references, routes and result values are synthetic.', 'Test-only carbon values cannot support a connected or real sourcing decision.'],
  }));
}
function replaceEvidence(offer: ComparisonOffer, label: string, value: string) {
  offer.evidence = offer.evidence.map((item) => item.label === label ? { label, value } : item);
}

/** Static supplied result variants for development. This module performs no procurement arithmetic. */
export function comparisonSnapshot(scenario: ComparisonScenario, id: string, revision = 10): ComparisonSnapshot {
  const snapshot: ComparisonSnapshot = {
    id, caseId: 'demo-comparison-case', inputRevision: revision, historical: false, createdAt: '2026-10-16T02:00:00.000Z', mode: 'synthetic',
    status: 'complete', selectionAllowed: true, selectableQuoteIds: ['a', 'b'], factorStatus: 'test_only', policy: { name: 'Balanced', cost: '45%', leadTime: '25%', carbon: '30%' },
    quantityLabel: '50,000 metres', costBasis: 'Material + declared delivery to buyer; excludes tax and duties',
    carbonBoundary: 'Complete supplier-gate to buyer-gate logistics · illustrative well-to-wheel scope · test-only coefficient',
    rankedQuoteIds: ['a', 'b'], winnerQuoteId: 'a', offers: canonicalOffers(),
    limitations: ['Independent synthetic comparison snapshot; it is not generated by the quotation intake or review walkthrough.', 'All carbon figures use a test-only arithmetic factor. No production carbon factor has been approved.', 'No purchase or real scenario/decision is saved by this page.'],
  };
  if (revision > 10) {
    const offer = snapshot.offers.find((item) => item.id === 'a')!;
    offer.confirmedRevisionId = 'demo-a-confirmed-r2';
    replaceEvidence(offer, 'Review reference', 'demo-a-confirmed-r2 is a supplied later illustrative confirmation reference. The example values remain unchanged.');
  }
  if (scenario === 'missing-B-mode') {
    const a = snapshot.offers.find((item) => item.id === 'a')!;
    const b = snapshot.offers.find((item) => item.id === 'b')!;
    a.weightedScore = 100;
    b.eligibility = 'needs_review'; b.scenarioFeasible = null; b.weightedScore = null;
    b.carbon = { value: null, unit: 'kg CO₂e', unavailableReason: 'B transport mode remains unknown; no estimate is supplied.' };
    b.reasons = ['Transport mode is still unknown. Carbon and complete comparison remain blocked.'];
    b.checks = b.checks.map((check) => check.label === 'Logistics inputs' ? { label: check.label, state: 'needs_review', reason: 'The reviewed record retains an unknown transport mode; it is not interpreted as zero carbon.' } : check);
    replaceEvidence(b, 'Route and distance', 'Transport mode unknown · 150 km synthetic distance retained; complete mode-compatible emissions are unavailable.');
    replaceEvidence(b, 'Factor provenance', 'No applicable coefficient can be selected while the transport mode remains unknown.');
    snapshot.status = 'incomplete'; snapshot.selectionAllowed = false; snapshot.selectableQuoteIds = []; snapshot.rankedQuoteIds = ['a'];
    snapshot.limitations.push('This separate supplied snapshot has A as its sole complete eligible candidate, with a singleton score of 100. The service fixture blocks advancement while B is unresolved.');
  }
  if (scenario === 'missingapprovedfactor') {
    snapshot.factorStatus = 'unavailable'; snapshot.status = 'incomplete'; snapshot.selectionAllowed = false; snapshot.selectableQuoteIds = []; snapshot.rankedQuoteIds = []; snapshot.winnerQuoteId = null;
    snapshot.offers.forEach((offer) => {
      offer.carbon = { value: null, unit: 'kg CO₂e', unavailableReason: 'No approved compatible emission factor is supplied.' }; offer.weightedScore = null;
      if (offer.eligibility === 'eligible') { offer.eligibility = 'needs_review'; offer.scenarioFeasible = null; }
      offer.reasons.push('Carbon and ranking require an approved compatible factor.');
      offer.checks = offer.checks.map((check) => check.label === 'Logistics inputs' ? { label: check.label, state: 'needs_review', reason: 'The route is supplied but an approved compatible factor is unavailable.' } : check);
      replaceEvidence(offer, 'Factor provenance', 'Unavailable. No approved transport coefficient is supplied; no numeric carbon estimate is used.');
      offer.limitations = ['Synthetic inputs remain illustrative. Missing carbon stays unavailable; it is never zero.'];
    });
    snapshot.limitations = ['No approved factor is available in this scenario. Numeric carbon and ranking are deliberately unavailable.', 'Known delivery/specification failures remain recorded alongside the missing factor.'];
  }
  if (scenario === 'singleton') {
    snapshot.offers = snapshot.offers.filter((offer) => offer.id !== 'b'); snapshot.offers[0].weightedScore = 100;
    snapshot.rankedQuoteIds = ['a']; snapshot.selectableQuoteIds = ['a']; snapshot.limitations.push('A is the only eligible offer in this supplied candidate set. A score of 100 is a singleton result, not a market benchmark.');
  }
  if (scenario === 'noeligible') {
    snapshot.offers = snapshot.offers.filter((offer) => offer.id === 'c' || offer.id === 'd'); snapshot.rankedQuoteIds = []; snapshot.winnerQuoteId = null; snapshot.selectionAllowed = false; snapshot.selectableQuoteIds = [];
    snapshot.limitations.push('This separate candidate set contains only C and D. Both fail mandatory requirements; no winner is supplied.');
  }
  if (scenario === 'nofeasible') {
    snapshot.status = 'no_feasible_option'; snapshot.selectionAllowed = false; snapshot.selectableQuoteIds = []; snapshot.rankedQuoteIds = []; snapshot.winnerQuoteId = null;
    snapshot.policy.name = 'Balanced · maximum +2% cost, minimum 25% carbon reduction';
    snapshot.offers.forEach((offer) => { offer.scenarioFeasible = false; offer.weightedScore = null; });
    snapshot.offers.find((offer) => offer.id === 'a')!.reasons.push('Baseline A does not satisfy the required carbon reduction relative to itself.');
    snapshot.offers.find((offer) => offer.id === 'b')!.reasons.push('B exceeds the permitted cost increase relative to baseline A.');
    snapshot.limitations.push('Supplied scenario result uses the original A baseline, frozen anchors and unchanged hard gates. No eligible offer meets both relative constraints; no substitute winner is invented.');
  }
  if (scenario === 'tied') {
    const b = snapshot.offers.find((offer) => offer.id === 'b')!;
    b.cost.value = '142500'; b.delivery.value = '20'; b.carbon.value = '600'; b.arrivalDate = '2026-10-21';
    snapshot.offers.filter((offer) => offer.id === 'a' || offer.id === 'b').forEach((offer) => { offer.weightedScore = 100; });
    replaceEvidence(b, 'Unit price', 'USD 2.85 per metre · alternate equal-metrics fixture');
    replaceEvidence(b, 'Delivery basis', '20 calendar days for full-order arrival from 1 October 2026 · alternate equal-metrics fixture');
    replaceEvidence(b, 'Supplied arrival date', '2026-10-21');
    replaceEvidence(b, 'Route and distance', 'Road · 600 km · alternate equal-metrics synthetic route');
    replaceEvidence(b, 'Fixture provenance', 'Explicit alternate tie fixture; B differs from the canonical CALCULATION_SPEC §9 values. Results are supplied, not computed in this browser.');
    snapshot.limitations.push('Alternate tie fixture: A and B have identical supplied metrics and scores. The supplied deterministic order is A then B; the browser does not re-sort them.');
  }
  return snapshot;
}

export function unavailableExplanation(): ComparisonExplanation {
  return { status: 'unavailable', evaluationId: null, recommendedQuoteId: null, validated: false, summary: '', tradeoffs: [], limitations: [] };
}
export function suppliedExplanation(snapshot: ComparisonSnapshot, scenario: ComparisonScenario): ComparisonExplanation {
  let summary = 'A leads the supplied Balanced ranking. B remains an eligible alternative with lower illustrative logistics emissions and a higher quoted price and longer delivery period.';
  let tradeoffs = ['Both ranked offers meet the mandatory requirements in this supplied snapshot.', 'C remains excluded for late delivery and D for composition; changing preference weights would not remove these failures.'];
  if (scenario === 'singleton' || scenario === 'missing-B-mode') { summary = 'A is the only complete eligible candidate in this supplied snapshot. Its singleton score does not show superiority over unassessed or absent offers.'; tradeoffs = ['Read the snapshot limitations before advancing; an unresolved quotation is not a zero-carbon alternative.']; }
  if (scenario === 'noeligible') { summary = 'Neither supplied offer meets the mandatory requirements. No winner is available.'; tradeoffs = ['Request suitable terms or deliberately revise the case requirements in a later workflow.']; }
  if (scenario === 'nofeasible') { summary = 'No offer satisfies both relative scenario constraints. The mandatory failures remain unchanged.'; tradeoffs = ['No substitute offer is recommended. Changing constraints requires a separate explicit scenario workflow.']; }
  if (scenario === 'tied') { summary = 'The two eligible offers have identical metrics in this alternate fixture. The supplied tie-break order places A first.'; tradeoffs = ['A first-place position after a tie does not establish a measured advantage.']; }
  if (snapshot.factorStatus === 'unavailable') {
    summary = 'An approved compatible carbon factor is unavailable. The supplied cost and delivery diagnostics remain visible, but there is no complete carbon-aware ranking or recommended offer.';
    tradeoffs = ['Unknown carbon is not a zero value or a preference advantage.', 'Existing delivery and specification failures remain recorded; a missing factor does not remove them.'];
  }
  return { status: 'ready', evaluationId: snapshot.id, recommendedQuoteId: snapshot.winnerQuoteId, validated: true, summary, tradeoffs, limitations: ['Static supplied explanation for this synthetic snapshot; no AI request was made.', snapshot.factorStatus === 'unavailable' ? 'No numeric carbon estimate or complete ranking is supplied without an approved compatible factor.' : 'Test-only carbon figures are not an approved real-world emissions assessment.'] };
}
