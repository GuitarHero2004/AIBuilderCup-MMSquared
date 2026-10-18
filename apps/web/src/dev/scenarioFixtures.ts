import { defaultDraft, normalizedPolicy, scenarioPresets } from '../features/scenarios/model';
import type { ScenarioBaseline, ScenarioDraft, ScenarioDeltas, ScenarioProposal, ScenarioResult } from '../features/scenarios/types';
import { comparisonContext, comparisonSnapshot } from './comparisonFixtures';

export const scenarioExamples = [
  ['ready', 'Ready to explore a frozen baseline'],
  ['applied', 'Lower Carbon scenario already applied'],
  ['five-percent', 'Maximum +5% cost and minimum 25% carbon reduction'],
  ['no-feasible', 'Maximum +2% cost leaves no feasible option'],
  ['running', 'Application awaiting a simulated outcome'],
  ['uncertain', 'Application response lost'],
  ['confirmed-only', 'Scenario confirmed; evaluation unavailable'],
  ['stale', 'Confirmed inputs changed after the baseline'],
  ['source-unavailable', 'A quotation has unresolved source inputs'],
  ['no-approved-factor', 'No approved compatible carbon factor'],
  ['zero-denominator', 'Alternate zero-baseline percentage example'],
] as const;
export type ScenarioExample = typeof scenarioExamples[number][0];

export function exampleDraft(example: ScenarioExample): ScenarioDraft {
  const draft = defaultDraft();
  if (['applied', 'running', 'uncertain', 'confirmed-only'].includes(example)) return { ...draft, preset: 'lower_carbon', cost: '10', leadTime: '10', carbon: '80' };
  if (['five-percent', 'no-feasible', 'zero-denominator'].includes(example)) return { ...draft, maxCostIncrease: example === 'no-feasible' ? '2' : '5', minCarbonReduction: '25' };
  return draft;
}

/** A separate supplied baseline. No intake/review action creates these references. */
export function scenarioBaseline(example: ScenarioExample, family: number): ScenarioBaseline {
  const fixture = example === 'no-approved-factor' ? 'missingapprovedfactor' : example === 'source-unavailable' ? 'missing-B-mode' : 'complete';
  const snapshot = comparisonSnapshot(fixture, `demo-scenario-baseline-${family}`, 10);
  const context = { ...comparisonContext(example === 'stale' ? 11 : 10), name: 'Woven fabric · independent scenario example' };
  snapshot.limitations = [...snapshot.limitations, 'This frozen baseline is a separate supplied scenario example, not transferred from an intake or comparison session.'];
  if (example === 'stale') snapshot.historical = true;
  if (example === 'zero-denominator') {
    const a = snapshot.offers.find((offer) => offer.id === 'a')!;
    const b = snapshot.offers.find((offer) => offer.id === 'b')!;
    a.cost = { value: '0', unit: 'USD' }; a.carbon = { value: '0', unit: 'kg CO₂e' }; a.weightedScore = 100; b.weightedScore = 0;
    a.evidence = a.evidence.map((item) => item.label === 'Unit price' ? { ...item, value: 'USD 0 per metre · alternate zero-denominator robustness example, not the canonical quote' }
      : item.label === 'Factor provenance' ? { ...item, value: 'Alternate supplied zero-emission arithmetic value; no real transport assessment or approved factor.' }
      : item.label === 'Fixture provenance' ? { ...item, value: 'Explicit alternate zero-cost and zero-carbon baseline fixture. No percentage difference is defined against zero.' } : item);
    a.checks = a.checks.map((check) => check.label === 'Logistics inputs' ? { ...check, reason: 'Explicit zero-carbon robustness fixture. This is not a real zero-emission transport claim.' } : check);
    snapshot.limitations = ['Alternate zero-denominator robustness fixture: A has supplied zero cost and zero carbon. It is not the canonical arithmetic example.', 'Relative cost increase and carbon reduction are undefined; no division or substitute percentage is performed.'];
  }
  const available = !['no-approved-factor', 'source-unavailable'].includes(example);
  return { context, snapshot, inputFingerprint: `demo-input-fingerprint-${family}`, anchorsId: `demo-frozen-anchors-${family}`, scopeKey: 'demo-50000m-usd-delivered-wtw',
    scenarioAllowed: available, blockedReason: available ? undefined : 'Resolve the baseline quotation or factor information and obtain a new complete baseline before exploring scenarios.',
    relativeCostAvailable: available && example !== 'zero-denominator', relativeCarbonAvailable: available && example !== 'zero-denominator' };
}

