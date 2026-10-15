/** Presentation models only. These are not wire contracts or generated API types. */
export interface IntakeCaseInfo {
  name: string;
  revision: number;
  quantityLabel: string;
  budgetLabel: string;
  deliveryLabel: string;
  fabricLabel: string;
}

export interface IntakeQuotation {
  id: string;
  fileName: string;
  source: 'upload' | 'synthetic_sample';
  byteSize: number | null;
  pageCount: number | null;
  processingStatus: 'uploaded' | 'running' | 'succeeded' | 'failed' | 'interrupted';
  reviewStatus: 'not_ready' | 'needs_review' | 'confirmed';
  missingFieldCount: number | null;
  message?: string;
  retryAllowed?: boolean;
}

export interface IntakeSample {
  id: string;
  label: string;
  fileName: string;
  description: string;
}

export interface IntakeCollection {
  status: 'loading' | 'unavailable' | 'error' | 'ready';
  quotations: IntakeQuotation[];
  message?: string;
}

export interface IntakeTransfer {
  status: 'idle' | 'uploading' | 'checking' | 'uncertain' | 'error';
  message?: string;
}

export interface IntakeLimits {
  maxFileBytes: number;
  maxPages: number;
  maxQuotes: number;
}

export interface QuotationIntakeProps {
  caseInfo: IntakeCaseInfo;
  collection: IntakeCollection;
  transfer: IntakeTransfer;
  limits: IntakeLimits;
  samples: IntakeSample[];
  processingNotice: string;
  retentionNotice: string;
  selectionResetKey?: number | string;
  onBack: () => void;
  onRefresh: () => void;
  onUpload: (file: File) => void;
  onUseSample: (sampleId: string) => void;
  onExtract?: (quoteId: string) => void;
  onRetryExtraction?: (quoteId: string) => void;
  onReview?: (quoteId: string) => void;
}
