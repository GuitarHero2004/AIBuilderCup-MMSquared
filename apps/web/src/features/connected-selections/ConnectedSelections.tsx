import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { ApiError } from '../../api/client';
import type { ApiClient } from '../../api/client';
import type { CaseComparison, CaseRead, SelectionCreate, SelectionList, SelectionOperation, SelectionRead } from '../../api/types';
import { Icon } from '../../components/Icon';
import type { QuotationNavigationGuard } from '../connected-quotations/ConnectedQuotations';
import { selectionReasonIssue } from './response';
import { readSelectionAttempt, selectionMatchesAttempt, selectionStorageKey } from './recovery';
import type { SelectionAttempt, SelectionSource } from './recovery';
import './connected-selections.css';

interface Props {
  api: ApiClient; ownerId: string; item: CaseRead; source: SelectionSource | null;
  onBack: () => void; onBusy: (busy: boolean) => void; navigationGuardRef: MutableRefObject<QuotationNavigationGuard>;
}
const explain = (error: unknown) => error instanceof ApiError ? error.message + (error.requestId ? ' Reference: ' + error.requestId + '.' : '') : 'The result could not be verified. Check the same saved request before continuing.';
const displayDecimal = (value: string) => { const [whole, fraction] = value.split('.'); const tail = fraction?.replace(/0+$/, ''); return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (tail ? '.' + tail : ''); };
const dateLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value));
const checkLabel = { pass: 'Meets check', fail: 'Does not meet', needs_review: 'Needs review', not_applicable: 'Not checked' };
const checkTone = { pass: 'success', fail: 'error', needs_review: 'warning', not_applicable: 'neutral' };
function SnapshotFacts({ snapshot, quoteId, saved }: { snapshot: CaseComparison; quoteId: string; saved: boolean }) {
  const row = snapshot.rows.find(item => item.quote_id === quoteId);
  if (!row) return null;
  return <section className="panel cs-section" aria-label={saved ? 'Recorded quotation and requirements' : 'Quotation and requirements to record'}>
    <div className="cs-section-heading"><div><h2>{row.supplier_name ?? 'Supplier not identified'}</h2><p className="cs-secondary">{row.source_name}</p></div><span className="status-badge status-success">Meets checked requirements</span></div>
    <dl className="cs-facts">
      <div><dt>Comparable order cost</dt><dd>{row.metrics.comparable_cost_amount !== null ? row.metrics.currency + ' ' + displayDecimal(row.metrics.comparable_cost_amount) : 'Unavailable'}</dd></div>
      <div><dt>Full-order delivery</dt><dd>{row.metrics.end_to_end_lead_time_days === null ? 'Unavailable' : row.metrics.end_to_end_lead_time_days + ' calendar days'}</dd></div>
      <div><dt>Order quantity</dt><dd>{displayDecimal(snapshot.requirement.quantity)} metres</dd></div>
      <div><dt>Budget limit</dt><dd>{snapshot.requirement.currency} {displayDecimal(snapshot.requirement.maximum_budget_amount)}</dd></div>
      <div><dt>Delivery limit</dt><dd>{snapshot.requirement.maximum_lead_time_days} calendar days</dd></div>
      <div><dt>Recorded case revision</dt><dd>{snapshot.case_data_revision}</dd></div>
    </dl>
    <p className="cs-secondary"><strong>Cost scope:</strong> {snapshot.requirement.cost_basis_description}</p>
    <p className="cs-secondary">Checked <time dateTime={snapshot.checked_at}>{dateLabel(snapshot.checked_at)}</time>. {saved ? 'This snapshot is preserved as saved.' : 'The server verifies these exact inputs again before saving.'}</p>
    <details className="cs-details"><summary>Order requirements and fabric specification</summary><dl className="cs-references">
      <div><dt>Reference order date</dt><dd>{snapshot.requirement.order_reference_date}</dd></div><div><dt>Destination</dt><dd>{snapshot.requirement.destination.label}</dd></div>
      <div><dt>Fabric</dt><dd>{snapshot.requirement.textile_specification.construction}; {snapshot.requirement.textile_specification.composition.map(part => displayDecimal(part.percentage) + '% ' + part.fibre.replaceAll('_', ' ')).join(', ')}</dd></div>
      <div><dt>Fabric weight</dt><dd>{displayDecimal(snapshot.requirement.textile_specification.target_gsm)} GSM, {displayDecimal(snapshot.requirement.textile_specification.gsm_tolerance_pct)}% tolerance</dd></div>
      <div><dt>Minimum usable width</dt><dd>{displayDecimal(snapshot.requirement.textile_specification.minimum_usable_width_cm)} cm</dd></div><div><dt>Composition tolerance</dt><dd>{displayDecimal(snapshot.requirement.textile_specification.composition_tolerance_pp)} percentage points</dd></div>
      <div><dt>Required colour</dt><dd>{snapshot.requirement.textile_specification.required_colour ?? 'No requirement set'}</dd></div><div><dt>Required finish</dt><dd>{snapshot.requirement.textile_specification.required_finish ?? 'No requirement set'}</dd></div>
    </dl></details>
    <details className="cs-details"><summary>{saved ? 'Recorded checks for this quotation' : 'Review checks for this quotation'}</summary><ul className="cs-checks">{row.checks.map((check, index) => <li key={check.code + ':' + index}><span className={'status-badge status-' + checkTone[check.status]}>{checkLabel[check.status]}</span><p>{check.message}</p></li>)}</ul></details>
    <details className="cs-details"><summary>All quotation outcomes in this snapshot</summary><ul className="cs-history">{snapshot.rows.map(offer => <li key={offer.quote_id}><div><strong>{offer.supplier_name ?? 'Supplier not identified'}</strong><p className="cs-secondary">{offer.source_name}</p><p>{offer.status === 'meets_checked_requirements' ? 'Meets checked requirements' : offer.status === 'does_not_meet_requirements' ? 'Does not meet requirements' : offer.status === 'unconfirmed' ? 'Not confirmed' : 'Needs information'}</p><p className="cs-secondary">Comparable order cost: {offer.metrics.comparable_cost_amount !== null ? offer.metrics.currency + ' ' + displayDecimal(offer.metrics.comparable_cost_amount) : 'Unavailable'}. Full-order delivery: {offer.metrics.end_to_end_lead_time_days !== null ? offer.metrics.end_to_end_lead_time_days + ' calendar days' : 'Unavailable'}.</p><details className="cs-details"><summary>Inspect recorded quotation checks</summary><ul className="cs-checks">{offer.checks.map((check, index) => <li key={check.code + ':' + index}><span className={'status-badge status-' + checkTone[check.status]}>{checkLabel[check.status]}</span><p>{check.message}</p></li>)}</ul></details></div></li>)}</ul></details>
  </section>;
}
export function ConnectedSelections(props: Props) {
  return <SelectionContent key={props.ownerId + ':' + props.item.id} {...props} />;
}
function SelectionContent({ api, ownerId, item, source, onBack, onBusy, navigationGuardRef }: Props) {
  const [history, setHistory] = useState<SelectionList | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SelectionRead | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState<SelectionAttempt | null>(() => readSelectionAttempt(ownerId, item.id));
  const [busy, setBusy] = useState(false);
  const [checkingContext, setCheckingContext] = useState(Boolean(source));
  const [contextVerified, setContextVerified] = useState(false);
  const [contextMessage, setContextMessage] = useState('');
  const [canCancel, setCanCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [leave, setLeave] = useState<{ proceed: () => void } | null>(null);
  const pendingRef = useRef(pending), lock = useRef(false), mounted = useRef(true);
  const historyGeneration = useRef(0), contextGeneration = useRef(0), readGeneration = useRef(0);
  const discardDialog = useRef<HTMLDialogElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const storageKey = selectionStorageKey(ownerId, item.id);
  const visible = saved?.selection.id === openedId ? saved : null;
  const savedRow = visible?.selection.comparison_snapshot.rows.find(row => row.quote_id === visible.selection.selected_quote_id);
  const reviewing = Boolean(source && !openedId && !pending);
  const dirty = reviewing && Boolean(reason.trim() || acknowledged);
  const unresolved = busy || pending !== null;
  const selectedRow = source?.comparison.rows.find(row => row.quote_id === source.quoteId);
  const sourceValid = Boolean(source && source.comparison.case_id === item.id && selectedRow?.status === 'meets_checked_requirements' && selectedRow.confirmation_revision_id);
  const reasonIssue = selectionReasonIssue(reason);
  const remember = useCallback((attempt: SelectionAttempt | null) => {
    pendingRef.current = attempt; setPending(attempt); setCanCancel(false);
    try {
      if (attempt) sessionStorage.setItem(storageKey, JSON.stringify({ key: attempt.key, selectionId: attempt.selectionId }));
      else sessionStorage.removeItem(storageKey);
    } catch { /* The exact in-memory attempt remains locked if browser storage is unavailable. */ }
  }, [storageKey]);
  const readHistory = useCallback(() => {
    const generation = ++historyGeneration.current;
    return api.listSelections(item.id).then(result => {
      if (!mounted.current || generation !== historyGeneration.current) return;
      if (result.case_id !== item.id) throw new ApiError('The selection history belongs to another case.', 'INVALID_RESPONSE');
      setHistory(result); setHistoryError(null);
    }).catch(failure => { if (mounted.current && generation === historyGeneration.current) setHistoryError(explain(failure)); })
      .finally(() => { if (mounted.current && generation === historyGeneration.current) setHistoryLoading(false); });
  }, [api, item.id]);
  const readContext = useCallback(() => {
    if (!source) return Promise.resolve();
    const generation = ++contextGeneration.current;
    return api.getComparison(item.id).then(result => {
      if (!mounted.current || generation !== contextGeneration.current) return;
      const matches = result.case_id === source.comparison.case_id && result.case_data_revision === source.comparison.case_data_revision && result.input_fingerprint === source.comparison.input_fingerprint;
      setContextVerified(matches);
      setContextMessage(matches ? 'These inputs matched the latest saved comparison when checked. Saving verifies them again.' : 'The case or quotations changed. Return to comparison and review the latest checks before making a selection.');
    }).catch(failure => {
      if (mounted.current && generation === contextGeneration.current) { setContextVerified(false); setContextMessage(explain(failure)); }
    }).finally(() => { if (mounted.current && generation === contextGeneration.current) setCheckingContext(false); });
  }, [api, item.id, source]);
  useEffect(() => {
    mounted.current = true; void readHistory(); void readContext(); heading.current?.focus();
    return () => { mounted.current = false; historyGeneration.current += 1; contextGeneration.current += 1; readGeneration.current += 1; };
  }, [readHistory, readContext]);
  useEffect(() => { onBusy(unresolved); return () => onBusy(false); }, [unresolved, onBusy]);
  useEffect(() => {
    navigationGuardRef.current = proceed => {
      if (lock.current || pendingRef.current) { setNotice('Resolve this selection save before leaving. Read its result or close the unresolved attempt.'); return; }
      if (dirty) setLeave({ proceed }); else proceed();
    };
    return () => { navigationGuardRef.current = null; };
  }, [dirty, navigationGuardRef]);
  useEffect(() => {
    if (!dirty && !unresolved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, unresolved]);
  useEffect(() => { if (leave) { discardDialog.current?.showModal(); discardDialog.current?.querySelector<HTMLButtonElement>('button')?.focus(); } else discardDialog.current?.close(); }, [leave]);
  function requestLeave(proceed: () => void) { navigationGuardRef.current?.(proceed); }
  function refreshHistory() { if (lock.current) return; setHistoryLoading(true); setHistoryError(null); void readHistory(); }
  function refreshContext() { if (lock.current || pendingRef.current) return; setContextVerified(false); setCheckingContext(true); void readContext(); }
  function assertRead(result: SelectionRead, attempt?: SelectionAttempt) {
    if (result.selection.case_id !== item.id || result.selection.selected_by_uid !== ownerId || attempt && !selectionMatchesAttempt(result.selection, attempt)) throw new ApiError('The saved selection did not match this case and submitted choice. Its details are withheld. Check the same request again.', 'INVALID_RESPONSE', undefined, true);
  }
  async function readKnown(attempt: SelectionAttempt) {
    if (!attempt.selectionId) throw new ApiError('The saved selection reference is unavailable.', 'INVALID_RESPONSE', undefined, true);
    const result = await api.getSelection(item.id, attempt.selectionId);
    if (!mounted.current) return;
    assertRead(result, attempt); setSaved(result); setOpenedId(result.selection.id);
    remember(null); setNotice('Your buyer selection and the checked snapshot are saved. No purchase or supplier approval was sent.');
    setError(null); setReason(''); setAcknowledged(false); await readHistory();
    if (mounted.current) requestAnimationFrame(() => heading.current?.focus());
  }
  async function acceptOperation(operation: SelectionOperation, attempt: SelectionAttempt) {
    if (operation.request_key !== attempt.key || operation.case_id !== item.id || attempt.selectionId && operation.selection_id !== attempt.selectionId) throw new ApiError('The receipt did not match this selection request. Check the same request again.', 'INVALID_RESPONSE', undefined, true);
    if (operation.state === 'cancelled') { remember(null); setError(null); setContextVerified(false); setContextMessage('Check the latest inputs before another save.'); setNotice('This save attempt is closed and cannot create a selection later. Your reason remains available.'); return; }
    const known = { ...attempt, selectionId: operation.selection_id! };
    remember(known); setOpenedId(known.selectionId); await readKnown(known);
  }
  async function saveSelection() {
    setTouched(true);
    if (lock.current || pendingRef.current || !source || !sourceValid || reasonIssue || !acknowledged || !contextVerified || checkingContext || historyLoading || historyError || !history?.remaining_selection_slots) return;
    const body: SelectionCreate = { expected_case_revision: source.comparison.case_data_revision, expected_input_fingerprint: source.comparison.input_fingerprint, selected_quote_id: source.quoteId, expected_confirmed_revision_id: selectedRow!.confirmation_revision_id!, selection_reason: reason.trim(), acknowledge_limitations: true };
    const attempt = { key: crypto.randomUUID(), body };
    lock.current = true; setBusy(true); setError(null); setNotice(''); remember(attempt);
    try { const result = await api.saveSelection(item.id, body, attempt.key); if (mounted.current) await acceptOperation(result, attempt); }
    catch (failure) {
      if (!mounted.current) return;
      setError(explain(failure));
      if (failure instanceof ApiError && !failure.outcomeUnknown && !(pendingRef.current as SelectionAttempt | null)?.selectionId) { remember(null); setContextVerified(false); setContextMessage('Check the latest inputs before another save.'); }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function checkSave(close = false) {
    const attempt = pendingRef.current;
    if (!attempt || lock.current) return;
    lock.current = true; setBusy(true); setError(null); setNotice('');
    try {
      if (attempt.selectionId) await readKnown(attempt);
      else {
        const result = close ? await api.cancelSelectionOperation(item.id, attempt.key) : await api.getSelectionOperation(item.id, attempt.key);
        if (mounted.current) await acceptOperation(result, attempt);
      }
    } catch (failure) {
      if (!mounted.current) return;
      setError(explain(failure));
      if (failure instanceof ApiError && failure.code === 'OPERATION_NOT_FOUND') setCanCancel(true);
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function openSaved(selectionId: string) {
    if (lock.current || pendingRef.current) return;
    lock.current = true; setBusy(true); setOpenedId(selectionId); setSaved(null); setError(null); setNotice('');
    const generation = ++readGeneration.current;
    try {
      const result = await api.getSelection(item.id, selectionId);
      if (!mounted.current || generation !== readGeneration.current) return;
      assertRead(result, { key: 'read-only', selectionId }); setSaved(result); setReason(''); setAcknowledged(false);
      heading.current?.focus();
    } catch (failure) { if (mounted.current && generation === readGeneration.current) setError(explain(failure)); }
    finally { lock.current = false; if (mounted.current && generation === readGeneration.current) setBusy(false); }
  }
  const saveBlocked = unresolved || !sourceValid || !contextVerified || checkingContext || historyLoading || !!historyError || !history?.remaining_selection_slots || !!reasonIssue || !acknowledged;
  return <section className="connected-selections" aria-labelledby={id + '-title'}>
    <button className="button button-secondary cs-back" type="button" disabled={busy} onClick={() => requestLeave(onBack)}>{source ? 'Back to comparison' : 'Back to quotations'}</button>
    <header className="page-heading"><div><p className="eyebrow">BUYER SELECTION NOTE</p><h1 id={id + '-title'} ref={heading} tabIndex={-1} data-page-title>{pending?.selectionId ? 'Selection saved; read its summary' : pending ? 'Resolve this selection save' : openedId ? 'Saved buyer selection' : source ? 'Review your buyer selection' : 'Saved buyer selections'}</h1><p className="page-intro">{item.name}. This records your choice and reason within the available requirement checks.</p></div></header>
    {notice && <div className="alert info-alert" role="status"><p>{notice}</p></div>}
    {error && <div className="alert error-alert" role="alert"><div><strong>{pending?.selectionId ? 'The saved summary could not be verified' : pending ? 'The save outcome needs checking' : 'The request could not be completed'}</strong><p>{error}</p></div></div>}
    {pending && <section className="panel cs-section" aria-label="Selection save recovery"><h2>{pending.selectionId ? 'A saved selection reference was received' : 'Keep this request until its outcome is known'}</h2><p className="cs-secondary">{pending.selectionId ? 'Read the existing saved record. Saving again is unavailable.' : 'A missing response does not mean the selection was not saved. Check this same request before continuing.'}</p><p className="cs-secondary">Request: {pending.key}{pending.selectionId ? ' / Selection: ' + pending.selectionId : ''}</p><div className="cs-actions"><button className="button button-primary" disabled={busy} type="button" onClick={() => { void checkSave(); }}>{busy ? 'Checking...' : pending.selectionId ? 'Read saved selection' : 'Check save result'}</button>{canCancel && !pending.selectionId && <button type="button" className="button button-secondary" disabled={busy} onClick={() => { void checkSave(true); }}>Close unresolved attempt</button>}</div>{canCancel && <p className="cs-secondary">No receipt was found. Closing this attempt prevents a late save; if it already committed, its saved selection will be read.</p>}</section>}
    {openedId && !visible && !pending && <section className="panel cs-section" role="status"><h2>{busy ? 'Reading saved selection...' : 'Saved summary unavailable'}</h2><p className="cs-secondary">Only a verified server record is shown here.</p>{!busy && <button type="button" className="button button-secondary" onClick={() => { void openSaved(openedId); }}>Read saved selection</button>}</section>}
    {visible && <>
      <section className="panel cs-section"><div className="cs-section-heading"><div><h2>Buyer selection saved</h2><p className="cs-secondary">Saved <time dateTime={visible.selection.created_at}>{dateLabel(visible.selection.created_at)}</time> by you in this private session.</p></div><button type="button" className="button button-secondary" disabled={busy} onClick={() => { void openSaved(visible.selection.id); }}><Icon name="refresh" size={17} />Refresh saved summary</button></div>{savedRow && <div className="cs-outcome"><h3>{savedRow.supplier_name ?? savedRow.source_name}</h3><dl>
        <div><dt>Order cost</dt><dd>{savedRow.metrics.comparable_cost_amount !== null ? savedRow.metrics.currency + ' ' + displayDecimal(savedRow.metrics.comparable_cost_amount) : 'Unavailable'}</dd></div>
        <div><dt>Full-order delivery</dt><dd>{savedRow.metrics.end_to_end_lead_time_days === null ? 'Unavailable' : savedRow.metrics.end_to_end_lead_time_days + ' calendar days'}</dd></div>
      </dl></div>}<h3>Your recorded reason</h3><p className="cs-saved-reason">{visible.selection.selection_reason}</p>
      <details className="cs-details"><summary>Saved record details</summary><p className="cs-secondary">Selection reference: {visible.selection.id}</p><p className="cs-secondary">Your choice, reason and checked quotation snapshot are preserved together. Reload this session and open Saved selections to return to it.</p></details></section>
      <div className={'alert ' + (visible.current_context.is_current === false ? 'warning-alert' : 'info-alert')} role="status"><div><strong>{visible.current_context.is_current === false ? 'The case changed after this selection' : visible.current_context.is_current === null ? 'Current inputs could not be checked' : 'Matched the saved inputs when read'}</strong><p>{visible.current_context.message}</p><p>The recorded selection stays unchanged. Refresh the summary to check it against later inputs.</p></div></div>
      <SnapshotFacts snapshot={visible.selection.comparison_snapshot} quoteId={visible.selection.selected_quote_id} saved />
      <section className="panel cs-section"><h2>Scope and source evidence</h2><div className="cs-scope"><strong>Scope of this note</strong><p>This is a buyer selection note, not supplier approval or a purchase order. Carbon estimates and supplier ranking are unavailable.</p><details className="cs-details"><summary>Recorded scope notes</summary><ul>{visible.selection.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></details></div><details className="cs-details"><summary>Saved source references</summary><dl className="cs-references"><div><dt>Quotation</dt><dd>{visible.selection.selected_quote_id}</dd></div><div><dt>Confirmed revision</dt><dd>{visible.selection.selected_confirmed_revision_id}</dd></div><div><dt>Input fingerprint</dt><dd>{visible.selection.input_fingerprint}</dd></div><div><dt>Recorded case revision</dt><dd>{visible.selection.case_data_revision}</dd></div></dl></details></section>
    </>}
    {reviewing && source && <>
      {!sourceValid ? <div className="alert warning-alert"><p>This quotation is not available for a selection note. Return to comparison and resolve its requirement checks.</p></div> : <SnapshotFacts snapshot={source.comparison} quoteId={source.quoteId} saved={false} />}
      <section className="panel cs-section"><div className="cs-section-heading"><div><h2>Check before saving</h2><p className="cs-secondary">{checkingContext ? 'Checking the latest saved inputs...' : contextMessage}</p></div><button type="button" className="button button-secondary" disabled={checkingContext || busy} onClick={refreshContext}><Icon name="refresh" size={17} />Check latest inputs</button></div><div className="cs-scope"><strong>A limited buyer selection note</strong><p>This is your choice based on the checked quotation terms. Carbon estimates, supplier ranking and a full sourcing recommendation are unavailable. It is not a supplier approval or purchase order.</p></div></section>
      <form className="panel cs-section cs-form" noValidate onSubmit={event => { event.preventDefault(); void saveSelection(); }}>
        <label htmlFor={id + '-reason'}>Why did you select this quotation?</label><textarea id={id + '-reason'} value={reason} required aria-invalid={touched && !!reasonIssue} aria-describedby={id + '-reason-help' + (touched && reasonIssue ? ' ' + id + '-reason-error' : '')} onChange={event => setReason(event.target.value)} onBlur={() => setTouched(true)} />
        <div className="cs-form-meta"><p id={id + '-reason-help'} className="cs-secondary">Record the evidence or trade-off behind your choice. A reason is required.</p><p className="cs-secondary">{Array.from(reason.trim()).length.toLocaleString('en-GB')} / 2,000 characters</p></div>{touched && reasonIssue && <p id={id + '-reason-error'} className="field-error" role="alert">{reasonIssue}</p>}
        <label className="cs-acknowledge"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /><span>I understand this records a buyer selection within the available checks. Carbon ranking, supplier approval and purchasing remain outside this note.</span></label>
        <div className="cs-actions"><p className="cs-secondary">{history?.remaining_selection_slots === 0 ? 'This case has reached its limit of 10 saved selection notes.' : 'Saving preserves the checked snapshot and your reason. Later edits do not rewrite it.'}</p><button className="button button-primary" type="submit" disabled={saveBlocked}><Icon name="check" size={17} />Save buyer selection</button></div>
      </form>
    </>}
    <section className="panel cs-section" aria-label="Saved selection history"><div className="cs-section-heading"><div><h2>Saved selection history</h2><p className="cs-secondary">{history ? history.items.length + ' of 10 notes saved in this case.' : 'Up to 10 selection notes can be saved in this case.'}</p></div><button type="button" className="button button-secondary" disabled={busy || historyLoading} onClick={refreshHistory}><Icon name="refresh" size={17} />Refresh history</button></div>
      {historyError && <div className="alert error-alert" role="alert"><p>{historyError}{history ? ' The previously read history remains below.' : ''}</p></div>}
      {historyLoading && <p className="loading-line" role="status"><span className="spinner" />Reading saved selections...</p>}
      {history && history.items.length === 0 && <p className="cs-secondary">No buyer selection has been saved. Return to comparison, review a quotation that meets the checked requirements and record your reason.</p>}
      {history && history.items.length > 0 && <ul className="cs-history">{history.items.map(selection => <li key={selection.id}><div><strong>{selection.supplier_name ?? 'Supplier not identified'}</strong><p className="cs-secondary">{selection.source_name}</p><p className="cs-secondary"><time dateTime={selection.created_at}>{dateLabel(selection.created_at)}</time> / Case revision {selection.case_data_revision}</p></div><button type="button" className="button button-secondary" disabled={unresolved} onClick={() => requestLeave(() => { void openSaved(selection.id); })}>Open selection<Icon name="arrow" size={17} /></button></li>)}</ul>}
    </section>
    <dialog ref={discardDialog} className="discard-dialog" aria-labelledby={id + '-discard'} onCancel={event => { event.preventDefault(); setLeave(null); }}><h2 id={id + '-discard'}>Discard this unsaved selection reason?</h2><p>The reason and acknowledgement in this browser have not been saved.</p><div className="dialog-actions"><button type="button" className="button button-secondary" onClick={() => setLeave(null)}>Keep reviewing</button><button type="button" className="button button-danger" onClick={() => { const proceed = leave?.proceed; setLeave(null); setReason(''); setAcknowledged(false); proceed?.(); }}>Discard changes</button></div></dialog>
  </section>;
}
