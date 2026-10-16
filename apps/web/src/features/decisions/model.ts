import { explanationMatches, rankingIssue, selectableOffer, selectionBlockReason } from '../comparison/model';
import { scenarioOfferSelectable, scenarioResultIssue } from '../scenarios/model';
import type { DecisionOperation, DecisionProposal, DecisionRecord, DecisionSource } from './types';

/** Proposed UI text budget, not a claim about an existing API constraint. Count Unicode code points. */
export const decisionReasonLimit = 2000;
export const reasonLength = (reason: string): number => Array.from(reason).length;
export function reasonIssue(reason: string): string | null {
  if (!reason.replace(/[\s\u200B-\u200D\uFEFF]/gu, '')) return 'Explain why you chose this offer before saving your decision.';
  if (reasonLength(reason.trim()) > decisionReasonLimit) return 'Keep your reason within 2,000 characters.';
  return null;
}
export function decisionSourceIssue(source: DecisionSource): string | null {
  const { context, evaluation } = source;
  if (!context.id || !evaluation.id || !source.inputFingerprint || !Number.isInteger(context.currentRevision) || context.currentRevision < 1) return 'The decision references are incomplete. Return to a current evaluation.';
  const issue = selectionBlockReason(evaluation, context, { status: 'idle', message: '' });
  if (issue) return issue;
  if (!source.canSave) return source.blockedReason || 'Saving a decision is unavailable for this evaluation.';
  if (!selectableOffer(evaluation, context, { status: 'idle', message: '' }, source.selectedQuoteId)) return 'The selected quotation is not a permitted current choice.';
  if (source.origin === 'scenario') {
    if (!source.scenario) return 'The confirmed scenario references are missing.';
    const { baseline, result } = source.scenario;
    const problem = scenarioResultIssue(result, baseline);
    if (problem) return problem;
    if (baseline.context.id !== context.id || baseline.context.currentRevision !== context.currentRevision || !scenarioOfferSelectable(baseline, result.proposal.policy, result, { id: null, status: 'idle', message: '' }, source.selectedQuoteId)
      || JSON.stringify(result.snapshot) !== JSON.stringify(evaluation) || source.inputFingerprint === baseline.inputFingerprint) return 'The decision does not match the applied scenario and its current evaluation.';
  } else if (source.origin !== 'comparison' || source.scenario !== null) return 'The decision source has inconsistent scenario references.';
  if ((source.explanation?.status === 'ready' && (!source.recommendationId || !explanationMatches(source.explanation, evaluation, context))) || (source.recommendationId !== null && (!source.recommendationId || !source.explanation || !explanationMatches(source.explanation, evaluation, context)))) return 'The recommendation does not match this evaluation. Refresh its references before saving.';
  return null;
}
export function sourceKey(source: DecisionSource): string {
  return JSON.stringify(source);
}
export function makeDecisionProposal(source: DecisionSource, reason: string): DecisionProposal | null {
  if (decisionSourceIssue(source) || reasonIssue(reason)) return null;
  return { source: structuredClone(source), reason: reason.trim() };
}
export function decisionProposalKey(proposal: DecisionProposal): string {
  return JSON.stringify([sourceKey(proposal.source), proposal.reason]);
}
export function decisionLocked(operation: DecisionOperation): boolean {
  return Boolean(operation.confirmedDecisionId) || ['saving', 'checking', 'uncertain', 'reading'].includes(operation.status);
}
export function decisionSaveIssue(source: DecisionSource, reason: string, operation: DecisionOperation, currentCaseRevision = source.context.currentRevision): string | null {
  if (decisionLocked(operation)) return operation.confirmedDecisionId ? 'This decision is already saved. Read its existing summary; do not save it again.' : 'Resolve this same save operation before submitting another decision.';
  if (currentCaseRevision !== source.context.currentRevision) return 'Case inputs changed. Return to a current evaluation before saving.';
  return decisionSourceIssue(source) || reasonIssue(reason);
}
export function decisionRecordIssue(record: DecisionRecord, expected: { proposal?: DecisionProposal | null; requestId?: string | null; decisionId?: string | null; caseId?: string } = {}): string | null {
  if (!record.id || !record.requestId || !record.selectedByUid || !record.selectedByLabel || !record.createdAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(record.createdAt) || !Number.isFinite(Date.parse(record.createdAt))) return 'The saved decision receipt is incomplete.';
  if (reasonIssue(record.reason) || record.reason !== record.reason.trim()) return 'The saved decision has an invalid selection reason.';
  const summary = record.summary;
  // Validate the recorded context as it was saved; current freshness is deliberately separate.
  const sourceIssue = decisionSourceIssue(summary);
  if (sourceIssue || rankingIssue(summary.evaluation, summary.context)) return 'The saved summary contains inconsistent or unverified source information.';
  const offer = summary.evaluation.offers.find((item) => item.id === summary.selectedQuoteId);
  if (record.caseId !== summary.context.id || record.evaluationId !== summary.evaluation.id || record.recommendationId !== summary.recommendationId || record.selectedQuoteId !== summary.selectedQuoteId
    || record.selectedConfirmedRevisionId !== offer?.confirmedRevisionId || record.inputFingerprint !== summary.inputFingerprint
    || record.scenarioId !== (summary.scenario?.result.scenarioId ?? null)) return 'The saved decision references do not match its immutable summary.';
  if ((expected.caseId && record.caseId !== expected.caseId) || (expected.requestId && record.requestId !== expected.requestId)
    || (expected.decisionId && record.id !== expected.decisionId)) return 'The returned decision belongs to another request or case.';
  if (expected.proposal && (record.reason !== expected.proposal.reason || sourceKey(summary) !== sourceKey(expected.proposal.source))) return 'The returned decision differs from the reviewed choice or reason.';
  return null;
}
export function decisionIsHistorical(record: DecisionRecord, currentCaseRevision: number): boolean {
  return record.summary.context.currentRevision !== currentCaseRevision;
}
