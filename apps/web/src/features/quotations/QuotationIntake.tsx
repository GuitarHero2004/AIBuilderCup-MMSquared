import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import { formatFileBytes, preflightPdf } from './pdfPreflight';
import type { IntakeQuotation, QuotationIntakeProps } from './types';
import '../quotation-intake.css';

const processingLabels: Record<IntakeQuotation['processingStatus'], string> = {
  uploaded: 'Ready to extract information',
  running: 'Extraction running',
  succeeded: 'Extraction complete',
  failed: 'Extraction failed',
  interrupted: 'Extraction interrupted',
};

const reviewLabels: Record<IntakeQuotation['reviewStatus'], string> = {
  not_ready: 'Not ready for review',
  needs_review: 'Needs your review',
  confirmed: 'Confirmed by buyer',
};

function UploadPane({ limits, samples, transfer, disabled, onUpload, onUseSample }: Pick<QuotationIntakeProps,
  'limits' | 'samples' | 'transfer' | 'onUpload' | 'onUseSample'> & { disabled: boolean }) {
  const inputId = useId();
  const sampleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionVersion = useRef(0);
  const submitted = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [checking, setChecking] = useState(false);
  const [selectionLimit, setSelectionLimit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState('');
  const selectedSample = samples.find((item) => item.id === sample);
  const limitChanged = file !== null && selectionLimit !== limits.maxFileBytes;
  const validationError = limitChanged ? 'The file limit changed. Recheck the selected PDF against the current limit.' : error;

  useEffect(() => {
    if (transfer.status === 'idle' || transfer.status === 'error') submitted.current = false;
  }, [transfer.status]);
  useEffect(() => () => { selectionVersion.current += 1; }, []);

  async function selectFile(selected: File | null) {
    const version = ++selectionVersion.current;
    setFile(selected);
    setSelectionLimit(selected ? limits.maxFileBytes : null);
    setError(null);
    setChecking(selected !== null);
    if (!selected) return;
    setSample('');
    const result = await preflightPdf(selected, limits.maxFileBytes);
    if (version !== selectionVersion.current) return;
    setChecking(false);
    setError(result.ok ? null : result.message);
  }

  function clearFileSelection(focusInput = false) {
    selectionVersion.current += 1;
    setFile(null);
    setChecking(false);
    setSelectionLimit(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
    if (focusInput) inputRef.current?.focus();
  }

  function submitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || checking || submitted.current) return;
    if (!file || validationError) {
      if (!file) setError('Choose a quotation PDF before uploading.');
      inputRef.current?.focus();
      return;
    }
    submitted.current = true;
    onUpload(file);
  }

  function submitSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || checking || !selectedSample || submitted.current) return;
    submitted.current = true;
    onUseSample(selectedSample.id);
  }

  return <div className="intake-upload-options">
    <form className="intake-upload-form" onSubmit={submitFile} aria-label="Upload a quotation PDF" noValidate>
      <label className="intake-input-label" htmlFor={inputId}>Quotation PDF</label>
      <p className="intake-field-hint" id={`${inputId}-hint`}>Digital Vietnamese or English PDF, up to {formatFileBytes(limits.maxFileBytes)} and {limits.maxPages} pages.</p>
      <input ref={inputRef} id={inputId} type="file" accept=".pdf,application/pdf" disabled={disabled}
        aria-invalid={validationError ? true : undefined} aria-describedby={`${inputId}-hint ${inputId}-validation`}
        onChange={(event) => { void selectFile(event.target.files?.[0] ?? null); }} />
      <div id={`${inputId}-validation`} className={validationError ? 'intake-file-feedback intake-file-error' : 'intake-file-feedback'} aria-live="polite">
        {checking && !limitChanged ? 'Checking the file header and size…' : validationError ? <span role="alert">{validationError}</span> : file ? <><strong>{file.name}</strong> · {formatFileBytes(file.size)}<br />Basic file checks passed. The full document still needs validation after upload.</> : 'Choose a file to check it before upload.'}
      </div>
      <div className="intake-upload-actions">
        {limitChanged && <button className="button button-secondary" type="button" disabled={disabled} onClick={() => { void selectFile(file); }}>Recheck selected PDF</button>}
        <button className="button button-primary" type="submit" disabled={disabled || checking || !file || !!validationError}>
          <Icon name="plus" /> Upload quotation
        </button>
        {file && <button className="button intake-clear-action" type="button" disabled={disabled} onClick={() => clearFileSelection(true)}>Clear selected PDF</button>}
      </div>
    </form>

    <form className="intake-sample-form" onSubmit={submitSample} aria-label="Use a synthetic quotation sample">
      <label className="intake-input-label" htmlFor={sampleId}>Or use a synthetic sample</label>
      <p className="intake-field-hint" id={`${sampleId}-hint`}>Synthetic examples for exploring document review.</p>
      <select id={sampleId} value={sample} disabled={disabled || samples.length === 0} aria-describedby={`${sampleId}-hint ${sampleId}-description`}
        onChange={(event) => {
          setSample(event.target.value);
          clearFileSelection();
        }}>
        <option value="">Choose a sample</option>
        {samples.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <p className="intake-file-feedback" id={`${sampleId}-description`} aria-live="polite">
        {selectedSample ? <><strong>{selectedSample.fileName}</strong><br />{selectedSample.description}</> : samples.length === 0 ? 'No sample PDFs are available.' : 'Select a sample to see its document details.'}
      </p>
      <button className="button button-secondary" type="submit" disabled={disabled || checking || !selectedSample}>Use synthetic sample</button>
    </form>
  </div>;
}

