import { isHistorical, rankingIssue, selectableOffer } from '../comparison/model';
import type { ScenarioBaseline, ScenarioDraft, ScenarioOperation, ScenarioPreset, ScenarioProposal, ScenarioResult } from './types';

export const scenarioPresets: { id: ScenarioPreset; label: string; cost: string; leadTime: string; carbon: string }[] = [
  { id: 'balanced', label: 'Balanced', cost: '45', leadTime: '25', carbon: '30' },
  { id: 'lowest_cost', label: 'Lowest Cost', cost: '100', leadTime: '0', carbon: '0' },
  { id: 'lower_carbon', label: 'Lower Carbon', cost: '10', leadTime: '10', carbon: '80' },
  { id: 'fastest_delivery', label: 'Fastest Delivery', cost: '0', leadTime: '100', carbon: '0' },
  { id: 'custom', label: 'Custom', cost: '20', leadTime: '20', carbon: '60' },
];
export const defaultDraft = (): ScenarioDraft => ({ preset: 'balanced', cost: '45', leadTime: '25', carbon: '30', maxCostIncrease: '', minCarbonReduction: '' });
/** Exact hundredths of a UI percentage. This is form validation, never a scoring engine. */
function hundredths(value: string): bigint | null {
  if (value.length > 32 || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
function percentText(value: bigint): string {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0').replace(/0+$/, '');
  return whole.toString() + (fraction ? '.' + fraction : '');
}
export function validateDraft(draft: ScenarioDraft) {
  const errors: Partial<Record<keyof ScenarioDraft | 'total', string>> = {};
  const values = [hundredths(draft.cost), hundredths(draft.leadTime), hundredths(draft.carbon)];
  (['cost', 'leadTime', 'carbon'] as const).forEach((key, i) => {
    if (values[i] === null || values[i]! > 10000n) errors[key] = 'Enter a percentage from 0 to 100, with up to 2 decimal places.';
  });
  if (!scenarioPresets.some((preset) => preset.id === draft.preset)) errors.preset = 'Choose a supported preference preset.';
  const preset = scenarioPresets.find((item) => item.id === draft.preset);
  if (preset && preset.id !== 'custom' && (['cost', 'leadTime', 'carbon'] as const).some((key) => hundredths(draft[key]) !== hundredths(preset[key]))) errors.preset = 'These weights differ from the selected preset. Use Custom for edited priorities.';
  const total = values.every((value) => value !== null) ? values.reduce<bigint>((sum, value) => sum + value!, 0n) : null;
  if (total !== null && total !== 10000n) errors.total = 'The three priorities must add up to exactly 100%.';
  if (draft.maxCostIncrease !== '' && hundredths(draft.maxCostIncrease) === null) errors.maxCostIncrease = 'Enter a nonnegative percentage with up to 2 decimal places, or leave this limit blank.';
  const reduction = hundredths(draft.minCarbonReduction);
  if (draft.minCarbonReduction !== '' && (reduction === null || reduction > 10000n)) errors.minCarbonReduction = 'Enter a percentage from 0 to 100, or leave this limit blank.';
  return { valid: Object.keys(errors).length === 0, errors, total: total === null ? null : percentText(total) };
}
export function normalizedPolicy(draft: ScenarioDraft): ScenarioDraft | null {
  if (!validateDraft(draft).valid) return null;
  return { preset: draft.preset, cost: percentText(hundredths(draft.cost)!), leadTime: percentText(hundredths(draft.leadTime)!), carbon: percentText(hundredths(draft.carbon)!),
    maxCostIncrease: draft.maxCostIncrease === '' ? '' : percentText(hundredths(draft.maxCostIncrease)!),
    minCarbonReduction: draft.minCarbonReduction === '' ? '' : percentText(hundredths(draft.minCarbonReduction)!) };
}
export function policyKey(draft: ScenarioDraft): string | null {
  const policy = normalizedPolicy(draft);
  return policy ? JSON.stringify(policy) : null;
}
export function scenarioPending(operation: ScenarioOperation): boolean {
  return ['running', 'checking', 'uncertain'].includes(operation.status);
}
export function scenarioLocked(operation: ScenarioOperation): boolean {
  return scenarioPending(operation) || Boolean(operation.confirmedScenarioId && operation.status !== 'idle');
}
export function baselineBlockReason(baseline: ScenarioBaseline): string | null {
  if (!baseline.inputFingerprint || !baseline.anchorsId || !baseline.scopeKey) return 'The baseline references are incomplete. Reload a verified baseline.';
  const issue = rankingIssue(baseline.snapshot, baseline.context);
  if (issue) return issue;
  if (isHistorical(baseline.snapshot, baseline.context)) return 'The baseline describes earlier inputs. Obtain a current baseline before applying a scenario.';
  if (!baseline.scenarioAllowed) return baseline.blockedReason || 'Scenarios are unavailable for this baseline.';
  if (baseline.snapshot.status !== 'complete' || baseline.snapshot.factorStatus === 'unavailable' || !baseline.snapshot.winnerQuoteId) return 'A complete baseline with a preferred offer is required. Resolve its missing information first.';
  return null;
}
export function proposalBlockReason(baseline: ScenarioBaseline, draft: ScenarioDraft): string | null {
  const issue = baselineBlockReason(baseline);
  if (issue) return issue;
  if (!validateDraft(draft).valid) return 'Correct the highlighted settings before reviewing this scenario.';
  return relativeLimitBlockReason(baseline, draft);
}
function relativeLimitBlockReason(baseline: ScenarioBaseline, draft: ScenarioDraft): string | null {
  const winner = baseline.snapshot.offers.find((offer) => offer.id === baseline.snapshot.winnerQuoteId);
  const zero = (value: string | null | undefined) => value != null && /^0+(?:\.0+)?$/.test(value);
  if (draft.maxCostIncrease !== '' && (!baseline.relativeCostAvailable || zero(winner?.cost.value))) return 'A relative cost limit is unavailable for this baseline, including when its cost is zero. Leave the limit blank or obtain a comparable baseline.';
  if (draft.minCarbonReduction !== '' && (!baseline.relativeCarbonAvailable || zero(winner?.carbon.value))) return 'A relative carbon limit is unavailable for this baseline, including when its emissions are zero. Leave the limit blank or obtain a comparable baseline.';
  return null;
}
export function makeProposal(baseline: ScenarioBaseline, draft: ScenarioDraft): ScenarioProposal | null {
  const policy = normalizedPolicy(draft);
  if (!policy || proposalBlockReason(baseline, draft)) return null;
  return { baselineEvaluationId: baseline.snapshot.id, inputFingerprint: baseline.inputFingerprint, anchorsId: baseline.anchorsId, scopeKey: baseline.scopeKey, caseRevision: baseline.context.currentRevision, policy };
}
export function proposalKey(proposal: ScenarioProposal): string {
  return JSON.stringify([proposal.baselineEvaluationId, proposal.inputFingerprint, proposal.anchorsId, proposal.scopeKey, proposal.caseRevision, policyKey(proposal.policy)]);
}
/** Checks identity and invariants only; do not derive metrics, filter candidates or recalculate scores. */
export function scenarioResultIssue(result: ScenarioResult, baseline: ScenarioBaseline): string | null {
  const proposal = result.proposal;
  const base = baseline.snapshot;
  const snap = result.snapshot;
  if (!result.scenarioId || !result.requestId || !policyKey(proposal.policy)) return 'The scenario result has incomplete references or invalid settings.';
  const undefinedLimit = relativeLimitBlockReason(baseline, proposal.policy);
  if (undefinedLimit) return undefinedLimit;
  if (proposal.baselineEvaluationId !== base.id || proposal.inputFingerprint !== baseline.inputFingerprint || proposal.anchorsId !== baseline.anchorsId || proposal.scopeKey !== baseline.scopeKey || proposal.caseRevision !== base.inputRevision) return 'The scenario does not match this frozen baseline.';
  if (snap.id === base.id || snap.caseId !== base.caseId || snap.inputRevision !== base.inputRevision || snap.mode !== base.mode || snap.factorStatus !== base.factorStatus || snap.quantityLabel !== base.quantityLabel || snap.costBasis !== base.costBasis || snap.carbonBoundary !== base.carbonBoundary) return 'The scenario changed the baseline identity or comparison scope.';
  if ((['cost', 'leadTime', 'carbon'] as const).some((key) => !snap.policy[key].endsWith('%') || hundredths(snap.policy[key].slice(0, -1)) !== hundredths(proposal.policy[key]))) return 'The result policy differs from the settings that were applied.';
  const problem = rankingIssue(snap, baseline.context);
  if (problem) return problem;
  if (snap.offers.length !== base.offers.length) return 'The scenario changed the frozen quotation set.';
  for (const offer of snap.offers) {
    const original = base.offers.find((item) => item.id === offer.id);
    if (!original || original.confirmedRevisionId !== offer.confirmedRevisionId || original.eligibility !== offer.eligibility
      || original.supplierName !== offer.supplierName || JSON.stringify(original.evidence) !== JSON.stringify(offer.evidence)
      || original.limitations.some((limitation) => !offer.limitations.includes(limitation))
      || JSON.stringify(original.checks) !== JSON.stringify(offer.checks)
      || ['cost', 'delivery', 'carbon'].some((key) => {
        const metric = key as 'cost' | 'delivery' | 'carbon';
        return JSON.stringify(original[metric]) !== JSON.stringify(offer[metric]);
      }) || original.arrivalDate !== offer.arrivalDate) return 'A scenario cannot alter confirmed inputs, hard requirements or recorded metrics.';
  }
  if (result.deltas && (result.deltas.quoteId !== snap.winnerQuoteId || result.deltas.baselineQuoteId !== base.winnerQuoteId)) return 'The supplied differences refer to another offer.';
  return null;
}
export function draftMatchesResult(draft: ScenarioDraft, result: ScenarioResult): boolean {
  return policyKey(draft) !== null && policyKey(draft) === policyKey(result.proposal.policy);
}
export function scenarioSelectionBlockReason(baseline: ScenarioBaseline, draft: ScenarioDraft, result: ScenarioResult | null, operation: ScenarioOperation): string | null {
  const issue = baselineBlockReason(baseline);
  if (issue) return issue;
  if (operation.status !== 'idle') return 'Resolve the scenario operation before reviewing a decision.';
  if (!result) return 'Apply a scenario before reviewing its decision.';
  const resultIssue = scenarioResultIssue(result, baseline);
  if (resultIssue) return resultIssue;
  if (!draftMatchesResult(draft, result)) return 'These results use the previously applied settings. Apply your draft or restore the applied settings before choosing.';
  if (result.snapshot.historical) return 'This scenario is historical. Evaluate current inputs before continuing.';
  if (!result.snapshot.selectionAllowed || !result.snapshot.rankedQuoteIds.length) return 'No offer is available for a decision under these settings.';
  return null;
}
export function scenarioOfferSelectable(baseline: ScenarioBaseline, draft: ScenarioDraft, result: ScenarioResult | null, operation: ScenarioOperation, quoteId: string): boolean {
  return result !== null && scenarioSelectionBlockReason(baseline, draft, result, operation) === null &&
    selectableOffer(result.snapshot, baseline.context, { status: 'idle', message: '' }, quoteId);
}
