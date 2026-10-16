import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ComparisonView } from '../features/comparison/ComparisonView';
import { operationPending, rankingIssue, selectableOffer } from '../features/comparison/model';
import type { ComparisonContext, ComparisonExplanation, ComparisonOffer, ComparisonOperation, ComparisonSnapshot } from '../features/comparison/types';
import { comparisonContext, comparisonScenarios, comparisonSnapshot, suppliedExplanation, unavailableExplanation } from './comparisonFixtures';
import type { ComparisonScenario } from './comparisonFixtures';

interface PendingComparison {
  id: string; kind: 'evaluation' | 'explanation' | 'refresh'; inputRevision: number;
  sourceSnapshotId: string | null; resultScenario: ComparisonScenario;
}
interface ComparisonPreviewState {
  scenario: ComparisonScenario; context: ComparisonContext; snapshot: ComparisonSnapshot | null;
  explanation: ComparisonExplanation; operation: ComparisonOperation; pending: PendingComparison | null; notice: string;
}
interface DecisionContext { evaluationId: string; quoteId: string; supplierName: string; confirmedRevisionId: string; inputRevision: number; caseRevision: number }
interface InspectionContext { evaluationId: string; inputRevision: number; offer: ComparisonOffer }
const resultScenario = (scenario: ComparisonScenario): ComparisonScenario => ['ready-before-evaluate', 'running', 'uncertain', 'read-error', 'explanation-unavailable', 'mismatch', 'stale'].includes(scenario) ? 'complete' : scenario;

function initialState(scenario: ComparisonScenario, seed: number): ComparisonPreviewState {
  const context = comparisonContext(scenario === 'stale' ? 11 : 10);
  const noSnapshot = scenario === 'ready-before-evaluate' || scenario === 'unreviewed-inputs';
  const snapshot = noSnapshot ? null : comparisonSnapshot(scenario, `demo-evaluation-${seed}`, 10);
  if (snapshot && scenario === 'stale') snapshot.historical = true;
  let explanation = snapshot ? suppliedExplanation(snapshot, scenario) : unavailableExplanation();
  if (scenario === 'explanation-unavailable' || scenario === 'missingapprovedfactor') explanation = unavailableExplanation();
  if (scenario === 'mismatch') explanation = { status: 'ready', evaluationId: 'different-evaluation', recommendedQuoteId: 'b', validated: true, summary: 'MISMATCHED_NARRATIVE_MUST_NOT_RENDER', tradeoffs: [], limitations: [] };
  const pending = scenario === 'running' || scenario === 'uncertain' ? { id: `demo-operation-${seed}`, kind: 'evaluation' as const, inputRevision: context.currentRevision, sourceSnapshotId: snapshot?.id ?? null, resultScenario: 'complete' as const } : null;
  const operation: ComparisonOperation = scenario === 'running' ? { status: 'running', kind: 'evaluation', message: 'Synthetic evaluation is paused before its result. Choose an outcome in the preview controls; no calculation or service call is running.' }
    : scenario === 'uncertain' ? { status: 'uncertain', kind: 'evaluation', message: 'The simulated evaluation response was lost. Check the same operation before starting another evaluation.' }
    : scenario === 'read-error' ? { status: 'error', kind: 'refresh', message: 'The simulated refresh failed. The last known snapshot remains visible, but its current status is unverified. Refresh or evaluate again before advancing.' }
    : { status: 'idle', message: '' };
  return { scenario, context, snapshot, explanation, operation, pending,
    notice: scenario === 'unreviewed-inputs' ? 'Evaluation is gated until human-confirmed quote revisions are supplied. The independent quotation preview does not create those records.'
      : scenario === 'stale' ? 'The example case has a later confirmation reference. These historical results remain visible until an explicit new evaluation resolves.'
      : 'Supplied example values only. No backend calculation, AI explanation, upload, storage write or decision save occurs.' };
}

