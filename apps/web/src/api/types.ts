import type { components } from './generated/schema';
export type CaseRequirement = components['schemas']['Requirement'];
export type CaseCreate = components['schemas']['CaseCreate'];
export type CaseRead = components['schemas']['CaseRead'];
export type CaseList = components['schemas']['CaseList'];
export type HealthRead = components['schemas']['Health'];
export type QuoteList = components['schemas']['QuoteList'];
export type QuoteRead = components['schemas']['QuoteRead'];
export type QuoteData = components['schemas']['QuoteData'];
export type MutationReceipt = components['schemas']['MutationReceipt'];
export type OperationRead = MutationReceipt;
export type SaveDraft = components['schemas']['SaveDraft'];
export type ConfirmQuote = components['schemas']['ConfirmQuote'];
export type ExtractRequest = components['schemas']['StartExtraction'];
export type RunRead = components['schemas']['RunRead'];
export type RunEvents = components['schemas']['RunEvents'];
export type ReviewDecision = components['schemas']['ReviewDecision'];
export type CloseOperation = components['schemas']['CloseOperation'];
export type OperationResolution = components['schemas']['OperationResolution'];
// The runtime response guard requires serialized defaults before the UI consumes them.
type ComparisonContract = components['schemas']['CaseComparison'];
type ComparisonRowContract = ComparisonContract['rows'][number];
export type CaseComparison = Omit<ComparisonContract, 'rows'> & {
  rows: (Omit<ComparisonRowContract, 'metrics'> & {
    metrics: Required<NonNullable<ComparisonRowContract['metrics']>>;
  })[];
};

export type SelectionCreate = components['schemas']['SelectionCreate'];
export type SelectionOperation = components['schemas']['SelectionOperation'];
export type SelectionList = components['schemas']['SelectionList'];
export type SelectionRecord = Omit<components['schemas']['SelectionRecord'], 'comparison_snapshot'> & { comparison_snapshot: CaseComparison };
export type SelectionRead = Omit<components['schemas']['SelectionRead'], 'selection'> & { selection: SelectionRecord };
