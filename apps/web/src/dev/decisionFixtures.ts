import type { ComparisonContext, ComparisonExplanation, ComparisonSnapshot } from '../features/comparison/types';
import { explanationMatches } from '../features/comparison/model';
import { makeProposal } from '../features/scenarios/model';
import type { ScenarioBaseline, ScenarioResult } from '../features/scenarios/types';
import type { DecisionProposal, DecisionRecord, DecisionSource } from '../features/decisions/types';
import { comparisonContext, comparisonSnapshot } from './comparisonFixtures';
import { exampleDraft, preparedScenarioResult, scenarioBaseline } from './scenarioFixtures';

export const decisionExamples = [
  ['preferred', 'Review the preferred comparison offer'],
  ['alternative', 'Review an eligible alternative'],
  ['scenario', 'Review the exact Lower Carbon scenario'],
  ['unknown-save', 'Save outcome unknown'],
  ['saved-summary-unavailable', 'Decision saved; summary unavailable'],
  ['known-rejection', 'Save conclusively rejected'],
  ['stale-before-save', 'Inputs changed before saving'],
  ['stale-after-save', 'Inputs changed after a saved decision'],
  ['mismatched-receipt', 'Save returned a mismatched receipt'],
  ['saved', 'Reopen an immutable saved example'],
] as const;
export type DecisionExample = typeof decisionExamples[number][0];

/** Adapters preserve the actual selected snapshot. Fingerprints are explicitly synthetic references. */
export function comparisonDecisionSource(context: ComparisonContext, evaluation: ComparisonSnapshot, selectedQuoteId: string, explanation: ComparisonExplanation | null = null): DecisionSource {
  const matchingExplanation = explanation && explanationMatches(explanation, evaluation, context) ? structuredClone(explanation) : null;
  return { origin: 'comparison', context: structuredClone(context), evaluation: structuredClone(evaluation),
    inputFingerprint: `synthetic-evaluation-reference:${evaluation.id}`, selectedQuoteId, canSave: true, scenario: null,
    recommendationId: matchingExplanation ? `demo-rec-${evaluation.id}` : null, explanation: matchingExplanation };
}
export function scenarioDecisionSource(baseline: ScenarioBaseline, result: ScenarioResult, selectedQuoteId: string): DecisionSource {
  return { origin: 'scenario', context: structuredClone(baseline.context), evaluation: structuredClone(result.snapshot),
    inputFingerprint: `synthetic-scenario-evaluation-reference:${result.snapshot.id}`, selectedQuoteId, canSave: true,
    scenario: { baseline: structuredClone(baseline), result: structuredClone(result) }, recommendationId: null, explanation: null };
}
export function decisionExampleSource(example: DecisionExample, family: number): DecisionSource {
  if (example === 'scenario') {
    const baseline = scenarioBaseline('ready', family);
    const proposal = makeProposal(baseline, exampleDraft('applied'))!;
    const result = preparedScenarioResult(baseline, proposal, `decision-example-scenario-${family}`, `decision-example-confirmed-scenario-${family}`)!;
    return scenarioDecisionSource(baseline, result, 'b');
  }
  return comparisonDecisionSource(comparisonContext(), comparisonSnapshot('complete', `decision-example-evaluation-${family}`), example === 'alternative' ? 'b' : 'a');
}

/** Simulated server receipt only: clones exact reviewed data, with no new calculation or persistence. */
export function suppliedDecisionRecord(proposal: DecisionProposal, requestId: string): DecisionRecord {
  const source = structuredClone(proposal.source);
  const offer = source.evaluation.offers.find((item) => item.id === source.selectedQuoteId)!;
  return { id: `synthetic-decision-${requestId}`, requestId, caseId: source.context.id, evaluationId: source.evaluation.id,
    scenarioId: source.scenario?.result.scenarioId ?? null, recommendationId: source.recommendationId, inputFingerprint: source.inputFingerprint,
    selectedQuoteId: source.selectedQuoteId, selectedConfirmedRevisionId: offer.confirmedRevisionId!,
    selectedByUid: 'synthetic-reviewer', selectedByLabel: 'Synthetic reviewer', createdAt: '2026-10-16T07:30:00.000Z',
    reason: proposal.reason, summary: source };
}
