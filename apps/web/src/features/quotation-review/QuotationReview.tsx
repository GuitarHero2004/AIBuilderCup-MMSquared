import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { hasFieldEvidence } from './model';
import type { QuotationReviewProps, ReviewDraftField, ReviewField, ReviewGroup } from './types';
import './quotation-review.css';

const groups: { id: ReviewGroup; title: string; description: string }[] = [
  { id: 'textile', title: 'Fabric specification', description: 'Check the quoted construction and dimensions. Usable width and total width have different purposes.' },
  { id: 'commercial', title: 'Price and purchasing terms', description: 'Review the price unit, minimum order and included charges against the case’s comparison basis.' },
  { id: 'delivery', title: 'Delivery commitment', description: 'The full order must arrive at the buyer. Production time alone is not an arrival commitment.' },
  { id: 'logistics', title: 'Transport and shipment', description: 'Keep net fabric mass distinct from shipment mass. Unknown inputs stay unknown.' },
  { id: 'evidence', title: 'Required evidence', description: 'A document reference is a claim. Review its applicability to this case; it does not verify a certificate.' },
];
const emptyDraft: ReviewDraftField = { value: '', reviewed: false, note: '', basis: 'extracted' };

function originalLabel(field: ReviewField) {
  if (field.originalValue === null || field.originalValue === '') return 'Not found in extraction';
  return field.options?.find((option) => option.value === field.originalValue)?.label ?? field.originalValue;
}

function confirmationTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(date);
}

