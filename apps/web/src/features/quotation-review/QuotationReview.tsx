import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { hasFieldEvidence, reviewPresentation } from './model';
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
    onFieldChange, onReviewBatch, activity, onSave, onConfirm, onCheckSaved, onResolveConflict, onBack, onNext, onClarify } = props;
  const instanceId = useId();
  const [mobilePane, setMobilePane] = useState<'source' | 'fields'>('fields');
  const [allFields, setAllFields] = useState(false);
  const [localUnknownNote, setLocalUnknownNote] = useState('');
  const unknownNote = props.unknownNote ?? localUnknownNote;
  const setUnknownNote = props.onUnknownNoteChange ?? setLocalUnknownNote;
  const guided = Boolean(onReviewBatch) && !allFields;
  const presentation = new Map(fields.map(field => [field.id, reviewPresentation(field, draft, issues)]));
  const activeFields = guided ? fields.filter(field => presentation.get(field.id) !== 'optional') : fields;
  const unknownFields = fields.filter(field => presentation.get(field.id) === 'unknown');
  const pendingUnknowns = unknownFields.filter(field => !draft[field.id]?.reviewed && !draft[field.id]?.note.trim());
  const reviewedUnknowns = unknownFields.filter(field => draft[field.id]?.reviewed && draft[field.id]?.note.trim());
  const individualUnknowns = unknownFields.filter(field => !draft[field.id]?.reviewed && draft[field.id]?.note.trim());
  const [selectedId, setSelectedId] = useState(fields[0]?.id ?? '');
  const selectedField = fields.find((field) => field.id === selectedId) ?? fields[0];
  const selectedPage = selectedField?.source?.page;
  const sourceHeading = useRef<HTMLHeadingElement>(null);
  const fieldsHeading = useRef<HTMLHeadingElement>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const confirmTrigger = useRef<HTMLButtonElement>(null);
  const cancelConfirmation = useRef<HTMLButtonElement>(null);
  const citedCards = useRef<Record<string, HTMLLIElement | null>>({});
  const fieldInputs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  const groupDetails = useRef<Record<string, HTMLDetailsElement | null>>({});
  const confirmSnapshot = useRef<{ quoteId: string; caseRevision: number; draftRevision: number } | null>(null);
  const operationBusy = !['idle', 'error'].includes(operation.status);
  const blockingIssues = issues.filter((issue) => issue.blocksConfirmation);
  const hardFailures = issues.filter((issue) => issue.kind === 'hard_failure');
  const unresolved = issues.filter((issue) => issue.kind === 'information' && issue.impact.length > 0);
  const reviewedCount = activeFields.filter((field) => draft[field.id]?.reviewed).length;
  const receiptCurrent = confirmation !== null && confirmation.draftRevision === quote.savedDraftRevision && !dirty;
  const canConfirm = !operationBusy && !unknownNote.trim() && !dirty && blockingIssues.length === 0 && !receiptCurrent;
  const canSave = !operationBusy && !unknownNote.trim() && dirty && !issues.some(issue => issue.kind === 'validation' && issue.blocksConfirmation);
  const documentReady = sourceDocument.availability === 'ready' && Boolean(sourceDocument.url);
  const pageKnown = typeof selectedPage === 'number' && selectedPage >= 1 && (sourceDocument.pageCount === null || selectedPage <= sourceDocument.pageCount);
  const sourceUrl = sourceDocument.url ? `${sourceDocument.url.split('#')[0]}${pageKnown ? `#page=${selectedPage}` : ''}` : null;
  const gateMessage = unknownNote.trim() ? 'Apply or clear your missing-information note before saving or confirming.' : operationBusy ? 'Resolve the current operation before saving or confirming again.'
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
    if (!fieldInputs.current[fieldId]) setAllFields(true);
    if (groupDetails.current[field.group]) groupDetails.current[field.group]!.open = true;
    let ancestor = fieldInputs.current[fieldId]?.parentElement;
    while (ancestor) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement; }
    requestAnimationFrame(() => fieldInputs.current[fieldId]?.focus());
  }

  function returnToField(fieldId: string) {
    if (guided && citedCards.current[fieldId]) {
      setSelectedId(fieldId); setMobilePane('fields');
      let ancestor = citedCards.current[fieldId]?.parentElement;
      while (ancestor) { if (ancestor instanceof HTMLDetailsElement) ancestor.open = true; ancestor = ancestor.parentElement; }
      requestAnimationFrame(() => citedCards.current[fieldId]?.focus());
    } else focusField(fieldId);
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

  function advanceReview(groupId: ReviewGroup) {
    const currentIndex = groups.findIndex(group => group.id === groupId);
    const next = groups.slice(currentIndex + 1).find(group => fields.some(field => field.group === group.id && ['cited', 'individual'].includes(presentation.get(field.id) ?? '') && !draft[field.id]?.reviewed));
    if (groupDetails.current[groupId]) groupDetails.current[groupId]!.open = false;
    setMobilePane('fields');
    if (next && groupDetails.current[next.id]) {
      groupDetails.current[next.id]!.open = true;
      requestAnimationFrame(() => groupDetails.current[next.id]?.querySelector('summary')?.focus());
    } else requestAnimationFrame(() => {
      if (pendingUnknowns.length) window.document.getElementById(instanceId + '-unknown-title')?.focus();
      else actionsRef.current?.focus();
    });
  }

  function reviewTogether(kind: 'cited' | 'unknown', candidates: ReviewField[]) {
    if (!onReviewBatch || operationBusy || !documentReady) return;
    const pending = candidates.filter(field => !draft[field.id]?.reviewed);
    if (!pending.length || kind === 'unknown' && (!unknownNote.trim() || unknownNote.trim().length > 500)) return;
    const applied = onReviewBatch({ kind, fields: pending.map(field => ({ id: field.id, expected: { ...draft[field.id] } })), ...(kind === 'unknown' ? { note: unknownNote } : {}) });
    if (applied && kind === 'unknown') setUnknownNote('');
    if (applied && kind === 'cited') {
      const groupId = candidates[0].group;
      const nextDecision = fields.find(field => field.group === groupId && presentation.get(field.id) === 'individual' && !draft[field.id]?.reviewed);
      if (nextDecision) requestAnimationFrame(() => focusField(nextDecision.id));
      else advanceReview(groupId);
    }
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

  function renderGuidedGroup(group: typeof groups[number]) {
    const cited = fields.filter(field => field.group === group.id && presentation.get(field.id) === 'cited');
    const individual = fields.filter(field => field.group === group.id && presentation.get(field.id) === 'individual');
    if (!cited.length && !individual.length) return null;
    const pendingCited = cited.filter(field => !draft[field.id]?.reviewed);
    return <details className="qr-field-group" key={group.id} open={group.id === groups.find(item => fields.some(field => field.group === item.id && ['cited', 'individual'].includes(presentation.get(field.id) ?? '')))?.id} ref={element => { groupDetails.current[group.id] = element; }}>
      <summary>{group.title}<span>{[...cited, ...individual].filter(field => draft[field.id]?.reviewed).length} / {cited.length + individual.length} reviewed</span></summary>
      <p className="qr-group-help">{group.description}</p>
      {cited.length > 0 && <details className="qr-cited-group" open={pendingCited.length > 0}><summary>{cited.length} cited values{pendingCited.length ? ' to review' : ' reviewed'}</summary>
        <ul className="qr-cited-list">{cited.map(field => <li key={field.id} tabIndex={-1} ref={element => { citedCards.current[field.id] = element; }}>
          <div className="qr-cited-heading"><div className="qr-cited-value"><span>{field.label}{field.unit ? ' · ' + field.unit : ''}</span><strong>{originalLabel(field)}</strong></div>
            <div className="qr-cited-actions"><span className={'qr-cited-state ' + (draft[field.id]?.reviewed ? 'qr-cited-reviewed' : '')}>{draft[field.id]?.reviewed ? 'Reviewed' : 'To review'}</span>
              <button type="button" className="qr-text-action qr-citation-link" onClick={() => showSource(field.id)} aria-label={'Inspect evidence for ' + field.label.toLowerCase()}>Page {field.source?.page} source</button>
              <button type="button" className="qr-text-action qr-edit-cited" onClick={() => focusField(field.id)} aria-label={'Edit ' + field.label.toLowerCase() + ' or review individually'}>Edit</button>
            </div>
          </div>
        </li>)}</ul>
        <div className="qr-batch-action"><p>Check the displayed values against the PDF. This records your review; it does not verify the supplier.</p><button type="button" className="button button-secondary" disabled={operationBusy || !documentReady || !pendingCited.length} onClick={() => reviewTogether('cited', cited)}>{pendingCited.length ? 'I checked these ' + pendingCited.length + ' cited values' : 'Cited values reviewed'}</button>{!documentReady && <p>Load the original PDF before using grouped review.</p>}</div>
      </details>}
      {individual.map(renderField)}
      {individual.length > 0 && [...cited, ...individual].every(field => draft[field.id]?.reviewed) && <div className="qr-next-section"><button type="button" className="button button-secondary" disabled={operationBusy} onClick={() => advanceReview(group.id)}>Continue review<Icon name="arrow" size={16} /></button></div>}
    </details>;
  }

  return <section className="quotation-review" aria-label="Quotation review">
    <button type="button" className="button qr-back" disabled={operationBusy} onClick={onBack}><Icon name="arrow" /> Back to quotations</button>
    <div className="qr-heading"><div><p className="eyebrow">{quote.caseName} · <span className="qr-case-revision">case revision {quote.caseRevision}</span></p>
      <h1 data-page-title tabIndex={-1}>Review quotation</h1><p className="qr-subtitle">{quote.supplierName} · {sourceDocument.fileName}</p></div>
      <span className={`status-badge ${dirty ? 'status-warning' : 'status-neutral'}`}>{dirty ? 'Unsaved changes' : `Saved draft · revision ${quote.savedDraftRevision}`}</span></div>
    <p className="qr-introduction">Check the original PDF, review its cited terms and record what remains unknown. Saving a draft keeps your work separate from confirmation.</p>
    {unknownNote.trim() && <div className="qr-notice qr-notice-info"><div><strong>Missing-information note not applied yet</strong><p>Apply it to the listed fields in guided review, or clear it before saving.</p></div><div className="qr-note-actions">{allFields && <button type="button" className="button button-secondary" disabled={operationBusy} onClick={() => setAllFields(false)}>Return to guided review</button>}<button type="button" className="qr-text-action" disabled={operationBusy} onClick={() => setUnknownNote('')}>Clear unapplied note</button></div></div>}

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
      {receiptCurrent && onNext && <button type="button" className="button button-secondary" onClick={onNext}>Return to quotations</button>}
    </div>}

    <div className="qr-review-overview">{activity}
    <section className="qr-summary" aria-labelledby={`${instanceId}-summary`}>
      <div className="qr-summary-heading"><div><h2 id={`${instanceId}-summary`}>Review checklist</h2><p>{reviewedCount} of {activeFields.length} displayed review fields marked reviewed · {blockingIssues.length} confirmation {blockingIssues.length === 1 ? 'issue' : 'issues'}</p><progress className="qr-review-progress" max={Math.max(activeFields.length, 1)} value={reviewedCount} aria-label={`${reviewedCount} of ${activeFields.length} fields reviewed`} /></div>
        <div className="qr-summary-links"><a className="qr-text-action" href={`#${instanceId}-actions`} onClick={(event) => { event.preventDefault(); actionsRef.current?.focus(); actionsRef.current?.scrollIntoView({ block: 'start' }); }}>Save and confirm review</a>
        {onClarify && issues.some((issue) => issue.kind !== 'hard_failure') && <button type="button" className="button button-secondary" onClick={onClarify}>Draft clarification</button>}</div></div>
      {issues.length > 0 ? <details className="qr-issue-disclosure"><summary>Inspect {issues.length} review {issues.length === 1 ? 'item' : 'items'} and affected checks</summary>
        <ul>{issues.map((issue) => <li key={issue.id} data-issue-kind={issue.kind} data-routine={Boolean(issue.fieldId && issue.id === `${issue.fieldId}-review`)} className={issue.kind === 'hard_failure' ? 'qr-hard-failure' : ''}>
          {issue.fieldId ? <button type="button" className="qr-text-action" onClick={() => focusField(issue.fieldId!)}>{issue.title}</button> : <strong>{issue.title}</strong>}
          <span className="qr-issue-label">{issue.kind === 'hard_failure' ? 'Known requirement failure' : issue.blocksConfirmation ? 'Review before confirmation' : issue.impact.length ? 'Remains unresolved' : 'Information'}</span>
          <p>{issue.message}</p>{issue.impact.length > 0 && <p className="qr-help">Affected checks: {issue.impact.join(', ')}</p>}
        </li>)}</ul></details> : <p className="qr-summary-clear">No unresolved review items. Confirm the saved revision when you are satisfied with the record.</p>}
      {(hardFailures.length > 0 || unresolved.length > 0) && <p className="qr-limit-note">{hardFailures.length > 0 ? 'Known failures remain recorded and cannot be removed by confirmation. ' : ''}{unresolved.length > 0 ? 'Reviewed unknowns still block the affected checks; they are not treated as zero or a pass.' : ''}</p>}
    </section></div>

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
          <button type="button" className="qr-text-action" onClick={() => returnToField(selectedField.id)}>Return to {selectedField.label.toLowerCase()}</button>
        </div>}
        {documentReady && sourceUrl ? <><a className="button button-secondary qr-open-source" href={sourceUrl} target="_blank" rel="noopener noreferrer">Open original PDF in a new tab</a>
          <object className="qr-pdf" data={sourceUrl} type="application/pdf" aria-label={`Original PDF: ${sourceDocument.fileName}`}>
            <p>The browser cannot display this PDF here. Use “Open original PDF in a new tab” to inspect it.</p>
          </object><p className="qr-help">The PDF viewer depends on your browser. Citations show extracted text; no text highlight or verification is implied.</p></>
          : <div className="qr-document-unavailable"><strong>{sourceDocument.availability === 'loading' ? 'Loading the source document' : 'Source PDF unavailable'}</strong><p>{sourceDocument.message ?? 'The original document cannot be opened here. Any available extraction excerpts are shown separately; they do not replace the full source.'}</p></div>}
      </aside>
      <div className="qr-fields-pane" aria-labelledby={`${instanceId}-fields-heading`}>
        <div className="qr-fields-heading"><h2 ref={fieldsHeading} tabIndex={-1} id={`${instanceId}-fields-heading`}>Reviewed fields</h2><p className="qr-help">An edit clears its review check. Original extraction values stay unchanged.</p>
          {onReviewBatch && <div className="qr-view-toggle" role="group" aria-label="Review display"><button type="button" aria-pressed={!allFields} onClick={() => setAllFields(false)}>Guided review</button><button type="button" aria-pressed={allFields} onClick={() => setAllFields(true)}>All fields</button></div>}
        </div>
        {guided ? <>
          <div className="qr-guidance"><strong>Your review, in three steps</strong><ol><li>Check the cited values in each section against the PDF.</li><li>Decide the cost and delivery boundaries below.</li><li>Explain the missing information, then save and confirm.</li></ol>
            <div className="qr-authority-links">{fields.filter(field => field.reviewIndividually).map(field => <button key={field.id} type="button" className="qr-text-action" onClick={() => focusField(field.id)}>{field.label}<Icon name="arrow" size={14} /></button>)}</div>
          </div>
          {groups.map(renderGuidedGroup)}
          {unknownFields.length > 0 && <section className="qr-unknown-group" aria-labelledby={instanceId + '-unknown-title'}>
            <h3 tabIndex={-1} id={instanceId + '-unknown-title'}>Missing information stays unknown</h3>
            <p>No values are filled in by this action. These gaps remain part of the saved record and can block the affected checks.</p>
            {pendingUnknowns.length > 0 && <><ul className="qr-unknown-list">{pendingUnknowns.map(field => <li key={field.id}><strong>{field.label}</strong>{field.requiredFor?.length ? <span>Needed for {field.requiredFor.join(', ')}</span> : <span>Cleared extracted value needs an explanation</span>}</li>)}</ul>
              <label htmlFor={instanceId + '-unknown-note'}>Explain what remains unknown for these {pendingUnknowns.length} fields</label>
              <textarea id={instanceId + '-unknown-note'} value={unknownNote} rows={3} disabled={operationBusy} aria-describedby={instanceId + '-unknown-help'} onChange={event => setUnknownNote(event.target.value)} />
              <p id={instanceId + '-unknown-help'} className="qr-help">Write the source limitation or clarification still needed. Your exact note will be attached to each listed field. Maximum 500 characters.</p>
              <button type="button" className="button button-secondary" disabled={operationBusy || !documentReady || !unknownNote.trim() || unknownNote.trim().length > 500} onClick={() => reviewTogether('unknown', pendingUnknowns)}>Record these {pendingUnknowns.length} fields as unknown</button>
            </>}
            {reviewedUnknowns.length > 0 && <p className="qr-unknown-recorded">{reviewedUnknowns.length} missing fields reviewed with your explanations. Their values remain unknown.</p>}
            {individualUnknowns.length > 0 && <p>{individualUnknowns.length} missing fields have individual notes that still need your review. Open them below; grouped acknowledgement will not replace your notes.</p>}
            <details className="qr-inline-editor"><summary>Inspect or edit each missing field</summary>{unknownFields.map(renderField)}</details>
          </section>}
          {fields.some(field => presentation.get(field.id) === 'optional') && <details className="qr-optional-group"><summary>Other blank fields · {fields.filter(field => presentation.get(field.id) === 'optional').length}</summary><p className="qr-group-help">These optional fields have no extracted values and need no acknowledgement to confirm the current record. They remain unknown.</p><ul className="qr-unknown-list">{fields.filter(field => presentation.get(field.id) === 'optional').map(field => <li key={field.id}><span>{field.label}</span></li>)}</ul><button type="button" className="qr-text-action" onClick={() => focusField(fields.find(field => presentation.get(field.id) === 'optional')!.id)}>Edit optional fields</button></details>}
        </> : groups.filter((group) => fields.some((field) => field.group === group.id)).map((group) => <details className="qr-field-group" key={group.id} open ref={(element) => { groupDetails.current[group.id] = element; }}>
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
