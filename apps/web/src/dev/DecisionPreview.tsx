import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { DecisionView } from '../features/decisions/DecisionView';
import { decisionLocked, decisionProposalKey, decisionRecordIssue, decisionSaveIssue, makeDecisionProposal, sourceKey } from '../features/decisions/model';
import type { DecisionOperation, DecisionProposal, DecisionRecord, DecisionSource } from '../features/decisions/types';
import { decisionExamples, decisionExampleSource, suppliedDecisionRecord } from './decisionFixtures';
import type { DecisionExample } from './decisionFixtures';
import './decision-preview.css';

interface WalkthroughState {
  source: DecisionSource; reason: string; operation: DecisionOperation; record: DecisionRecord | null;
  stored: DecisionRecord | null; currentRevision: number; summaryOpen: boolean; notice: string;
}
interface WalkthroughProps {
  source: DecisionSource; active?: boolean; currentCaseRevision?: number; onBack: () => void;
  example?: DecisionExample; onExampleChange?: (example: DecisionExample) => void; onPendingChange?: (pending: boolean) => void;
}
type LeaveIntent = { kind: 'back' } | { kind: 'example'; example: DecisionExample };
const exampleReason = 'Synthetic example reason: this offer meets the recorded requirements and the buyer accepts its displayed trade-offs.';

function initialState(source: DecisionSource, example: DecisionExample): WalkthroughState {
  const seeded = !['preferred', 'alternative', 'scenario'].includes(example);
  const reason = seeded ? exampleReason : '';
  const proposal = seeded ? makeDecisionProposal(source, reason) : null;
  const id = `seed-${source.evaluation.id}-${source.selectedQuoteId}`;
  const saved = proposal && ['saved', 'saved-summary-unavailable', 'stale-after-save', 'mismatched-receipt'].includes(example) ? suppliedDecisionRecord(proposal, id) : null;
  const record = ['saved', 'stale-after-save'].includes(example) ? saved : null;
  const operation: DecisionOperation = example === 'unknown-save' || example === 'mismatched-receipt' ? { id, status: 'uncertain', proposal, message: example === 'mismatched-receipt' ? 'The simulated save returned a receipt that does not match the reviewed choice. Its outcome remains unknown; check the same request.' : 'The simulated save response was lost. Check this same request before submitting anything else.' }
    : example === 'saved-summary-unavailable' ? { id, status: 'error', proposal, confirmedDecisionId: saved?.id, message: 'Decision saved in this simulation; its summary could not be read. Read the existing decision instead of saving again.' }
    : example === 'known-rejection' ? { id, status: 'error', proposal, message: 'The simulated save was conclusively rejected. No decision was created; the reason remains available for deliberate correction or retry.' }
    : { id: saved ? id : null, status: 'idle', proposal, confirmedDecisionId: saved?.id, message: '' };
  return { source: structuredClone(source), reason, operation, record, stored: saved,
    currentRevision: source.context.currentRevision + (['stale-before-save', 'stale-after-save'].includes(example) ? 1 : 0), summaryOpen: true,
    notice: seeded ? 'This state includes an explicitly synthetic example reason and operation. It is not a decision previously saved by you.' : 'The exact selected evaluation is retained. A simulated save creates an immutable receipt in this page’s memory only.' };
}

