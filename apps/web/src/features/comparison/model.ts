import type { ComparisonContext, ComparisonExplanation, ComparisonMetric, ComparisonOffer, ComparisonOperation, ComparisonSnapshot } from './types';

const decimal = /^\d+(?:\.\d+)?$/;
export function metricAvailable(metric: ComparisonMetric): boolean {
  return metric.value !== null && decimal.test(metric.value);
}
/** Group the supplied decimal string without floating-point arithmetic or recalculation. */
export function displayMetric(metric: ComparisonMetric): string {
  if (!metricAvailable(metric)) return 'Unavailable';
  const [whole, fraction] = metric.value!.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return grouped + (fraction === undefined ? '' : '.' + fraction);
}
export function offerHasCompleteMetrics(offer: ComparisonOffer): boolean {
  return [offer.cost, offer.delivery, offer.carbon].every(metricAvailable);
}
export function operationPending(operation: ComparisonOperation): boolean {
  return ['running', 'checking', 'uncertain'].includes(operation.status);
}
export function isHistorical(snapshot: ComparisonSnapshot, context: ComparisonContext): boolean {
  return snapshot.historical || snapshot.inputRevision !== context.currentRevision;
}
/** Defensive presentation checks only. Never calculate, sort or replace the engine's ranking. */
export function rankingIssue(snapshot: ComparisonSnapshot, context: ComparisonContext): string | null {
  if (snapshot.caseId !== context.id) return 'This evaluation does not belong to the current case.';
  if (snapshot.offers.length > 4 || new Set(snapshot.offers.map((offer) => offer.id)).size !== snapshot.offers.length) return 'The evaluation has inconsistent quotation references.';
  const ids = snapshot.rankedQuoteIds;
  if (new Set(ids).size !== ids.length) return 'The evaluation repeats a ranked quotation.';
  if (snapshot.factorStatus === 'unavailable' && (ids.length > 0 || snapshot.winnerQuoteId !== null)) return 'Ranking is unavailable until compatible carbon factors are approved.';
  if (snapshot.mode === 'connected' && snapshot.factorStatus === 'test_only') return 'Test-only carbon factors cannot support a connected evaluation.';
  if (snapshot.status === 'no_feasible_option' && (ids.length > 0 || snapshot.winnerQuoteId !== null)) return 'A no-feasible-option result cannot include a ranked winner.';
  if ((ids.length === 0 && snapshot.winnerQuoteId !== null) || (ids.length > 0 && snapshot.winnerQuoteId !== ids[0])) return 'The recommendation does not match the supplied ranking.';
  for (const id of ids) {
    const offer = snapshot.offers.find((item) => item.id === id);
    if (!offer || !offer.confirmedRevisionId || offer.eligibility !== 'eligible' || offer.checks.some((check) => check.state !== 'pass') || offer.scenarioFeasible !== true || !offerHasCompleteMetrics(offer) || offer.weightedScore === null || !Number.isFinite(offer.weightedScore) || offer.weightedScore < 0 || offer.weightedScore > 100) {
      return 'A ranked quotation has incomplete or inconsistent evaluation data.';
    }
  }
  return null;
}
export function selectionBlockReason(snapshot: ComparisonSnapshot, context: ComparisonContext, operation: ComparisonOperation): string | null {
  if (operation.kind !== 'explanation' && operationPending(operation)) return 'Resolve the current evaluation operation before choosing an offer.';
  if (operation.kind !== 'explanation' && operation.status === 'error') return 'The latest evaluation check failed. Refresh or evaluate again before continuing.';
  const problem = rankingIssue(snapshot, context);
  if (problem) return problem;
  if (isHistorical(snapshot, context)) return 'These results are historical. Re-evaluate the current inputs before continuing.';
  if (!snapshot.selectionAllowed) return 'This evaluation does not permit a decision yet. Resolve its listed blockers.';
  if (snapshot.rankedQuoteIds.length === 0 || snapshot.selectableQuoteIds.length === 0) return 'No offer is currently available for a decision.';
  if (new Set(snapshot.selectableQuoteIds).size !== snapshot.selectableQuoteIds.length || snapshot.selectableQuoteIds.some((id) => !snapshot.rankedQuoteIds.includes(id))) return 'The permitted choices do not match this evaluation. Refresh before continuing.';
  return null;
}
export function selectableOffer(snapshot: ComparisonSnapshot, context: ComparisonContext, operation: ComparisonOperation, id: string): boolean {
  return selectionBlockReason(snapshot, context, operation) === null && snapshot.rankedQuoteIds.includes(id) && snapshot.selectableQuoteIds.includes(id);
}
export function explanationMatches(explanation: ComparisonExplanation, snapshot: ComparisonSnapshot, context: ComparisonContext): boolean {
  return explanation.status === 'ready' && explanation.validated && rankingIssue(snapshot, context) === null
    && explanation.evaluationId === snapshot.id && explanation.recommendedQuoteId === snapshot.winnerQuoteId;
}
