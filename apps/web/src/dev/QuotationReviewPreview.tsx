import { useEffect, useRef, useState } from 'react';
import { QuotationReview } from '../features/quotation-review/QuotationReview';
import { collectReviewIssues } from '../features/quotation-review/model';
import type { ReviewConfirmation, ReviewDraft, ReviewDraftField, ReviewField, ReviewOperation } from '../features/quotation-review/types';
import sourcePdf from './assets/synthetic-quotation-review-a.pdf?url';
import { initialReviewDraft, reviewFields, reviewLimitations, reviewScenarios } from './reviewFixtures';
import type { ReviewScenario } from './reviewFixtures';
import './review-preview.css';

interface PendingReview {
  action: 'save' | 'confirm'; snapshot: ReviewDraft; draftRevision: number; caseRevision: number;
}
interface ConflictReview { latest: ReviewDraft; draftRevision: number; caseRevision: number }
interface PreviewState {
  scenario: ReviewScenario; generation: number; fields: ReviewField[]; draft: ReviewDraft;
  saved: ReviewDraft; draftRevision: number; caseRevision: number; operation: ReviewOperation;
  pending: PendingReview | null; conflict: ConflictReview | null; confirmation: ReviewConfirmation | null;
  notice: string;
}
function copyDraft(draft: ReviewDraft): ReviewDraft { return structuredClone(draft); }
function sameDraft(a: ReviewDraft, b: ReviewDraft): boolean { return JSON.stringify(a) === JSON.stringify(b); }
function makeConflict(saved: ReviewDraft, draftRevision: number, caseRevision: number): ConflictReview {
  const latest = copyDraft(saved);
  latest.unitPrice = { value: '2.90', reviewed: false, basis: 'correction', note: 'Synthetic second-session correction. This is an illustrative change, not a new supplier document.' };
  return { latest, draftRevision: draftRevision + 1, caseRevision: caseRevision + 1 };
}
function makeState(scenario: ReviewScenario, generation = 0): PreviewState {
  const fields = reviewFields(scenario);
  const reviewed = scenario === 'confirmed';
  const saved = initialReviewDraft(fields, reviewed);
  const draft = copyDraft(saved);
  if (scenario === 'known-failure') draft.leadTime = { value: '30', basis: 'correction', reviewed: true, note: 'Illustrative buyer clarification: the full order now takes 30 calendar days. This manually supplied demo correction overrides the 20-day sample source.' };
  if (['saving', 'uncertain', 'conflict'].includes(scenario)) draft.unitPrice = { value: '2.88', reviewed: false, basis: 'correction', note: 'Illustrative buyer correction for this recovery scenario; not a new supplier source.' };
  const pending = scenario === 'saving' || scenario === 'uncertain' ? { action: 'save' as const, snapshot: copyDraft(draft), draftRevision: 1, caseRevision: 1 } : null;
  return {
    scenario, generation, fields, draft, saved, draftRevision: 1, caseRevision: 1,
    operation: scenario === 'saving' ? { status: 'saving', action: 'save', message: 'Demonstration paused before the draft-save outcome. Choose a result in the controls above.' }
      : scenario === 'uncertain' ? { status: 'uncertain', action: 'save', message: 'The simulated save response was lost. Check this same operation before making another change.' }
      : scenario === 'conflict' ? { status: 'conflict', action: 'save', message: 'A simulated second session saved a newer draft. Your edits are retained; compare the versions before continuing.' } : { status: 'idle' },
    pending, conflict: scenario === 'conflict' ? makeConflict(saved, 1, 1) : null,
    confirmation: reviewed ? { draftRevision: 1, confirmedAt: '2026-10-15T02:00:00.000Z', reviewerLabel: 'Illustrative previous reviewer (synthetic preset)' } : null,
    notice: reviewed ? 'Loaded a labelled illustrative receipt, not a confirmation performed by you or a server.' : 'Inspect the synthetic source, review the fields, then save and explicitly confirm the saved revision.',
  };
}