export function ComparisonPreview() {
  const [state, setState] = useState(() => initialState('ready-before-evaluate', 0));
  const [inspection, setInspection] = useState<InspectionContext | null>(null);
  const [decision, setDecision] = useState<DecisionContext | null>(null);
  const controlsTitle = useRef<HTMLHeadingElement>(null);
  const previewDetails = useRef<HTMLDetailsElement>(null);
  const outcomeControls = useRef<HTMLDivElement>(null);
  const inspectionDialog = useRef<HTMLDialogElement>(null);
  const decisionDialog = useRef<HTMLDialogElement>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const mutationLock = useRef(false);
  const pending = operationPending(state.operation);
  const evaluationStatus = state.operation.kind === 'explanation' ? 'idle' : state.operation.status;
  const canEvaluate = state.scenario !== 'unreviewed-inputs' && !pending;
  const blockedReason = state.scenario === 'unreviewed-inputs' ? 'Review and explicitly confirm at least one quotation revision before evaluating. Uploaded or extracted documents alone are not confirmed inputs.' : null;
  const decisionCurrent = Boolean(decision && state.snapshot && decision.evaluationId === state.snapshot.id && decision.inputRevision === state.snapshot.inputRevision && decision.caseRevision === state.context.currentRevision && selectableOffer(state.snapshot, state.context, state.operation, decision.quoteId));

  useEffect(() => {
    if (!decisionCurrent) decisionDialog.current?.close();
  }, [decisionCurrent]);
  useEffect(() => {
    inspectionDialog.current?.close();
    decisionDialog.current?.close();
  }, [state.snapshot?.id, state.context.currentRevision, evaluationStatus]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [pending]);

  useEffect(() => {
    if (!['running', 'checking'].includes(state.operation.status)) return;
    if (previewDetails.current) previewDetails.current.open = true;
    if (!decisionDialog.current?.open && !inspectionDialog.current?.open && !leaveDialog.current?.open) {
      outcomeControls.current?.focus();
      outcomeControls.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [state.operation.status, state.pending?.id]);

  function focusControls() {
    if (!decisionDialog.current?.open && !inspectionDialog.current?.open && !leaveDialog.current?.open) controlsTitle.current?.focus();
  }
  function reset(scenario: ComparisonScenario) {
    if (pending || mutationLock.current) return;
    const next = initialState(scenario, ++sequence.current);
    mutationLock.current = operationPending(next.operation);
    setDecision(null); setInspection(null); setState(next); focusControls();
  }
  function begin(kind: PendingComparison['kind']) {
    if (pending || mutationLock.current) return;
    if (kind === 'evaluation' && !canEvaluate) return;
    if (kind === 'explanation' && (!state.snapshot || rankingIssue(state.snapshot, state.context) || (state.operation.status === 'error' && state.operation.kind !== 'explanation'))) return;
    mutationLock.current = true;
    const operationId = `demo-operation-${++sequence.current}`;
    setState({ ...state, pending: { id: operationId, kind, inputRevision: state.context.currentRevision, sourceSnapshotId: state.snapshot?.id ?? null, resultScenario: resultScenario(state.scenario) },
      operation: { status: 'running', kind, message: kind === 'evaluation' ? 'Evaluation outcome is simulated. Choose the result above; the existing snapshot stays visible until the operation is resolved.' : 'Explanation retry is simulated for this exact evaluation. Choose a result above; no AI call is running.' },
      notice: `Paused at ${kind === 'evaluation' ? 'evaluation' : 'explanation'} outcome for ${operationId}. No service request was sent.` });
    focusControls();
  }
  function resolveSuccess() {
    const request = state.pending;
    if (!request || !['running', 'checking'].includes(state.operation.status)) return;
    if (request.inputRevision !== state.context.currentRevision || request.sourceSnapshotId !== (state.snapshot?.id ?? null)) {
      mutationLock.current = false;
      setState({ ...state, pending: null, operation: { status: 'error', kind: request.kind, message: 'The simulated inputs changed before the result was applied. Re-evaluate current confirmed revisions.' }, notice: 'A result with mismatched input references was not applied.' });
      return;
    }
    mutationLock.current = false;
    if (request.kind === 'refresh') {
      setState({ ...state, pending: null, operation: { status: 'idle', kind: request.kind, message: '' }, notice: state.snapshot ? `The simulated read verified snapshot ${state.snapshot.id}. Its input revision and any historical limits are unchanged; no new evaluation was created.` : 'The simulated read confirmed that no saved evaluation exists. Start an evaluation explicitly when confirmed inputs are available.' });
    } else if (request.kind === 'explanation') {
      if (!state.snapshot) return;
      setState({ ...state, pending: null, operation: { status: 'idle', kind: request.kind, message: '' }, explanation: suppliedExplanation(state.snapshot, resultScenario(state.scenario)), notice: `A matching static explanation is shown for ${state.snapshot.id}. The evaluation itself was not replaced.` });
    } else {
      const snapshot = comparisonSnapshot(request.resultScenario, `demo-evaluation-${request.id}`, request.inputRevision);
      const explanation = request.resultScenario === 'missingapprovedfactor' ? unavailableExplanation() : suppliedExplanation(snapshot, request.resultScenario);
      setState({ ...state, pending: null, snapshot, explanation, operation: { status: 'idle', kind: request.kind, message: '' }, notice: `New supplied snapshot ${snapshot.id} now refers to input revision ${snapshot.inputRevision}. The browser did not calculate these values or change the inputs.` });
    }
    focusControls();
  }
  function resolveRejected() {
    const request = state.pending;
    if (!request) return;
    mutationLock.current = false;
    if (request.kind === 'refresh') {
      setState({ ...state, pending: null, operation: { status: 'error', kind: 'refresh', message: 'The simulated refresh failed. The last known snapshot remains unverified; refresh or evaluate again before advancing.' }, notice: 'The read failure did not change the saved snapshot or create an evaluation.' });
    } else if (request.kind === 'explanation') {
      setState({ ...state, pending: null, explanation: unavailableExplanation(), operation: { status: 'idle', kind: request.kind, message: '' }, notice: 'The simulated explanation attempt failed. The matching supplied comparison remains available; no fallback narrative was invented.' });
    } else {
      setState({ ...state, pending: null, operation: { status: 'error', kind: 'evaluation', message: 'The simulated service confirmed this evaluation did not complete. The last known result is retained, but advancing is blocked until a new evaluation resolves.' }, notice: 'Known evaluation failure is not an uncertain outcome. You may deliberately evaluate again.' });
    }
    focusControls();
  }
  function loseResponse() {
    if (!state.pending) return;
    setState({ ...state, operation: { status: 'uncertain', kind: state.pending.kind, message: state.pending.kind === 'explanation' ? 'The optional explanation outcome is unknown. Check the same request before retrying it; the current comparison and your offer choice remain available.' : `The simulated ${state.pending.kind} outcome is unknown. Check this same operation before retrying or advancing.` }, notice: `${state.pending.id} remains pending. An unavailable readback does not mean the operation failed.` });
    focusControls();
  }
  function checkResult() {
    if (state.operation.status === 'error' && !state.pending && !mutationLock.current) {
      mutationLock.current = true;
      setState({ ...state, pending: { id: `demo-refresh-${++sequence.current}`, kind: 'refresh', inputRevision: state.context.currentRevision, sourceSnapshotId: state.snapshot?.id ?? null, resultScenario: resultScenario(state.scenario) }, operation: { status: 'checking', kind: 'refresh', message: 'The saved snapshot is being checked in this simulation. Choose a verified read or a read failure above; no new evaluation is started.' }, notice: 'This is a simulated read of the last known result, not a calculation or a new decision.' });
      focusControls();
      return;
    }
    if (!state.pending || state.operation.status !== 'uncertain') return;
    setState({ ...state, operation: { status: 'checking', kind: state.pending.kind, message: `Checking the same ${state.pending.kind} operation. Choose its recorded result above; this is not a second request.` }, notice: `Readback for ${state.pending.id} is simulated. The pending input references remain unchanged.` });
    focusControls();
  }
  function requestBack() {
    if (pending || mutationLock.current) leaveDialog.current?.showModal();
    else window.location.assign('/quotation-preview.html');
  }
  function inspectQuotation(quoteId: string, revisionId: string | null) {
    const snapshot = state.snapshot;
    const offer = snapshot?.offers.find((item) => item.id === quoteId && item.confirmedRevisionId === revisionId);
    if (!snapshot || !offer) return;
    setInspection({ evaluationId: snapshot.id, inputRevision: snapshot.inputRevision, offer: structuredClone(offer) });
    inspectionDialog.current?.showModal();
  }
  function reviewDecision(evaluationId: string, quoteId: string) {
    const snapshot = state.snapshot;
    if (!snapshot || snapshot.id !== evaluationId || !selectableOffer(snapshot, state.context, state.operation, quoteId)) return;
    const offer = snapshot.offers.find((item) => item.id === quoteId);
    if (!offer?.confirmedRevisionId) return;
    setDecision({ evaluationId, quoteId, supplierName: offer.supplierName, confirmedRevisionId: offer.confirmedRevisionId, inputRevision: snapshot.inputRevision, caseRevision: state.context.currentRevision });
    decisionDialog.current?.showModal();
  }

  return <div className="app-shell quotation-preview comparison-preview">
    <a className="skip-link" href="#main">Skip to quotation comparison</a>
    <aside className="sidebar" aria-label="Preview navigation">
      <div className="brand"><span className="brand-mark"><Icon name="leaf" /></span><span>GreenProcure<span className="brand-subtitle">Fabric sourcing</span></span></div>
      <nav className="primary-nav" aria-label="Comparison preview">
        <p className="nav-label">DESIGN PREVIEW</p>
        <a className="nav-item" href="/quotation-preview.html" onClick={(event) => { event.preventDefault(); requestBack(); }}><Icon name="fabric" />Quotation walkthrough</a>
        <span className="nav-item" aria-current="page"><Icon name="grid" />Comparison</span>
      </nav>
      <div className="sidebar-footer"><Icon name="shield" /><div><strong>Independent synthetic example</strong><p>No signed-in session.<br />No decision is saved.</p></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><span>Woven fabric · synthetic demo</span><Icon name="chevron" /><span>Compare quotations</span></div><span className="session-chip">UI preview</span></header>
      <main id="main" className="main-content" tabIndex={-1}>
        <section className="preview-controls comparison-preview-controls" aria-labelledby="comparison-preview-title">
          <div className="comparison-preview-summary"><h2 id="comparison-preview-title" ref={controlsTitle} tabIndex={-1}>Synthetic comparison preview</h2>
            <p>Independent synthetic data; test-only carbon. No calculation, AI call or decision save.</p></div>
          <details ref={previewDetails}><summary>Preview controls</summary><div className="preview-control-body">
            <div className="preview-scenario"><label htmlFor="comparison-scenario">Comparison scenario</label><select id="comparison-scenario" value={state.scenario} disabled={pending} onChange={(event) => reset(event.target.value as ComparisonScenario)}>{comparisonScenarios.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="button button-secondary" disabled={pending} onClick={() => reset(state.scenario)}>Reset comparison scenario</button></div>
            {['running', 'checking'].includes(state.operation.status) && <div ref={outcomeControls} tabIndex={-1} className="preview-outcomes" role="group" aria-label="Simulated comparison outcomes">
              <strong>{state.operation.status === 'checking' ? 'Resolve this same operation:' : 'Choose the simulated outcome:'}</strong>
              <button className="button button-secondary" onClick={resolveSuccess}>Simulate {state.pending?.kind === 'explanation' ? 'matching explanation' : state.pending?.kind === 'refresh' ? 'verified read' : 'saved evaluation'}</button>
              <button className="button button-secondary" onClick={resolveRejected}>Simulate confirmed failure</button>
              <button className="button button-secondary" onClick={loseResponse}>{state.operation.status === 'checking' ? 'Simulate readback unavailable' : 'Simulate lost response'}</button>
            </div>}
            <p className="preview-notice" role="status">{state.notice}</p>
            <details className="comparison-fixture-details"><summary>Fixture details and limitations</summary>
              <p>These results are separate from the intake and review previews. Their illustrative confirmed references were not created by your actions there. The comparison uses 150 cm total width, distinct from the review example PDF’s 152 cm.</p>
              <p>Fixture source: CALCULATION_SPEC §9. Reference date: 1 October 2026. All suppliers, routes and confirmation references are fictional. No supplier PDF is connected to these snapshots. Unavailable carbon remains unavailable.</p>
              <p>Scenario changes replace supplied snapshots and clear any selection. Resolve pending requests before resetting. Scores, arrival dates, checks and ranking order are supplied examples; the browser only displays them. Reloading clears this walkthrough.</p>
            </details>
          </div></details>
        </section>
        <ComparisonView context={state.context} snapshot={state.snapshot} explanation={state.explanation} operation={state.operation} canEvaluate={canEvaluate} evaluationBlockedReason={blockedReason}
          onEvaluate={() => begin('evaluation')} onCheckResult={checkResult} onBack={requestBack} onInspectQuotation={inspectQuotation} onRequestExplanation={() => begin('explanation')} onReviewDecision={reviewDecision} />
      </main>
    </div>
    <dialog ref={inspectionDialog} className="preview-dialog comparison-inspection-dialog" aria-labelledby="comparison-inspection-title">
      <h2 id="comparison-inspection-title">Supplied quotation inputs</h2>
      {inspection && <><p className="preview-dialog-note"><strong>{inspection.offer.supplierName}</strong> · {inspection.evaluationId} · input revision {inspection.inputRevision}</p>
        <p className="comparison-dialog-note">These are inputs and provenance supplied with the displayed synthetic snapshot. No original PDF or live record is connected. Inspecting them does not confirm or edit a quotation.</p>
        <dl><dt>Confirmation reference</dt><dd>{inspection.offer.confirmedRevisionId ?? 'No confirmed revision supplied'}</dd>{inspection.offer.evidence.map((item) => <div className="comparison-evidence-pair" key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
        <p className="comparison-dialog-note">Case context and source limitations remain attached to the evaluation. The review walkthrough is a separate example and cannot change this snapshot.</p></>}
      <button className="button button-primary" onClick={() => inspectionDialog.current?.close()}>Return to comparison</button>
    </dialog>
    <dialog ref={decisionDialog} className="preview-dialog comparison-decision-dialog" aria-labelledby="comparison-decision-title">
      <h2 id="comparison-decision-title">Review this decision handoff</h2>
      {decision && decisionCurrent && <><p className="preview-dialog-note">You selected <strong>{decision.supplierName}</strong> from the current supplied evaluation. {decision.quoteId !== state.snapshot?.winnerQuoteId ? 'This is an eligible alternative to the supplied first-ranked offer.' : 'This is the supplied first-ranked offer.'}</p>
        <dl><dt>Evaluation</dt><dd>{decision.evaluationId}</dd><dt>Quotation</dt><dd>{decision.quoteId}</dd><dt>Confirmed reference</dt><dd>{decision.confirmedRevisionId}</dd><dt>Input revision</dt><dd>{decision.inputRevision}</dd><dt>Current case revision</dt><dd>{decision.caseRevision}</dd></dl>
        <p className="comparison-dialog-note"><strong>No decision has been saved.</strong> This is a local handoff preview. A separate milestone will collect the decision reason and explicitly save an immutable decision against these exact references. Scenario editing is also a later workflow.</p>
        <p className="comparison-dialog-note">Test-only carbon figures and synthetic records cannot support a real purchase. Closing this dialog returns to the comparison without recording a purchase or approval.</p></>}
      <button className="button button-primary" onClick={() => decisionDialog.current?.close()}>Return to comparison</button>
    </dialog>
    <dialog ref={leaveDialog} className="preview-dialog" aria-labelledby="comparison-leave-title">
      <h2 id="comparison-leave-title">Leave this unresolved walkthrough?</h2>
      <p className="preview-dialog-note">The simulated operation has no confirmed outcome yet. Leaving clears this in-memory comparison. No real service operation will be cancelled or completed.</p>
      <p className="comparison-dialog-note">The quotation intake page is an independent demonstration; it will not receive this comparison or your selection.</p>
      <div className="comparison-dialog-actions"><button className="button button-primary" autoFocus onClick={() => leaveDialog.current?.close()}>Stay with this result</button><a className="button button-secondary" href="/quotation-preview.html">Leave for quotation walkthrough</a></div>
    </dialog>
  </div>;
}