function QuotationRow({ item, blocked, runActive, onRefresh, onExtract, onRetryExtraction, onReview }: {
  item: IntakeQuotation;
  blocked: boolean;
  runActive: boolean;
} & Pick<QuotationIntakeProps, 'onRefresh' | 'onExtract' | 'onRetryExtraction' | 'onReview'>) {
  const canReview = item.reviewStatus === 'needs_review' || item.reviewStatus === 'confirmed';
  const canStart = item.processingStatus === 'uploaded' && item.reviewStatus === 'not_ready';
  const canRetry = (item.processingStatus === 'failed' || item.processingStatus === 'interrupted') && item.retryAllowed;
  const processingTone = item.processingStatus === 'failed' || item.processingStatus === 'interrupted' ? 'error'
    : item.processingStatus === 'succeeded' ? 'success' : 'info';
  const reviewTone = item.reviewStatus === 'confirmed' ? 'success' : item.reviewStatus === 'needs_review' ? 'warning' : 'neutral';

  return <tr className="intake-quote-row" role="row">
    <th className="intake-document" scope="row" role="rowheader">
      <h3>{item.fileName}</h3>
      <p className="intake-file-meta"><span className="intake-source-label">{item.source === 'synthetic_sample' ? 'Synthetic sample' : 'Uploaded PDF'}</span><span aria-hidden="true"> · </span><span>PDF saved</span></p>
      <p className="intake-file-meta"><span>{item.byteSize === null ? 'Size unavailable' : formatFileBytes(item.byteSize)}</span><span aria-hidden="true"> · </span><span>{item.pageCount === null ? 'Page count not checked' : `${item.pageCount} ${item.pageCount === 1 ? 'page' : 'pages'}`}</span></p>
    </th>
    <td className="intake-quote-state intake-processing-cell" role="cell">
      <span className="intake-mobile-label" aria-hidden="true">Processing</span>
      <span className={`status-badge status-${processingTone}`}>{processingLabels[item.processingStatus]}</span>
      {item.message && <p className="intake-state-note">{item.message}</p>}
      {item.processingStatus === 'running' && <p className="intake-state-note">Check the recorded status after a connection loss. Completion is not guaranteed.</p>}
    </td>
    <td className="intake-quote-state intake-review-cell" role="cell">
      <span className="intake-mobile-label" aria-hidden="true">Review</span>
      <span className={`status-badge status-${reviewTone}`}>{reviewLabels[item.reviewStatus]}</span>
      {item.reviewStatus === 'needs_review' && <p className="intake-state-note">{item.missingFieldCount === null
        ? 'Missing information not assessed.'
        : item.missingFieldCount === 0
          ? 'No missing fields reported.'
          : `${item.missingFieldCount} ${item.missingFieldCount === 1 ? 'field needs' : 'fields need'} information.`}</p>}
    </td>
    <td className="intake-row-action" role="cell">
      <span className="intake-mobile-label" aria-hidden="true">Action</span>
      {!canReview && runActive && item.processingStatus !== 'running' && <p className="intake-action-note">Wait for the current extraction before starting another.</p>}
      {canReview ? onReview
        ? <button type="button" className="button button-secondary" disabled={blocked} onClick={() => onReview(item.id)} aria-label={`${item.reviewStatus === 'confirmed' ? 'View reviewed quotation' : 'Review quotation'} ${item.fileName}`}>{item.reviewStatus === 'confirmed' ? 'View reviewed quotation' : 'Review quotation'} <Icon name="arrow" size={17} /></button>
        : <p className="intake-action-note">Quotation review is not connected yet.</p>
        : canStart ? onExtract
          ? <button type="button" className="button button-secondary" disabled={blocked || runActive} onClick={() => onExtract(item.id)} aria-label={`Extract information from ${item.fileName}`}>Extract information</button>
          : <p className="intake-action-note">Extraction is not connected yet.</p>
          : item.processingStatus === 'running'
            ? <button type="button" className="button button-secondary" disabled={blocked} onClick={onRefresh} aria-label={`Check status of ${item.fileName}`}>Check status</button>
            : canRetry && onRetryExtraction
              ? <button type="button" className="button button-secondary" disabled={blocked || runActive} onClick={() => onRetryExtraction(item.id)} aria-label={`Retry extraction of ${item.fileName}`}>Retry extraction</button>
              : <p className="intake-action-note">{canRetry ? 'Extraction retry is not connected yet.' : 'Check the saved status before continuing.'}</p>}
      {canRetry && <p className="intake-action-note intake-retry-note">Retry starts a new extraction attempt and may use additional allowance.</p>}
    </td>
  </tr>;
}
export function QuotationIntake(props: QuotationIntakeProps) {
  const { caseInfo, collection, transfer, limits, processingNotice, retentionNotice, onBack, onRefresh } = props;
  const headingId = useId();
  const [addDisclosure, setAddDisclosure] = useState({ resetKey: props.selectionResetKey, expanded: false });
  const addExpanded = addDisclosure.resetKey === props.selectionResetKey && addDisclosure.expanded;
  const ready = collection.status === 'ready';
  const full = collection.quotations.length >= limits.maxQuotes;
  const runActive = collection.quotations.some((item) => item.processingStatus === 'running');
  const waiting = transfer.status === 'uploading' || transfer.status === 'checking';
  const uncertain = transfer.status === 'uncertain';
  const blocked = !ready || waiting || uncertain;
  const hasQuotations = collection.quotations.length > 0;
  // Keep recovery visible and preserve the mounted form when the section is collapsed.
  const recoveryActive = transfer.status !== 'idle';
  const addOpen = !hasQuotations || addExpanded || recoveryActive;
  const canToggleAdd = hasQuotations && !(full && ready) && !recoveryActive;

  const addPanel = (
    <section key="add" className="panel intake-add-panel" aria-labelledby={`${headingId}-add`}>
      <div className="intake-section-heading">
        <h2 id={`${headingId}-add`} tabIndex={-1}>{canToggleAdd
          ? <button type="button" className="intake-add-toggle" aria-expanded={addOpen} aria-controls={`${headingId}-upload`} onClick={() => setAddDisclosure({ resetKey: props.selectionResetKey, expanded: !addOpen })}>
            <Icon name={addOpen ? 'chevron' : 'plus'} size={18} /> Add a quotation
          </button>
          : 'Add a quotation'}</h2>
        <span className="badge badge-muted">Up to {limits.maxQuotes} per case</span>
      </div>
      <p className="intake-section-intro">{full && ready ? 'The quotation limit for this case has been reached.' : addOpen ? 'Use synthetic, non-confidential documents. Save each PDF, extract its information, then review it.' : 'Expand to choose a PDF or synthetic sample. Collapsing keeps your selection.'}</p>
      {full && ready && <p className="intake-limit-note" role="status">This case has {limits.maxQuotes} quotations. Review the existing documents to continue.</p>}
      {runActive && ready && <p className="intake-limit-note">An extraction is already running. Check its status before starting another document.</p>}
      {!ready && <p className="intake-limit-note">Adding documents is unavailable until the quotation list can be checked.</p>}
      <div id={`${headingId}-upload`} hidden={!addOpen || (full && ready)} onFocusCapture={() => {
        // A background collection refresh must not hide the form while the buyer is editing.
        if (!addExpanded) setAddDisclosure({ resetKey: props.selectionResetKey, expanded: true });
      }}>
        <UploadPane key={props.selectionResetKey} {...props} disabled={blocked || full || runActive} />
        <details className="intake-data-notice">
          <summary>Document processing and access</summary>
          <p>{processingNotice}</p><p>{retentionNotice}</p>
        </details>
      </div>
    </section>
  );
  const collectionPanel = (
    <section key="collection" className="panel intake-collection-panel" aria-labelledby={`${headingId}-collection`} aria-busy={collection.status === 'loading' || transfer.status === 'checking'}>
      <div className="intake-section-heading">
        <div><h2 id={`${headingId}-collection`} tabIndex={-1}>Case quotations</h2><p className="intake-section-intro">{ready ? `${waiting || uncertain ? 'Last checked: ' : ''}${collection.quotations.length} of ${limits.maxQuotes} quotations` : 'Saved collection status is not yet confirmed.'}</p></div>
        <button type="button" className="button button-secondary" onClick={onRefresh} disabled={collection.status === 'loading' || waiting || uncertain}><Icon name="refresh" size={17} /> Refresh list</button>
      </div>
      {collection.status === 'loading' && <p className="intake-empty" role="status">Loading saved quotations…</p>}
      {(collection.status === 'error' || collection.status === 'unavailable') && <div className={`intake-notice ${collection.status === 'error' ? 'intake-notice-error' : 'intake-notice-warning'}`} role="alert">
        <strong>{collection.status === 'error' ? 'Could not load quotations' : 'Quotation intake is unavailable'}</strong>
        <p>{collection.message ?? 'The saved collection could not be checked. Refresh the list before adding a document.'}</p>
        {collection.quotations.length > 0 && <p>The documents below are from the last successful load. Their current status has not been verified.</p>}
      </div>}
      {ready && collection.quotations.length === 0 && <div className="intake-empty"><Icon name="fabric" size={28} />
        <h3>{waiting || uncertain ? 'The saved result is not yet known' : 'No quotations yet'}</h3>
        <p>{waiting || uncertain ? 'The last loaded list was empty. Resolve the pending upload before adding another document.' : 'Add a PDF or choose a synthetic sample above. A saved document still needs extraction and human review.'}</p>
      </div>}
      {collection.quotations.length > 0 && <div className="intake-table-frame">
        <table className="intake-quote-list" role="table" aria-label="Case quotations">
          <colgroup><col className="intake-document-column" /><col className="intake-processing-column" /><col className="intake-review-column" /><col className="intake-action-column" /></colgroup>
          <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Document</th><th scope="col" role="columnheader">Processing</th><th scope="col" role="columnheader">Review</th><th scope="col" role="columnheader">Action</th></tr></thead>
          <tbody role="rowgroup">{collection.quotations.map((item) => <QuotationRow key={item.id} item={item} blocked={blocked} runActive={runActive}
            onRefresh={onRefresh} onExtract={props.onExtract} onRetryExtraction={props.onRetryExtraction} onReview={props.onReview} />)}</tbody>
        </table>
      </div>}
      <p className="intake-collection-note">Uploading or extracting a document does not confirm its terms or make the offer eligible.</p>
    </section>
  );

  return <section className="intake-page" aria-labelledby={headingId}>
    <header className="intake-page-heading">
      <button type="button" className="button button-secondary intake-back" onClick={onBack} disabled={waiting}>Back to requirements</button>
      <p className="eyebrow">QUOTATIONS · REQUIREMENTS REVISION {caseInfo.revision}</p>
      <h1 id={headingId} tabIndex={-1} data-page-title>Quotations for {caseInfo.name}</h1>
      <p className="page-intro">Collect supplier documents, then review their interpreted terms before comparing offers.</p>
    </header>

    <div className="intake-requirements">
      <dl aria-label="Saved requirements summary">
        <div><dt>Order</dt><dd>{caseInfo.quantityLabel}</dd></div>
        <div><dt>Budget</dt><dd>{caseInfo.budgetLabel}</dd></div>
        <div><dt>Delivery</dt><dd>{caseInfo.deliveryLabel}</dd></div>
      </dl>
      <details className="intake-specifications">
        <summary>Fabric specifications</summary>
        <p>{caseInfo.fabricLabel}</p>
      </details>
    </div>

    {transfer.status !== 'idle' && <div className={`intake-notice ${transfer.status === 'error' ? 'intake-notice-error' : uncertain ? 'intake-notice-warning' : ''}`} role={uncertain || transfer.status === 'error' ? 'alert' : 'status'}>
      <strong>{transfer.status === 'uploading' ? 'Adding quotation…' : transfer.status === 'checking' ? 'Checking saved quotations…' : uncertain ? 'The save outcome is unclear' : 'Quotation could not be added'}</strong>
      <p>{transfer.message ?? (uncertain ? 'The request may have saved your quotation. Check saved quotations before trying again to avoid creating a duplicate.' : transfer.status === 'error' ? 'Your selection is still here. Resolve the problem, then try again.' : transfer.status === 'checking' ? 'Wait for the saved state before taking another action.' : 'Wait for the response before adding another document.')}</p>
      {(uncertain || transfer.status === 'checking') && <button type="button" className="button button-secondary" onClick={onRefresh} disabled={transfer.status === 'checking'}>Check saved quotations</button>}
    </div>}

    {hasQuotations || !ready ? [collectionPanel, addPanel] : [addPanel, collectionPanel]}
  </section>;
}