const preparedWeights = [
  { preset: 'balanced', cost: '45', leadTime: '25', carbon: '30', a: 70, b: 30, rank: ['a', 'b'] },
  { preset: 'lowest_cost', cost: '100', leadTime: '0', carbon: '0', a: 100, b: 0, rank: ['a', 'b'] },
  { preset: 'lower_carbon', cost: '10', leadTime: '10', carbon: '80', a: 20, b: 80, rank: ['b', 'a'] },
  { preset: 'fastest_delivery', cost: '0', leadTime: '100', carbon: '0', a: 100, b: 0, rank: ['a', 'b'] },
  { preset: 'custom', cost: '20', leadTime: '20', carbon: '60', a: 40, b: 60, rank: ['b', 'a'] },
] as const;

/** Exact prepared signatures only. Validation/normalization is not procurement calculation. */
export function preparedScenarioResult(baseline: ScenarioBaseline, proposal: ScenarioProposal, requestId: string, scenarioId: string): ScenarioResult | null {
  const policy = normalizedPolicy(proposal.policy);
  if (!policy || !baseline.relativeCostAvailable || !baseline.relativeCarbonAvailable) return null;
  const prepared = preparedWeights.find((row) => row.preset === policy.preset && row.cost === policy.cost && row.leadTime === policy.leadTime && row.carbon === policy.carbon);
  const caps = policy.maxCostIncrease === '' && policy.minCarbonReduction === '' ? 'none'
    : policy.maxCostIncrease === '5' && policy.minCarbonReduction === '25' ? 'five'
      : policy.maxCostIncrease === '2' && policy.minCarbonReduction === '25' ? 'two' : null;
  if (!prepared || !caps) return null;
  const snapshot = structuredClone(baseline.snapshot);
  snapshot.id = `demo-scenario-evaluation-${requestId}`; snapshot.historical = false;
  snapshot.policy = { name: scenarioPresets.find((preset) => preset.id === policy.preset)!.label, cost: `${policy.cost}%`, leadTime: `${policy.leadTime}%`, carbon: `${policy.carbon}%` };
  snapshot.rankedQuoteIds = caps === 'two' ? [] : caps === 'five' ? ['b'] : [...prepared.rank];
  snapshot.winnerQuoteId = snapshot.rankedQuoteIds[0] ?? null;
  snapshot.selectableQuoteIds = [...snapshot.rankedQuoteIds]; snapshot.selectionAllowed = caps !== 'two'; snapshot.status = caps === 'two' ? 'no_feasible_option' : 'complete';
  snapshot.offers.forEach((offer) => {
    if (offer.id !== 'a' && offer.id !== 'b') return;
    offer.scenarioFeasible = caps === 'none' || (caps === 'five' && offer.id === 'b');
    offer.weightedScore = offer.scenarioFeasible ? offer.id === 'a' ? prepared.a : prepared.b : null;
    if (caps !== 'none' && offer.id === 'a') offer.reasons = [...offer.reasons, 'Baseline A does not meet the required reduction in emissions relative to itself.'];
    if (caps === 'two' && offer.id === 'b') offer.reasons = [...offer.reasons, 'The supplied B cost increase exceeds the maximum +2% relative to baseline A.'];
  });
  snapshot.limitations = [...baseline.snapshot.limitations, 'Weights and relative limits reuse the original confirmed inputs, scopes and normalization anchors. Hard failures remain unchanged.', 'Scores, feasible sets and differences are prepared static outcomes; this browser does not calculate or rank suppliers.'];
  if (caps === 'five') snapshot.limitations.push('B is the only feasible offer under these limits. Its score retains the original A/B anchors; it is not rescaled to 100.');
  if (caps === 'two') snapshot.limitations.push('No eligible offer satisfies both limits. No replacement winner is supplied.');
  const deltas: ScenarioDeltas | null = snapshot.winnerQuoteId === 'a' ? { quoteId: 'a', baselineQuoteId: 'a', cost: 'No change · 0%', delivery: 'No change · 0 days', carbon: 'No change · 0%', notes: ['Supplied differences compare the scenario preferred offer with the original frozen baseline preferred offer A.'] }
    : snapshot.winnerQuoteId === 'b' ? { quoteId: 'b', baselineQuoteId: 'a', cost: '+USD 4,500 · approximately +3.1579%', delivery: '+3 calendar days', carbon: '450 kg CO₂e lower · 75% reduction', notes: ['Supplied canonical differences; percentage thresholds use the prepared unrounded result.', 'Carbon differences use test-only illustrative values, not verified realized savings.'] } : null;
  return { scenarioId, requestId, proposal: structuredClone(proposal), snapshot, deltas };
}
