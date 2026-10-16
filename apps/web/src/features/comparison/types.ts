/** Presentation models only; generate API DTOs from the agreed backend contract. */
export interface ComparisonMetric {
  value: string | null;
  unit: string;
  unavailableReason?: string;
}
export interface ComparisonCheck {
  label: string;
  state: 'pass' | 'fail' | 'needs_review';
  reason: string;
}
export interface ComparisonOffer {
  id: string;
  supplierName: string;
  confirmedRevisionId: string | null;
  eligibility: 'eligible' | 'ineligible' | 'needs_review';
  scenarioFeasible: boolean | null;
  reasons: string[];
  cost: ComparisonMetric;
  delivery: ComparisonMetric;
  carbon: ComparisonMetric;
  arrivalDate: string | null;
  weightedScore: number | null;
  /** Mandatory eligibility/comparability checks; nonblocking caveats belong in limitations. */
  checks: ComparisonCheck[];
  evidence: { label: string; value: string }[];
  limitations: string[];
}
export interface ComparisonSnapshot {
  id: string;
  caseId: string;
  inputRevision: number;
  historical: boolean;
  createdAt: string;
  mode: 'synthetic' | 'connected';
  status: 'complete' | 'incomplete' | 'no_feasible_option';
  selectionAllowed: boolean;
  selectableQuoteIds: string[];
  factorStatus: 'approved' | 'test_only' | 'unavailable';
  policy: { name: string; cost: string; leadTime: string; carbon: string };
  quantityLabel: string;
  costBasis: string;
  carbonBoundary: string;
  rankedQuoteIds: string[];
  winnerQuoteId: string | null;
  offers: ComparisonOffer[];
  limitations: string[];
}
export interface ComparisonExplanation {
  status: 'unavailable' | 'ready';
  evaluationId: string | null;
  recommendedQuoteId: string | null;
  validated: boolean;
  summary: string;
  tradeoffs: string[];
  limitations: string[];
}
export interface ComparisonOperation {
  /** Only a read-only request bound to this snapshot is explanation; omitted kinds block conservatively. */
  kind?: 'evaluation' | 'explanation' | 'refresh';
  status: 'idle' | 'running' | 'checking' | 'uncertain' | 'error';
  message: string;
}
export interface ComparisonContext {
  id: string;
  name: string;
  currentRevision: number;
  quantityLabel: string;
  budgetLabel: string;
  deliveryLabel: string;
}
export interface ComparisonProps {
  context: ComparisonContext;
  snapshot: ComparisonSnapshot | null;
  explanation: ComparisonExplanation;
  operation: ComparisonOperation;
  canEvaluate: boolean;
  evaluationBlockedReason: string | null;
  onEvaluate: () => void;
  onCheckResult: () => void;
  onBack: () => void;
  onInspectQuotation?: (quoteId: string, revisionId: string | null) => void;
  onRequestExplanation?: () => void;
  onReviewDecision?: (evaluationId: string, quoteId: string) => void;
}
