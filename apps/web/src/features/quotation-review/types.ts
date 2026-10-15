/** Presentation models only. Generate API DTOs from the agreed backend OpenAPI contract. */
export type ReviewGroup = 'textile' | 'commercial' | 'delivery' | 'logistics' | 'evidence';
export interface ReviewField {
  id: string;
  label: string;
  group: ReviewGroup;
  kind: 'text' | 'decimal' | 'select' | 'date';
  unit?: string;
  numeric?: { minimum?: string; maximum?: string; exclusiveMinimum?: boolean; integer?: boolean };
  options?: { value: string; label: string }[];
  originalValue: string | null;
  source?: { page: number | null; excerpt: string | null; label?: string };
  help?: string;
  requiredFor?: string[];
}
export interface ReviewDraftField {
  value: string;
  reviewed: boolean;
  note: string;
  basis: 'extracted' | 'correction' | 'assumption';
}
export type ReviewDraft = Record<string, ReviewDraftField>;
export interface ReviewIssue {
  id: string;
  fieldId?: string;
  title: string;
  message: string;
  impact: string[];
  kind: 'review' | 'validation' | 'hard_failure' | 'information';
  blocksConfirmation: boolean;
}
export interface ReviewDocument {
  fileName: string;
  url: string | null;
  pageCount: number | null;
  availability: 'ready' | 'loading' | 'unavailable';
  message?: string;
}
export interface ReviewOperation {
  status: 'idle' | 'saving' | 'confirming' | 'checking' | 'uncertain' | 'error' | 'conflict';
  action?: 'save' | 'confirm';
  message?: string;
}
export interface ReviewConfirmation {
  draftRevision: number;
  confirmedAt: string;
  reviewerLabel: string;
}
export interface QuotationReviewProps {
  quote: {
    id: string;
    supplierName: string;
    caseName: string;
    caseRevision: number;
    savedDraftRevision: number;
    extractionLabel: string;
  };
  fields: ReviewField[];
  draft: ReviewDraft;
  issues: ReviewIssue[];
  document: ReviewDocument;
  dirty: boolean;
  operation: ReviewOperation;
  confirmation: ReviewConfirmation | null;
  onFieldChange: (fieldId: string, patch: Partial<ReviewDraftField>) => void;
  onSave: () => void;
  onConfirm: () => void;
  onCheckSaved: () => void;
  onResolveConflict?: () => void;
  onBack: () => void;
  onNext?: () => void;
  onClarify?: () => void;
}
