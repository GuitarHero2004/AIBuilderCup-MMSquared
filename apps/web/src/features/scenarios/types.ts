import type { ComparisonContext, ComparisonSnapshot } from '../comparison/types';

/** Presentation types only; backend DTOs must be generated from agreed OpenAPI. */
export type ScenarioPreset = 'balanced' | 'lowest_cost' | 'lower_carbon' | 'fastest_delivery' | 'custom';
export interface ScenarioDraft {
  preset: ScenarioPreset;
  /** Editable percentages, not fractional API weights. Blank caps mean disabled; zero is a real cap. */
  cost: string;
  leadTime: string;
  carbon: string;
  maxCostIncrease: string;
  minCarbonReduction: string;
}
export interface ScenarioBaseline {
  context: ComparisonContext;
  snapshot: ComparisonSnapshot;
  inputFingerprint: string;
  anchorsId: string;
  scopeKey: string;
  scenarioAllowed: boolean;
  blockedReason?: string;
  relativeCostAvailable: boolean;
  relativeCarbonAvailable: boolean;
}
export interface ScenarioProposal {
  baselineEvaluationId: string;
  inputFingerprint: string;
  anchorsId: string;
  scopeKey: string;
  caseRevision: number;
  policy: ScenarioDraft;
}
export interface ScenarioDeltas {
  quoteId: string;
  baselineQuoteId: string;
  /** Supplied display values; the browser never calculates procurement differences. */
  cost: string | null;
  delivery: string | null;
  carbon: string | null;
  notes: string[];
}
export interface ScenarioResult {
  scenarioId: string;
  requestId: string;
  proposal: ScenarioProposal;
  snapshot: ComparisonSnapshot;
  deltas: ScenarioDeltas | null;
}
export interface ScenarioOperation {
  id: string | null;
  status: 'idle' | 'running' | 'checking' | 'uncertain' | 'error';
  message: string;
  /** A confirmed scenario whose evaluation must be resumed, without confirming again. */
  confirmedScenarioId?: string | null;
}
export interface ScenarioProps {
  baseline: ScenarioBaseline;
  draft: ScenarioDraft;
  applied: ScenarioResult | null;
  operation: ScenarioOperation;
  onDraftChange: (draft: ScenarioDraft) => void;
  onApply: (proposal: ScenarioProposal) => void;
  onCheckResult: () => void;
  onResumeEvaluation?: () => void;
  onBack: () => void;
  onReviewDecision?: (scenarioId: string, evaluationId: string, quoteId: string) => void;
}