export function QuotationReview(props: QuotationReviewProps) {
  const { quote, fields, draft, issues, document: sourceDocument, dirty, operation, confirmation,
    onFieldChange, onSave, onConfirm, onCheckSaved, onResolveConflict, onBack, onNext, onClarify } = props;
  const instanceId = useId();
  const [mobilePane, setMobilePane] = useState<'source' | 'fields'>('fields');
  const [selectedId, setSelectedId] = useState(fields[0]?.id ?? '');
  const selectedField = fields.find((field) => field.id === selectedId) ?? fields[0];
  const selectedPage = selectedField?.source?.page;
  const sourceHeading = useRef<HTMLHeadingElement>(null);
  const fieldsHeading = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const confirmTrigger = useRef<HTMLButtonElement>(null);
  const cancelConfirmation = useRef<HTMLButtonElement>(null);
  const fieldInputs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  const groupDetails = useRef<Record<string, HTMLDetailsElement | null>>({});
  const confirmSnapshot = useRef<{ quoteId: string; caseRevision: number; draftRevision: number } | null>(null);
  const operationBusy = !['idle', 'error'].includes(operation.status);
  const blockingIssues = issues.filter((issue) => issue.blocksConfirmation);
  const hardFailures = issues.filter((issue) => issue.kind === 'hard_failure');
  const unresolved = issues.filter((issue) => issue.kind === 'information' && issue.impact.length > 0);
  const reviewedCount = fields.filter((field) => draft[field.id]?.reviewed).length;
  const receiptCurrent = confirmation !== null && confirmation.draftRevision === quote.savedDraftRevision && !dirty;
  const canConfirm = !operationBusy && !dirty && blockingIssues.length === 0 && !receiptCurrent;
  const canSave = !operationBusy && dirty && !issues.some(issue => issue.kind === 'validation' && issue.blocksConfirmation);
  const documentReady = sourceDocument.availability === 'ready' && Boolean(sourceDocument.url);
  const pageKnown = typeof selectedPage === 'number' && selectedPage >= 1 && (sourceDocument.pageCount === null || selectedPage <= sourceDocument.pageCount);
  const sourceUrl = sourceDocument.url ? `${sourceDocument.url.split('#')[0]}${pageKnown ? `#page=${selectedPage}` : ''}` : null;
  const gateMessage = operationBusy ? 'Resolve the current operation before saving or confirming again.'
    : dirty && !canSave ? 'Correct invalid field formats before saving your changes.' : dirty ? 'Save your changes before confirming the latest revision.'
      : receiptCurrent ? 'This saved revision has already been confirmed. Later edits require a new confirmation.'
        : blockingIssues.length > 0 ? `${blockingIssues.length} review ${blockingIssues.length === 1 ? 'issue needs' : 'issues need'} attention before confirmation.`
          : 'The saved draft is ready for your explicit confirmation. This does not determine eligibility.';

  useEffect(() => {
    if (confirmationDialog.current?.open && (!canConfirm || (confirmSnapshot.current?.quoteId !== quote.id || confirmSnapshot.current?.caseRevision !== quote.caseRevision || confirmSnapshot.current?.draftRevision !== quote.savedDraftRevision))) {
      confirmationDialog.current.close();
    }
  }, [canConfirm, quote.id, quote.caseRevision, quote.savedDraftRevision]);

  function focusField(fieldId: string) {
    const field = fields.find((item) => item.id === fieldId);
    if (!field) return;
    setSelectedId(fieldId);
    setMobilePane('fields');
    if (groupDetails.current[field.group]) groupDetails.current[field.group]!.open = true;
    requestAnimationFrame(() => fieldInputs.current[fieldId]?.focus());
  }

  function showSource(fieldId: string) {
    setSelectedId(fieldId);
    setMobilePane('source');
    requestAnimationFrame(() => sourceHeading.current?.focus());
  }

  function changeValue(field: ReviewField, value: string) {
    const entry = draft[field.id] ?? emptyDraft;
    onFieldChange(field.id, { value, reviewed: false, basis: value.trim() !== (field.originalValue ?? '').trim() && entry.basis === 'extracted' ? 'correction' : entry.basis });
  }

  function openConfirmation() {
    if (!canConfirm) return;
    confirmSnapshot.current = { quoteId: quote.id, caseRevision: quote.caseRevision, draftRevision: quote.savedDraftRevision };
    confirmationDialog.current?.showModal();
    cancelConfirmation.current?.focus();
  }

  function submitConfirmation() {
    if (!canConfirm || (confirmSnapshot.current?.quoteId !== quote.id || confirmSnapshot.current?.caseRevision !== quote.caseRevision || confirmSnapshot.current?.draftRevision !== quote.savedDraftRevision)) {
      confirmationDialog.current?.close();
      return;
    }
    confirmationDialog.current?.close();
    onConfirm();
  }

  function renderField(field: ReviewField) {
    const entry = draft[field.id] ?? emptyDraft;
    const inputId = `${instanceId}-${field.id}`;
    const fieldIssues = issues.filter((issue) => issue.fieldId === field.id);
    // The checkbox and status already explain a routine review step. Keep every issue
    // in the checklist, and reserve inline feedback for information that adds guidance.
    const inlineIssues = fieldIssues.filter((issue) => issue.kind !== 'review' || issue.id !== `${field.id}-review`);
    const fieldBlocking = inlineIssues.some((issue) => issue.blocksConfirmation);
    const valueChanged = entry.value.trim() !== (field.originalValue ?? '').trim();
    const needsExplanation = valueChanged || !hasFieldEvidence(field) || entry.basis !== 'extracted';
    const unknown = !entry.value.trim();
    return <div key={field.id} className={`qr-field${selectedId === field.id ? ' qr-field-selected' : ''}`}>
      <div className="qr-field-heading"><label htmlFor={inputId}>{field.label}{field.unit && <span className="qr-unit"> · {field.unit}</span>}</label>
        <span className={`qr-review-label status-badge ${entry.reviewed ? 'status-success' : 'status-neutral'}`}>{entry.reviewed ? 'Reviewed' : 'Not reviewed'}</span></div>
      {field.help && <p id={`${inputId}-help`} className="qr-help">{field.help}</p>}
      <div className="qr-input-row">
        {field.kind === 'select' ? <select id={inputId} ref={(element) => { fieldInputs.current[field.id] = element; }} value={entry.value}
          disabled={operationBusy} aria-invalid={fieldIssues.some((issue) => issue.kind === 'validation') || undefined}
          aria-describedby={`${inputId}-original ${field.help ? `${inputId}-help` : ''} ${inlineIssues.length ? `${inputId}-issues` : ''}`}
          onFocus={() => setSelectedId(field.id)} onChange={(event) => changeValue(field, event.target.value)}>
          <option value="">Unknown / not provided</option>
          {entry.value && !field.options?.some((option) => option.value === entry.value) && <option value={entry.value}>Unsupported extracted term: {entry.value}</option>}
          {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : <input id={inputId} ref={(element) => { fieldInputs.current[field.id] = element; }} type={field.kind === 'date' ? 'date' : 'text'}
          inputMode={field.kind === 'decimal' ? 'decimal' : undefined} value={entry.value} disabled={operationBusy}
          aria-invalid={fieldIssues.some((issue) => issue.kind === 'validation') || undefined} placeholder="Unknown / not provided"
          aria-describedby={`${inputId}-original ${field.help ? `${inputId}-help` : ''} ${inlineIssues.length ? `${inputId}-issues` : ''}`}
          onFocus={() => setSelectedId(field.id)} onChange={(event) => changeValue(field, event.target.value)} />}
        {entry.value && <button type="button" className="qr-text-action" disabled={operationBusy} onClick={() => { changeValue(field, ''); fieldInputs.current[field.id]?.focus(); }} aria-label={`Clear ${field.label.toLowerCase()}`}>Clear</button>}
      </div>
      <div className="qr-source-reference"><p className="qr-original" id={`${inputId}-original`}><span>Original extraction:</span> {originalLabel(field)}</p>
      <button type="button" className="qr-evidence-action" onClick={() => showSource(field.id)}>
        {hasFieldEvidence(field) ? `View evidence${field.source?.page ? ` · page ${field.source.page}` : ' · page unavailable'}` : 'Inspect source · citation unavailable'}
      </button></div>
      {(needsExplanation || unknown || entry.note) && <div className="qr-provenance">
        {!unknown && <><label htmlFor={`${inputId}-basis`}>Basis for the reviewed value<span className="qr-sr-only"> for {field.label}</span></label>
          <select id={`${inputId}-basis`} value={entry.basis} disabled={operationBusy}
            onChange={(event) => onFieldChange(field.id, { basis: event.target.value as ReviewDraftField['basis'], reviewed: false })}>
            <option value="extracted" disabled={valueChanged || !hasFieldEvidence(field)}>Original extracted value</option>
            <option value="correction">Manual correction</option><option value="assumption">Buyer assumption</option>
          </select></>}
        <label htmlFor={`${inputId}-note`}>{unknown ? 'What is still unknown?' : entry.basis === 'assumption' ? 'Assumption and its limitation' : 'Correction evidence or review note'}<span className="qr-sr-only"> for {field.label}</span></label>
        <textarea id={`${inputId}-note`} rows={2} value={entry.note} disabled={operationBusy}
          placeholder={unknown ? 'Explain the unresolved information or clarification needed.' : 'Describe your evidence, or explain the assumption and its limitation.'}
          onChange={(event) => onFieldChange(field.id, { note: event.target.value, reviewed: false })} />
      </div>}
      <label className="qr-review-check" htmlFor={`${inputId}-reviewed`}>
        <input id={`${inputId}-reviewed`} type="checkbox" checked={entry.reviewed} disabled={operationBusy}
          onChange={(event) => onFieldChange(field.id, { reviewed: event.target.checked })} />
        <span><span className="qr-sr-only">{field.label}: </span>{unknown ? 'I reviewed this field as unknown' : 'I reviewed this value and its basis'}</span>
      </label>
      {inlineIssues.length > 0 && <ul id={`${inputId}-issues`} className={`qr-field-issues${fieldBlocking ? ' qr-field-blocked' : ''}`}>
        {inlineIssues.map((issue) => <li key={issue.id} data-issue-kind={issue.kind}>{issue.message}{issue.impact.length > 0 && <span className="qr-impact"> {issue.kind === 'hard_failure' ? 'Affects' : 'Needed for'}: {issue.impact.join(', ')}.</span>}</li>)}
      </ul>}
    </div>;
  }

  return <section className="quotation-review" aria-label="Quotation review">
    <button type="button" className="button qr-back" disabled={operationBusy} onClick={onBack}><Icon name="arrow" /> Back to quotations</button>
    <div className="qr-heading"><div><p className="eyebrow">{quote.caseName} · <span className="qr-case-revision">case revision {quote.caseRevision}</span></p>
      <h1 data-page-title tabIndex={-1}>Review quotation</h1><p className="qr-subtitle">{quote.supplierName} · {sourceDocument.fileName}</p></div>
      <span className={`status-badge ${dirty ? 'status-warning' : 'status-neutral'}`}>{dirty ? 'Unsaved changes' : `Saved draft · revision ${quote.savedDraftRevision}`}</span></div>
    <p className="qr-introduction">Check the original document, correct the draft and review each field. Saving a draft keeps your work separate from confirmation.</p>

    <div className="qr-operation" aria-live="polite" aria-atomic="true">
      {operation.status !== 'idle' && <div className={`qr-notice ${operation.status === 'error' ? 'qr-notice-error' : operation.status === 'conflict' || operation.status === 'uncertain' ? 'qr-notice-warning' : 'qr-notice-info'}`}>
        <div><strong>{({ saving: 'Saving draft', confirming: 'Recording your confirmation', checking: 'Checking the saved result', uncertain: 'The saved result is not yet known', error: 'The operation did not complete', conflict: 'A newer revision needs your review' } as const)[operation.status]}</strong>
          <p>{operation.message ?? (operation.status === 'uncertain' ? 'Keep these edits here and check the recorded result before trying again.' : operation.status === 'conflict' ? 'Your local edits are retained. Compare them with the latest saved draft before continuing.' : 'Wait for a recorded result before starting another operation.')}</p></div>
        {operation.status === 'uncertain' && <button type="button" className="button button-secondary" onClick={onCheckSaved}>Check saved result</button>}
        {operation.status === 'conflict' && onResolveConflict && <button type="button" className="button button-secondary" onClick={onResolveConflict}>Compare revisions</button>}
      </div>}
    </div>
    {confirmation && <div className={`qr-notice ${receiptCurrent ? 'qr-notice-success' : 'qr-notice-info'}`}>
      <div><strong>{receiptCurrent ? 'Review confirmation recorded' : 'Earlier confirmation · current edits are not confirmed'}</strong>
        <p>Draft revision {confirmation.draftRevision} · {confirmation.reviewerLabel} · <time dateTime={confirmation.confirmedAt}>{confirmationTime(confirmation.confirmedAt)}</time></p>
        <p>Confirms the reviewed record, including its stated unknowns and limitations. Eligibility and comparison require a separate evaluation.</p>
        {!receiptCurrent && <p>Changes require a new saved revision and confirmation. Any earlier evaluation describes the older inputs.</p>}</div>
      {receiptCurrent && onNext && <button type="button" className="button button-secondary" onClick={onNext}>Review next quotation</button>}
    </div>}

    <section className="qr-summary" aria-labelledby={`${instanceId}-summary`}>
      <div className="qr-summary-heading"><div><h2 id={`${instanceId}-summary`}>Review checklist</h2><p>{reviewedCount} of {fields.length} fields marked reviewed · {blockingIssues.length} confirmation {blockingIssues.length === 1 ? 'issue' : 'issues'}</p><progress className="qr-review-progress" max={Math.max(fields.length, 1)} value={reviewedCount} aria-label={`${reviewedCount} of ${fields.length} fields reviewed`} /></div>
        <div className="qr-summary-links"><a className="qr-text-action" href={`#${instanceId}-actions`} onClick={(event) => { event.preventDefault(); actionsRef.current?.focus(); actionsRef.current?.scrollIntoView({ block: 'start' }); }}>Save and confirm review</a>
        {onClarify && issues.some((issue) => issue.kind !== 'hard_failure') && <button type="button" className="button button-secondary" onClick={onClarify}>Draft clarification</button>}</div></div>
      {issues.length > 0 ? <details className="qr-issue-disclosure"><summary>Inspect {issues.length} review {issues.length === 1 ? 'item' : 'items'} and affected checks</summary>
        <ul>{issues.map((issue) => <li key={issue.id} data-issue-kind={issue.kind} data-routine={Boolean(issue.fieldId && issue.id === `${issue.fieldId}-review`)} className={issue.kind === 'hard_failure' ? 'qr-hard-failure' : ''}>
          {issue.fieldId ? <button type="button" className="qr-text-action" onClick={() => focusField(issue.fieldId!)}>{issue.title}</button> : <strong>{issue.title}</strong>}
          <span className="qr-issue-label">{issue.kind === 'hard_failure' ? 'Known requirement failure' : issue.blocksConfirmation ? 'Review before confirmation' : issue.impact.length ? 'Remains unresolved' : 'Information'}</span>
          <p>{issue.message}</p>{issue.impact.length > 0 && <p className="qr-help">Affected checks: {issue.impact.join(', ')}</p>}
        </li>)}</ul></details> : <p className="qr-summary-clear">No unresolved review items. Confirm the saved revision when you are satisfied with the record.</p>}
      {(hardFailures.length > 0 || unresolved.length > 0) && <p className="qr-limit-note">{hardFailures.length > 0 ? 'Known failures remain recorded and cannot be removed by confirmation. ' : ''}{unresolved.length > 0 ? 'Reviewed unknowns still block the affected checks; they are not treated as zero or a pass.' : ''}</p>}
    </section>

    <div className="qr-mobile-switch" role="group" aria-label="Review workspace view">
      <button type="button" aria-pressed={mobilePane === 'fields'} onClick={() => { setMobilePane('fields'); requestAnimationFrame(() => fieldsHeading.current?.focus()); }}>Fields</button>
      <button type="button" aria-pressed={mobilePane === 'source'} onClick={() => { setMobilePane('source'); requestAnimationFrame(() => sourceHeading.current?.focus()); }}>Source document</button>
    </div>
    <div className={`qr-workspace qr-show-${mobilePane}`}>
      <aside className="qr-source-pane" aria-labelledby={`${instanceId}-source-heading`}>
        <h2 ref={sourceHeading} tabIndex={-1} id={`${instanceId}-source-heading`}>Source document</h2>
        <p className="qr-source-name">{sourceDocument.fileName}</p><p className="qr-help">{quote.extractionLabel}</p>
        {selectedField && <div className="qr-source-evidence"><strong>{selectedField.label}</strong>
          <p className="qr-help">{selectedField.source?.label ?? 'Original extraction citation'} · {pageKnown ? `page ${selectedPage}` : 'page unavailable'}</p>
          {hasFieldEvidence(selectedField) ? <blockquote>{selectedField.source?.excerpt}</blockquote> : <p>No source excerpt is available for this field. Inspect the PDF if available, then explain any correction or assumption.</p>}
          <button type="button" className="qr-text-action" onClick={() => focusField(selectedField.id)}>Return to {selectedField.label.toLowerCase()}</button>
        </div>}
        {documentReady && sourceUrl ? <><a className="button button-secondary qr-open-source" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open original PDF in a new tab</a>
          <object className="qr-pdf" data={sourceUrl} type="application/pdf" aria-label={`Original PDF: ${sourceDocument.fileName}`}>
            <p>The browser cannot display this PDF here. Use “Open original PDF in a new tab” to inspect it.</p>
          </object><p className="qr-help">The PDF viewer depends on your browser. Citations show extracted text; no text highlight or verification is implied.</p></>
          : <div className="qr-document-unavailable"><strong>{sourceDocument.availability === 'loading' ? 'Loading the source document' : 'Source PDF unavailable'}</strong><p>{sourceDocument.message ?? 'The original document cannot be opened here. Any available extraction excerpts are shown separately; they do not replace the full source.'}</p></div>}
      </aside>
      <div className="qr-fields-pane" aria-labelledby={`${instanceId}-fields-heading`}>
        <div className="qr-fields-heading"><h2 ref={fieldsHeading} tabIndex={-1} id={`${instanceId}-fields-heading`}>Reviewed fields</h2><p className="qr-help">An edit clears that field’s review check. Original extraction values stay unchanged.</p></div>
        {groups.filter((group) => fields.some((field) => field.group === group.id)).map((group) => <details className="qr-field-group" key={group.id} open ref={(element) => { groupDetails.current[group.id] = element; }}>
          <summary>{group.title}<span>{fields.filter((field) => field.group === group.id && draft[field.id]?.reviewed).length} / {fields.filter((field) => field.group === group.id).length} reviewed</span></summary>
          <p className="qr-group-help">{group.description}</p>
          {fields.filter((field) => field.group === group.id).map(renderField)}
        </details>)}
      </div>
    </div>
    <footer ref={actionsRef} id={`${instanceId}-actions`} tabIndex={-1} className="qr-actions" aria-label="Save and confirm review">
      <div><strong>{dirty ? 'Your changes are not saved' : `Saved draft revision ${quote.savedDraftRevision}`}</strong><p id={`${instanceId}-gate`} aria-live="polite">{gateMessage}</p></div>
      <div className="qr-action-buttons"><button className={`button ${dirty ? 'button-primary' : 'button-secondary'}`} type="button" disabled={!canSave} onClick={() => { if (canSave) onSave(); }}>Save draft</button>
        <button ref={confirmTrigger} className={`button ${dirty ? 'button-secondary' : 'button-primary'}`} type="button" disabled={!canConfirm} aria-describedby={`${instanceId}-gate`} onClick={openConfirmation}>Confirm reviewed quotation</button></div>
    </footer>
    <dialog ref={confirmationDialog} className="qr-confirm-dialog" aria-labelledby={`${instanceId}-confirm-title`} onClose={() => { confirmTrigger.current?.focus(); }}>
      <h2 id={`${instanceId}-confirm-title`}>Confirm this saved revision?</h2>
      <p>You are confirming draft revision <strong>{quote.savedDraftRevision}</strong> for <strong>{quote.supplierName}</strong>, against case revision {quote.caseRevision}.</p>
      <p>Your field reviews, corrections, assumptions and stated unknowns become the reviewed record. The original extraction remains unchanged.</p>
      {(hardFailures.length > 0 || unresolved.length > 0) && <div className="qr-confirm-limitations"><strong>Limitations remain recorded</strong><ul>{[...hardFailures, ...unresolved].map((issue) => <li key={issue.id}>{issue.title}{issue.impact.length ? ` — affects ${issue.impact.join(', ')}` : ''}</li>)}</ul></div>}
      <p>Confirmation does not approve a purchase or determine eligibility. Changes later need a new confirmation and evaluation.</p>
      <div className="qr-dialog-actions"><button ref={cancelConfirmation} type="button" className="button button-secondary" onClick={() => confirmationDialog.current?.close()}>Keep reviewing</button>
        <button type="button" className="button button-primary" onClick={submitConfirmation}>Confirm revision {quote.savedDraftRevision}</button></div>
    </dialog>
  </section>;
}