export interface QuotationReviewPreviewProps {
  quotationId: string; fileName: string; sourceKind: 'upload' | 'synthetic_sample';
  onBack: () => void; active?: boolean;
}
export function QuotationReviewPreview({ quotationId, fileName, sourceKind, onBack, active = true }: QuotationReviewPreviewProps) {
  const [state, setState] = useState(() => makeState(sourceKind === 'upload' ? 'source-unavailable' : 'complete'));
  const [leaveAction, setLeaveAction] = useState<{ kind: 'back' } | { kind: 'reset'; scenario: ReviewScenario } | null>(null);
  const discardDialog = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const controlsTitle = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mutationLock = useRef(false);
  const dirty = !sameDraft(state.draft, state.saved);
  const busy = ['saving', 'confirming', 'checking', 'uncertain', 'conflict'].includes(state.operation.status);
  const issues = [
    ...collectReviewIssues(state.fields, state.draft),
    ...reviewLimitations(state.draft),
    ...(state.scenario === 'source-unavailable' ? [{
      id: 'source-unavailable', title: 'Original source could not be inspected',
      message: 'The source document is unavailable in this scenario. Recorded excerpts and reviewed fields do not establish that the original PDF was checked. This limitation remains attached to the demo confirmation.',
      impact: ['Source verification'], kind: 'information' as const, blocksConfirmation: false,
    }] : []),
  ];

  useEffect(() => {
    if (!active) return;
    rootRef.current?.querySelector<HTMLElement>('h1')?.focus();
  }, [active]);
  useEffect(() => {
    if (!active || (!dirty && !busy)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active, dirty, busy]);

  function focusControls() { controlsTitle.current?.focus(); }
  function start(action: 'save' | 'confirm') {
    if (busy || mutationLock.current) return;
    if (action === 'save' && !dirty) return;
    if (action === 'confirm' && (dirty || issues.some((issue) => issue.blocksConfirmation) || state.confirmation?.draftRevision === state.draftRevision)) return;
    mutationLock.current = true;
    setState({ ...state, pending: { action, snapshot: copyDraft(state.draft), draftRevision: state.draftRevision, caseRevision: state.caseRevision }, operation: { status: action === 'save' ? 'saving' : 'confirming', action, message: `Simulated ${action === 'save' ? 'draft save' : 'confirmation'} is waiting for a result. Choose an outcome above.` }, notice: 'No request was sent. Choose a synthetic result to continue this recovery walkthrough.' });
    focusControls();
  }
  function resolveSaved() {
    const pending = state.pending;
    if (!pending || !['saving', 'confirming', 'checking'].includes(state.operation.status)) return;
    if (pending.draftRevision !== state.draftRevision || pending.caseRevision !== state.caseRevision) { resolveConflict(); return; }
    mutationLock.current = false;
    if (pending.action === 'save') {
      setState({ ...state, saved: copyDraft(pending.snapshot), draft: copyDraft(pending.snapshot), draftRevision: state.draftRevision + 1, caseRevision: state.caseRevision + 1, pending: null, operation: { status: 'idle' }, notice: `Demo draft revision ${state.draftRevision + 1} is saved in this tab only. It is not confirmed.` });
    } else {
      setState({ ...state, confirmation: { draftRevision: pending.draftRevision, confirmedAt: new Date().toISOString(), reviewerLabel: 'You, in this synthetic walkthrough' }, caseRevision: state.caseRevision + 1, pending: null, operation: { status: 'idle' }, notice: `Demo revision ${pending.draftRevision} was explicitly confirmed in this tab. No real quotation, eligibility result or recommendation was created.` });
    }
    focusControls();
  }
  function reject() {
    if (!state.pending) return;
    mutationLock.current = false;
    setState({ ...state, pending: null, operation: { status: 'error', action: state.pending.action, message: 'The simulated service confirmed that this operation was rejected without applying it. Your changes remain available for a deliberate retry.' }, notice: 'Confirmed rejection is distinct from an unavailable lookup. Retrying is safe in this scenario because the operation is known not to have applied.' });
    focusControls();
  }
  function loseResponse() {
    if (!state.pending) return;
    setState({ ...state, operation: { status: 'uncertain', action: state.pending.action, message: 'The outcome is still unknown. Check the same operation; do not submit another save or confirmation.' }, notice: 'The same pending snapshot is retained. A missing response or unavailable readback does not prove failure.' });
    focusControls();
  }
  function checkSaved() {
    if (!state.pending || state.operation.status !== 'uncertain') return;
    setState({ ...state, operation: { status: 'checking', action: state.pending.action, message: 'Checking the outcome of the same simulated operation. Choose its result above.' }, notice: 'Readback is simulated; no server was contacted and no new mutation was created.' });
    focusControls();
  }
  function resolveConflict() {
    if (!state.pending) return;
    setState({ ...state, conflict: makeConflict(state.saved, state.draftRevision, state.caseRevision), pending: null, operation: { status: 'conflict', action: state.pending.action, message: 'A newer saved draft was found. Your local edits are retained. Compare both versions before continuing.' }, notice: 'Simulated stale-revision rejection. Nothing was silently overwritten or confirmed.' });
    focusControls();
  }
  function recoverConflict(keepEdits: boolean) {
    const conflict = state.conflict;
    if (!conflict) return;
    const draft = copyDraft(conflict.latest);
    if (keepEdits) {
      for (const field of state.fields) {
        if (JSON.stringify(state.draft[field.id]) !== JSON.stringify(state.saved[field.id])) draft[field.id] = { ...state.draft[field.id], reviewed: false };
      }
    }
    mutationLock.current = false;
    setState({ ...state, saved: copyDraft(conflict.latest), draft, draftRevision: conflict.draftRevision, caseRevision: conflict.caseRevision, conflict: null, operation: { status: 'idle' }, notice: keepEdits ? 'Your edits were reapplied to the newer demo draft. Recheck changed fields and save before confirming.' : 'You explicitly discarded your local edits and loaded the newer demo draft. Review its changed price before confirming.' });
    conflictDialog.current?.close();
    focusControls();
  }
  function changeField(id: string, patch: Partial<ReviewDraftField>) {
    if (busy || mutationLock.current || !state.draft[id]) return;
    const current = state.draft[id];
    const next = { ...current, ...patch };
    if (patch.value !== undefined && patch.value !== current.value) {
      next.reviewed = false;
      next.basis = patch.basis ?? (current.basis === 'assumption' ? 'assumption' : patch.value === (state.fields.find((field) => field.id === id)?.originalValue ?? '') ? 'extracted' : 'correction');
    }
    if ((patch.note !== undefined && patch.note !== current.note) || (patch.basis !== undefined && patch.basis !== current.basis)) next.reviewed = false;
    setState({ ...state, draft: { ...state.draft, [id]: next }, operation: { status: 'idle' }, notice: state.confirmation ? 'The earlier confirmation remains historical. Changes must be saved and the new revision explicitly confirmed.' : 'Changes remain local until you save the draft.' });
  }
  function applyReset(scenario: ReviewScenario) {
    mutationLock.current = false;
    setState(makeState(scenario, state.generation + 1));
    focusControls();
  }
  function requestLeave(action: NonNullable<typeof leaveAction>) {
    if (busy || mutationLock.current) return;
    if (dirty) { setLeaveAction(action); discardDialog.current?.showModal(); return; }
    if (action.kind === 'back') onBack(); else applyReset(action.scenario);
  }
  function discardAndLeave() {
    discardDialog.current?.close();
    if (leaveAction?.kind === 'back') { setState({ ...state, draft: copyDraft(state.saved), operation: { status: 'idle' }, notice: 'Unsaved edits were explicitly discarded. The last simulated saved draft remains in this tab.' }); onBack(); }
    else if (leaveAction?.kind === 'reset') applyReset(leaveAction.scenario);
    setLeaveAction(null);
  }
  const sourceUnavailable = state.scenario === 'source-unavailable';
  const conflictFields = state.conflict ? state.fields.filter((field) => JSON.stringify(state.conflict?.latest[field.id]) !== JSON.stringify(state.saved[field.id]) || JSON.stringify(state.draft[field.id]) !== JSON.stringify(state.saved[field.id])) : [];

  return <div ref={rootRef} className="quotation-review-preview">
    <section className="review-preview-controls" aria-labelledby={`review-preview-title-${quotationId}`}>
      <h2 id={`review-preview-title-${quotationId}`} ref={controlsTitle} tabIndex={-1}>Quotation review · synthetic walkthrough</h2>
      <p>Opened from <strong>{fileName}</strong>. These demonstration fields and the sample PDF are separate from that intake record. No uploaded document was read, no AI call ran, and no real quotation is confirmed here.</p>
      <p>Changes and demo receipts stay in this tab only. Reloading clears them.</p>
      <p><strong>Case evidence requirement: none.</strong> This example requires no certificate. No certificate or issuer verification is implied.</p>
      <details>
        <summary>Review preview controls</summary>
        <div className="review-preview-actions">
          <label htmlFor={`review-scenario-${quotationId}`}>Synthetic scenario</label>
          <select id={`review-scenario-${quotationId}`} value={state.scenario} disabled={busy} onChange={(event) => requestLeave({ kind: 'reset', scenario: event.target.value as ReviewScenario })}>{reviewScenarios.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select>
          <button className="button button-secondary" disabled={busy} onClick={() => requestLeave({ kind: 'reset', scenario: state.scenario })}>Reset review scenario</button>
        </div>
        <p>Switching scenarios resets this demonstration, including saved drafts and receipts. Unsaved edits require an explicit discard. Resolve pending operations first.</p>
      </details>
      {['saving', 'confirming', 'checking'].includes(state.operation.status) && <div className="review-preview-outcomes" role="group" aria-label="Simulated review outcomes">
        <strong>{state.operation.status === 'checking' ? 'Resolve this same operation:' : 'Choose the simulated result:'}</strong>
        <button className="button button-secondary" onClick={resolveSaved}>Simulate {state.pending?.action === 'confirm' ? 'confirmed' : 'saved'} result</button>
        <button className="button button-secondary" onClick={reject}>Simulate confirmed rejection</button>
        <button className="button button-secondary" onClick={loseResponse}>{state.operation.status === 'checking' ? 'Simulate readback unavailable' : 'Simulate lost response'}</button>
        <button className="button button-secondary" onClick={resolveConflict}>Simulate newer draft conflict</button>
      </div>}
      <p className="review-preview-notice" role="status">{state.notice}</p>
    </section>
    <QuotationReview key={`${quotationId}-${state.generation}`} quote={{ id: quotationId, supplierName: 'Fictional Weave A', caseName: 'Woven fabric · 50,000 metres · USD 150,000 · maximum 25 days', caseRevision: state.caseRevision, savedDraftRevision: state.draftRevision, extractionLabel: 'Synthetic field examples, not an AI extraction' }} fields={state.fields} draft={state.draft} issues={issues}
      document={{ fileName: 'synthetic-quotation-review-a.pdf', url: sourceUnavailable ? null : sourcePdf, pageCount: sourceUnavailable ? null : 2, availability: sourceUnavailable ? 'unavailable' : 'ready', message: sourceUnavailable ? 'The source is unavailable in this scenario. These are demonstration fields, not extracted data from your uploaded file. Recorded excerpts do not replace inspecting the document; record any unresolved information honestly.' : 'Two-page fictional source created for this UI walkthrough. It is separate from the selected intake record.' }}
      dirty={dirty} operation={state.operation} confirmation={state.confirmation} onFieldChange={changeField} onSave={() => start('save')} onConfirm={() => start('confirm')} onCheckSaved={checkSaved} onResolveConflict={() => conflictDialog.current?.showModal()} onBack={() => requestLeave({ kind: 'back' })} onNext={() => requestLeave({ kind: 'back' })} />
    <dialog ref={discardDialog} className="review-preview-dialog" aria-labelledby={`discard-title-${quotationId}`} onCancel={() => setLeaveAction(null)}>
      <h2 id={`discard-title-${quotationId}`}>Discard unsaved review edits?</h2>
      <p>{leaveAction?.kind === 'back' ? 'Your last simulated saved draft stays in this tab. These unsaved edits will be lost when you return to the list.' : 'Resetting replaces this walkthrough, including its draft and demo receipt. Your unsaved edits will be lost.'}</p>
      <div className="review-preview-actions"><button className="button button-secondary" autoFocus onClick={() => { discardDialog.current?.close(); setLeaveAction(null); }}>Keep editing</button><button className="button button-primary" onClick={discardAndLeave}>Discard edits and continue</button></div>
    </dialog>
    <dialog ref={conflictDialog} className="review-preview-dialog review-preview-conflict" aria-labelledby={`conflict-title-${quotationId}`}>
      <h2 id={`conflict-title-${quotationId}`}>Compare the newer draft with your edits</h2>
      <p>A simulated second session changed the saved draft. Nothing has overwritten your work. Choosing to keep your edits reapplies only your changed fields and requires another review.</p>
      <div className="review-conflict-rows">{conflictFields.map((field) => <div key={field.id} className="review-conflict-row"><h3>{field.label}</h3><dl><dt>Your local value</dt><dd>{state.draft[field.id].value || 'Not provided'}<small>{state.draft[field.id].note || 'No correction note'}</small></dd><dt>Newer saved value</dt><dd>{state.conflict?.latest[field.id].value || 'Not provided'}<small>{state.conflict?.latest[field.id].note || 'No correction note'}</small></dd></dl></div>)}</div>
      <div className="review-preview-actions"><button className="button button-secondary" autoFocus onClick={() => conflictDialog.current?.close()}>Keep both versions for now</button><button className="button button-secondary" onClick={() => recoverConflict(false)}>Discard my edits and use latest</button><button className="button button-primary" onClick={() => recoverConflict(true)}>Keep my edits on the latest draft</button></div>
    </dialog>
  </div>;
}