/** Shared in-page controller. Parent workspaces keep this mounted to preserve exact receipts on Back/reopen. */
export function DecisionWalkthrough({ source, active = true, currentCaseRevision, onBack, example = 'preferred', onExampleChange, onPendingChange }: WalkthroughProps) {
  const [state, setState] = useState(() => initialState(source, example));
  const viewId = useId();
  const [leaveIntent, setLeaveIntent] = useState<LeaveIntent | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const outcomes = useRef<HTMLDivElement>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const mutationLock = useRef(false);
  const currentRevision = Math.max(state.currentRevision, currentCaseRevision ?? source.context.currentRevision);
  const unresolved = ['saving', 'checking', 'uncertain', 'reading'].includes(state.operation.status) || Boolean(state.operation.confirmedDecisionId && !state.record);
  const dirty = Boolean(state.reason.trim() && !state.record && !state.operation.confirmedDecisionId);
  const busy = ['saving', 'checking', 'reading'].includes(state.operation.status);
  const foreignSource = source.context.id !== state.source.context.id;
  const sourceChanged = sourceKey(source) !== sourceKey(state.source);
  const reviewSource = sourceChanged ? { ...state.source, canSave: false, blockedReason: 'The source context or its save permission changed. Return to the current evaluation before starting a new save.' } : state.source;

  useEffect(() => { onPendingChange?.(unresolved); }, [unresolved, onPendingChange]);

  useEffect(() => {
    if (active) container.current?.querySelector<HTMLElement>('[data-page-title]')?.focus();
  }, [active]);
  useEffect(() => {
    if (!dirty && !unresolved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, unresolved]);
  useEffect(() => {
    if (!active || !busy) return;
    if (details.current) details.current.open = true;
    if (!leaveDialog.current?.open) { outcomes.current?.focus(); outcomes.current?.scrollIntoView({ block: 'nearest' }); }
  }, [active, busy, state.operation.status, state.operation.id]);

  function changeReason(reason: string) {
    if (state.record || decisionLocked(state.operation) || mutationLock.current) return;
    setState({ ...state, reason, operation: state.operation.status === 'error' ? { id: null, status: 'idle', message: '' } : state.operation });
  }
  function save(proposal: DecisionProposal) {
    if (sourceChanged || state.record || mutationLock.current || decisionSaveIssue(state.source, state.reason, state.operation, currentRevision)) return;
    const expected = makeDecisionProposal(state.source, state.reason);
    if (!expected || decisionProposalKey(expected) !== decisionProposalKey(proposal)) return;
    mutationLock.current = true;
    const id = `request-${state.source.evaluation.id}-${state.source.selectedQuoteId}-${++sequence.current}`;
    setState({ ...state, operation: { id, status: 'saving', proposal: structuredClone(proposal), message: 'The exact reviewed choice and reason are captured. Choose a simulated save outcome above; no service request was sent.' },
      notice: `${id} identifies this one captured save. Duplicate submissions remain blocked until its outcome is known.` });
  }
  function capturedRecord(): DecisionRecord | null {
    const { operation } = state;
    if (!operation.id || !operation.proposal) return null;
    return state.stored ?? suppliedDecisionRecord(operation.proposal, operation.id);
  }
  function acceptRecord(candidate: DecisionRecord, laterRevision = currentRevision) {
    const issue = decisionRecordIssue(candidate, { proposal: state.operation.proposal, requestId: state.operation.id, decisionId: state.operation.confirmedDecisionId, caseId: state.source.context.id });
    if (issue) {
      setState({ ...state, operation: { ...state.operation, status: state.operation.confirmedDecisionId ? 'error' : 'uncertain', message: `${issue} The existing save identity is retained; reconcile its exact receipt.` }, notice: 'The mismatched response was withheld. It did not authorize a second save.' });
      return;
    }
    mutationLock.current = false;
    setState({ ...state, record: structuredClone(candidate), stored: structuredClone(candidate), currentRevision: laterRevision, summaryOpen: true,
      operation: { ...state.operation, id: candidate.requestId, status: 'idle', confirmedDecisionId: candidate.id, message: '' },
      notice: `Synthetic receipt ${candidate.id} is retained unchanged in this page’s memory. Reloading clears it; no backend or browser storage was written.` });
  }
  function resolveSuccess() {
    if (foreignSource || !busy) return;
    const record = capturedRecord();
    if (!record) return;
    if (!state.stored && !state.operation.confirmedDecisionId && currentRevision !== state.operation.proposal?.source.context.currentRevision) { rejectStale(); return; }
    acceptRecord(record);
  }
  function rejectSave() {
    if (!['saving', 'checking'].includes(state.operation.status) || state.stored || state.operation.confirmedDecisionId) return;
    mutationLock.current = false;
    setState({ ...state, operation: { ...state.operation, status: 'error', message: 'The simulated service confirmed that no decision was saved. Your reviewed choice and reason are retained; deliberately correct or retry if appropriate.' }, notice: 'This is a known rejection, not an unknown save. No receipt exists.' });
  }
  function rejectStale() {
    if (state.stored || state.operation.confirmedDecisionId) return;
    mutationLock.current = false;
    setState({ ...state, currentRevision: Math.max(currentRevision, state.source.context.currentRevision + 1), operation: { ...state.operation, status: 'error', message: 'The case changed before the simulated save committed. No decision was created. Return to a current evaluation; your reason is retained separately.' }, notice: 'The earlier evaluation was not rewritten or silently replaced.' });
  }
  function loseResponse() {
    if (!['saving', 'checking'].includes(state.operation.status)) return;
    setState({ ...state, operation: { ...state.operation, status: 'uncertain', message: 'The save outcome is unknown. Check this same captured request before trying again; missing readback is not proof that nothing was saved.' }, notice: 'The submitted choice, reason and request identity remain locked and unchanged.' });
  }
  function confirmWithoutSummary() {
    if (!['saving', 'checking'].includes(state.operation.status)) return;
    const record = capturedRecord();
    if (!record) return;
    if (!state.stored && currentRevision !== record.summary.context.currentRevision) { rejectStale(); return; }
    mutationLock.current = false;
    setState({ ...state, stored: structuredClone(record), record: null, operation: { ...state.operation, status: 'error', confirmedDecisionId: record.id, message: 'Decision saved in this simulation; summary unavailable. Its confirmed ID is retained. Read that existing summary instead of saving again.' }, notice: `Known receipt: ${record.id}. A failed read does not undo the save.` });
  }
  function mismatchReceipt() {
    if (!busy) return;
    const record = capturedRecord();
    if (!record) return;
    const wrong = { ...structuredClone(record), selectedQuoteId: 'different-quotation' };
    const issue = decisionRecordIssue(wrong, { proposal: state.operation.proposal, requestId: state.operation.id, decisionId: state.operation.confirmedDecisionId, caseId: state.source.context.id });
    setState({ ...state, stored: structuredClone(record), operation: { ...state.operation, status: state.operation.confirmedDecisionId ? 'error' : 'uncertain', message: `${issue ?? 'The receipt did not match.'} Read the same saved operation; no replacement decision is submitted.` }, notice: 'A deliberately mismatched synthetic response was withheld. The captured proposal and any known decision ID remain unchanged.' });
  }
  function checkSave() {
    if (foreignSource || state.operation.status !== 'uncertain' || !state.operation.id || !state.operation.proposal) return;
    setState({ ...state, operation: { ...state.operation, status: 'checking', message: 'Checking this exact captured save. Choose its recorded outcome above; the read does not submit another decision.' }, notice: 'Readback uses the original request and reviewed reason.' });
  }
  function readSaved() {
    if (foreignSource || !state.operation.confirmedDecisionId || !state.stored || busy) return;
    setState({ ...state, summaryOpen: true, operation: { ...state.operation, status: 'reading', message: 'Read this exact saved decision summary. Choose a simulated read outcome above; no new save occurs.' }, notice: `Reading known decision ${state.operation.confirmedDecisionId}. The original save request is unchanged.` });
  }
  function failRead() {
    if (state.operation.status !== 'reading' || !state.operation.confirmedDecisionId) return;
    setState({ ...state, operation: { ...state.operation, status: 'error', message: state.record ? 'The saved summary could not be refreshed. Its last verified immutable contents remain visible; retry reading the same decision.' : 'Decision saved; summary still unavailable. Keep its confirmed ID and retry reading. Do not submit another save.' }, notice: 'Read failure does not erase or change the existing saved receipt.' });
  }
  function simulateLaterEdit() {
    if (busy) return;
    setState({ ...state, currentRevision: Math.max(currentRevision, state.source.context.currentRevision + 1), notice: 'A later input revision is simulated separately. The saved record and its original summary remain unchanged.' });
  }
  function resolveSavedThenChanged() {
    if (!['saving', 'checking'].includes(state.operation.status)) return;
    const record = capturedRecord();
    if (record) acceptRecord(record, Math.max(currentRevision, state.source.context.currentRevision + 1));
  }
  function requestLeave(intent: LeaveIntent) {
    if (intent.kind === 'example' && unresolved) return;
    if (dirty || unresolved) { setLeaveIntent(intent); leaveDialog.current?.showModal(); }
    else if (intent.kind === 'back') onBack();
    else onExampleChange?.(intent.example);
  }
  function confirmLeave() {
    if (!leaveIntent) return;
    leaveDialog.current?.close();
    if (leaveIntent.kind === 'example') { if (!unresolved) onExampleChange?.(leaveIntent.example); }
    else onBack();
  }

  if (foreignSource) return <section className="panel decision-context-changed"><h1 data-page-title tabIndex={-1}>Decision context changed</h1><p>This workspace now refers to another case. The earlier choice and receipt are withheld. Return to the current case; the captured operation has not been cancelled or resubmitted.</p><button className="button button-secondary" onClick={onBack}>Return to previous view</button></section>;

  return <div ref={container} className="decision-walkthrough">
    <section className="preview-controls decision-preview-controls" aria-labelledby={viewId + '-preview-title'}>
      <div className="decision-preview-summary"><h2 id={viewId + '-preview-title'}>Synthetic decision preview</h2><p>Exact selected example; test-only carbon. Saves stay in this page’s memory. No API, AI or storage writes.</p></div>
      <details ref={details}><summary>Preview controls</summary><div className="preview-control-body">
        {onExampleChange && <div className="preview-scenario"><label htmlFor={viewId + '-example'}>Decision example state</label><select id={viewId + '-example'} value={example} disabled={unresolved} onChange={(event) => requestLeave({ kind: 'example', example: event.target.value as DecisionExample })}>{decisionExamples.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="button button-secondary" disabled={unresolved} onClick={() => requestLeave({ kind: 'example', example })}>Reset decision example</button></div>}
        {busy && <div ref={outcomes} tabIndex={-1} className="preview-outcomes" role="group" aria-label="Simulated decision outcomes"><strong>{state.operation.status === 'reading' ? 'Read the existing saved summary:' : state.operation.status === 'checking' ? 'Resolve this same save:' : 'Choose the simulated save outcome:'}</strong>
          <button className="button button-secondary" onClick={resolveSuccess}>{state.operation.status === 'reading' ? 'Simulate matching summary' : 'Simulate matching saved decision'}</button>
          {state.operation.status === 'reading' ? <button className="button button-secondary" onClick={failRead}>Simulate summary unavailable</button> : <>
            {!state.stored && !state.operation.confirmedDecisionId && <button className="button button-secondary" onClick={rejectSave}>Simulate confirmed rejection</button>}
            <button className="button button-secondary" onClick={loseResponse}>{state.operation.status === 'checking' ? 'Simulate readback unavailable' : 'Simulate lost save response'}</button>
            <button className="button button-secondary" onClick={confirmWithoutSummary}>Simulate saved ID, summary unavailable</button>
            {!state.stored && !state.operation.confirmedDecisionId && <button className="button button-secondary" onClick={rejectStale}>Simulate stale before save</button>}
            <button className="button button-secondary" onClick={resolveSavedThenChanged}>Simulate saved, then inputs changed</button>
          </>}
          <button className="button button-secondary" onClick={mismatchReceipt}>Simulate mismatched receipt</button>
        </div>}
        {state.record && !busy && <div className="preview-scenario"><button className="button button-secondary" onClick={simulateLaterEdit}>Simulate later source edit</button><button className="button button-secondary" onClick={() => setState({ ...state, summaryOpen: false })}>Close summary in this walkthrough</button></div>}
        <p className="preview-notice" role="status">{state.notice}</p>
        <details className="decision-fixture-details"><summary>Fixture details and limitations</summary><p>The embedded handoff retains the exact selected quotation, evaluation, policy and scenario from the previous screen. Standalone examples use their own synthetic source. Fingerprints, reviewer identity and timestamps here are labelled fixture metadata, not verified backend records.</p><p>The canonical example uses 150 cm total/usable width, separate from the review PDF’s 152 cm. No purchase order, email or real approval is produced. Reloading or leaving this page clears these in-memory records; production retrieval needs the future decision API.</p></details>
      </div></details>
    </section>
    {sourceChanged && <div className="alert warning-alert" role="alert"><div><strong>The source context changed</strong><p>A new save is blocked. Any pending request and saved summary still refer to the original captured choice; resolve them without substituting the new context.</p></div></div>}
    {!state.summaryOpen && state.record ? <section className="panel decision-reopen-note"><div><h1 data-page-title tabIndex={-1}>Saved example summary</h1><p>{state.record.id} is retained in this page’s memory with its original reason and references.</p></div><div className="section-actions"><button className="button button-primary" onClick={readSaved}>Reopen saved summary</button><button className="button button-secondary" onClick={() => requestLeave({ kind: 'back' })}>Return to previous view</button></div></section>
      : <DecisionView source={reviewSource} reason={state.reason} operation={state.operation} record={state.record} currentCaseRevision={currentRevision} onReasonChange={changeReason} onSave={save} onCheckSave={checkSave} onReadSaved={readSaved} onBack={() => requestLeave({ kind: 'back' })} />}
    <dialog ref={leaveDialog} className="preview-dialog decision-preview-dialog" aria-labelledby={viewId + '-leave-title'}><h2 id={viewId + '-leave-title'}>{unresolved ? 'Return with this decision unresolved?' : 'Leave this unsaved decision?'}</h2><p className="preview-dialog-note">{unresolved ? 'Returning does not resolve, cancel or retry the captured save. This page retains its exact request and any confirmed decision ID for readback.' : 'The reason has not been saved. Returning to the previous view keeps this in-memory draft; resetting a standalone example replaces it.'}</p><p className="preview-dialog-note">Reloading or navigating to another page clears the demonstration. No real service operation is cancelled or completed.</p><div className="dialog-actions"><button className="button button-primary" autoFocus onClick={() => leaveDialog.current?.close()}>Keep reviewing</button><button className="button button-secondary" onClick={confirmLeave}>{leaveIntent?.kind === 'example' ? 'Replace this example' : 'Return to previous view'}</button></div></dialog>
  </div>;
}

export function DecisionPreview() {
  const [example, setExample] = useState<DecisionExample>('preferred');
  const [family, setFamily] = useState(0);
  const source = decisionExampleSource(example, family);
  return <div className="app-shell quotation-preview decision-preview"><a className="skip-link" href="#main">Skip to decision review</a>
    <aside className="sidebar" aria-label="Preview navigation"><div className="brand"><span className="brand-mark"><Icon name="leaf" /></span><span>GreenProcure<span className="brand-subtitle">Fabric sourcing</span></span></div><nav className="primary-nav"><p className="nav-label">DESIGN PREVIEW</p><span className="nav-item" aria-current="page"><Icon name="grid" />Decision summary</span></nav><div className="sidebar-footer"><Icon name="shield" /><div><strong>Synthetic example</strong><p>In-memory summaries only.<br />Reloading clears this walkthrough.</p></div></div></aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>Woven fabric · synthetic demo</span><Icon name="chevron" /><span>Decision summary</span></div><span className="session-chip">UI preview</span></header><main id="main" className="main-content" tabIndex={-1}><DecisionWalkthrough key={`${example}-${family}`} source={source} example={example} onExampleChange={(next) => { setExample(next); setFamily((value) => value + 1); }} onBack={() => window.location.assign('/comparison-preview.html')} /></main></div>
  </div>;
}
