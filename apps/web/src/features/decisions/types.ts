import type { ComparisonContext, ComparisonExplanation, ComparisonSnapshot } from '../comparison/types';
import type { ScenarioBaseline, ScenarioResult } from '../scenarios/types';

/** Presentation models only. Backend request/response types require agreed OpenAPI. */
export interface DecisionSource {
  origin: 'comparison' | 'scenario';
  context: ComparisonContext;
  evaluation: ComparisonSnapshot;
  inputFingerprint: string;
  selectedQuoteId: string;
  canSave: boolean;
  blockedReason?: string;
  scenario: { baseline: ScenarioBaseline; result: ScenarioResult } | null;
  recommendationId: string | null;
  explanation: ComparisonExplanation | null;
}
export interface DecisionProposal {
  source: DecisionSource;
  reason: string;
}
export interface DecisionRecord {
  id: string;
  requestId: string;
  caseId: string;
  evaluationId: string;
  recommendationId: string | null;
  scenarioId: string | null;
  inputFingerprint: string;
  selectedQuoteId: string;
  selectedConfirmedRevisionId: string;
  selectedByUid: string;
  selectedByLabel: string;
  createdAt: string;
  reason: string;
  /** Server-owned immutable summary in connected use; an exact cloned fixture in the preview. */
  summary: DecisionSource;
}
export interface DecisionOperation {
  id: string | null;
  status: 'idle' | 'saving' | 'checking' | 'uncertain' | 'error' | 'reading';
  message: string;
  /** Once known, this receipt survives failed/malformed summary reads. Never submit again. */
  confirmedDecisionId?: string | null;
  proposal?: DecisionProposal | null;
}
export interface DecisionProps {
  source: DecisionSource;
  reason: string;
  operation: DecisionOperation;
  record: DecisionRecord | null;
  /** Current freshness is separate from the immutable saved summary. */
  currentCaseRevision: number;
  onReasonChange: (reason: string) => void;
  onSave: (proposal: DecisionProposal) => void;
  onCheckSave: () => void;
  onReadSaved: () => void;
  onBack: () => void;
}
