import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ScenarioView } from '../features/scenarios/ScenarioView';
import { makeProposal, policyKey, proposalKey, scenarioLocked, scenarioOfferSelectable, scenarioResultIssue } from '../features/scenarios/model';
import type { ScenarioBaseline, ScenarioDraft, ScenarioOperation, ScenarioProposal, ScenarioResult } from '../features/scenarios/types';
import { exampleDraft, preparedScenarioResult, scenarioBaseline, scenarioExamples } from './scenarioFixtures';
import type { ScenarioExample } from './scenarioFixtures';

interface PendingScenario { id: string; proposal: ScenarioProposal; phase: 'apply' | 'evaluate'; scenarioId: string | null }
interface PreviewState {
  example: ScenarioExample; baseline: ScenarioBaseline; draft: ScenarioDraft; cleanDraft: ScenarioDraft;
  applied: ScenarioResult | null; history: ScenarioResult[]; operation: ScenarioOperation; pending: PendingScenario | null; notice: string;
}
interface DecisionContext { scenarioId: string; evaluationId: string; quoteId: string; supplierName: string; baselineId: string; caseRevision: number; confirmedRevisionId: string }
type LeaveAction = { kind: 'navigate'; target: string } | { kind: 'reset'; example: ScenarioExample };

function initialState(example: ScenarioExample, seed: number): PreviewState {
  const baseline = scenarioBaseline(example, seed);
  const draft = exampleDraft(example);
  const proposal = makeProposal(baseline, draft);
  const pendingExample = ['running', 'uncertain', 'confirmed-only'].includes(example);
  const id = `demo-scenario-operation-${seed}`;
  const scenarioId = example === 'confirmed-only' ? `demo-confirmed-scenario-${seed}` : null;
  const pending: PendingScenario | null = pendingExample && proposal ? { id, proposal, phase: scenarioId ? 'evaluate' : 'apply', scenarioId } : null;
  const applied = proposal && ['applied', 'five-percent', 'no-feasible'].includes(example) ? preparedScenarioResult(baseline, proposal, id, `demo-confirmed-scenario-${seed}`) : null;
  const operation: ScenarioOperation = example === 'running' ? { id, status: 'running', message: 'The synthetic application is paused. Choose its outcome in Preview controls; no request is running.' }
    : example === 'uncertain' ? { id, status: 'uncertain', message: 'The simulated response was lost. Check this same captured proposal before retrying or applying another scenario.' }
    : example === 'confirmed-only' ? { id, status: 'error', confirmedScenarioId: scenarioId, message: 'The scenario confirmation is recorded in this simulation, but its evaluation is unavailable. Resume the evaluation against that same scenario; do not confirm it again.' }
    : { id: null, status: 'idle', message: '' };
  return { example, baseline, draft, cleanDraft: structuredClone(draft), applied, history: applied ? [structuredClone(applied)] : [], operation, pending,
    notice: 'Independent static examples only. No scenario, evaluation or final decision is written to a service or browser storage.' };
}

export function ScenarioPreview() {
  const [state, setState] = useState(() => initialState('ready', 0));
  const [decision, setDecision] = useState<DecisionContext | null>(null);
  const [leaveAction, setLeaveAction] = useState<LeaveAction | null>(null);
  const controlsTitle = useRef<HTMLHeadingElement>(null);
  const previewDetails = useRef<HTMLDetailsElement>(null);
  const outcomeControls = useRef<HTMLDivElement>(null);
  const decisionDialog = useRef<HTMLDialogElement>(null);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  const sequence = useRef(0);
  const mutationLock = useRef(false);
  const leaving = useRef(false);
  const locked = scenarioLocked(state.operation);
  const dirty = (policyKey(state.draft) ?? JSON.stringify(state.draft)) !== (policyKey(state.cleanDraft) ?? JSON.stringify(state.cleanDraft));
  const decisionCurrent = Boolean(decision && state.applied && decision.scenarioId === state.applied.scenarioId && decision.evaluationId === state.applied.snapshot.id && decision.baselineId === state.baseline.snapshot.id && decision.caseRevision === state.baseline.context.currentRevision && scenarioOfferSelectable(state.baseline, state.draft, state.applied, state.operation, decision.quoteId));
  const preparedPending = state.pending ? preparedScenarioResult(state.baseline, state.pending.proposal, state.pending.id, state.pending.scenarioId ?? `demo-confirmed-scenario-${state.pending.id}`) : null;

  useEffect(() => { if (!decisionCurrent) decisionDialog.current?.close(); }, [decisionCurrent]);
  useEffect(() => {
    if (!dirty && !locked) return;
    const warn = (event: BeforeUnloadEvent) => { if (!leaving.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, locked]);
  useEffect(() => {
    if (!['running', 'checking'].includes(state.operation.status)) return;
    if (previewDetails.current) previewDetails.current.open = true;
    if (!decisionDialog.current?.open && !leaveDialog.current?.open) {
      outcomeControls.current?.focus(); outcomeControls.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [state.operation.status, state.pending?.id]);

  function focusControls() { if (!decisionDialog.current?.open && !leaveDialog.current?.open) controlsTitle.current?.focus(); }
  function replaceExample(example: ScenarioExample) {
    const next = initialState(example, ++sequence.current);
    mutationLock.current = scenarioLocked(next.operation);
    setDecision(null); setLeaveAction(null); setState(next); leaveDialog.current?.close(); focusControls();
  }
  function requestLeave(action: LeaveAction) {
    if (action.kind === 'reset' && (locked || mutationLock.current)) return;
    if (dirty || locked || mutationLock.current) { setLeaveAction(action); leaveDialog.current?.showModal(); }
    else if (action.kind === 'reset') replaceExample(action.example);
    else window.location.assign(action.target);
  }
  function confirmLeave() {
    if (!leaveAction) return;
    if (leaveAction.kind === 'reset') { if (!locked && !mutationLock.current) replaceExample(leaveAction.example); }
    else { leaving.current = true; window.location.assign(leaveAction.target); }
  }
  function changeDraft(draft: ScenarioDraft) {
    if (locked || mutationLock.current) return;
    const changed = JSON.stringify(draft) !== JSON.stringify(state.draft);
    const clearKnownFailure = changed && state.operation.status === 'error' && !state.pending && !state.operation.confirmedScenarioId;
    setState({ ...state, draft: structuredClone(draft),
      operation: clearKnownFailure ? { id: state.operation.id, status: 'idle', message: '' } : state.operation,
      notice: clearKnownFailure ? 'The known failed attempt did not confirm a scenario. Your previous result is unchanged; restore its exact settings to choose again, or review the edited draft.' : state.notice });
  }
  function apply(proposal: ScenarioProposal) {
    if (locked || mutationLock.current) return;
    const current = makeProposal(state.baseline, state.draft);
    if (!current || proposalKey(current) !== proposalKey(proposal)) return;
    mutationLock.current = true;
    const id = `demo-scenario-operation-${++sequence.current}`;
    setState({ ...state, pending: { id, proposal: structuredClone(proposal), phase: 'apply', scenarioId: null },
      operation: { id, status: 'running', message: 'The reviewed proposal is captured. Choose a simulated confirmation/evaluation outcome above; the baseline and previous result remain unchanged.' },
      notice: `${id} is a local simulation. No confirmation or calculation request was sent.` });
  }
  function resolveSuccess() {
    const pending = state.pending;
    if (!pending || !['running', 'checking'].includes(state.operation.status)) return;
    const current = makeProposal(state.baseline, state.draft);
    if (!current || proposalKey(current) !== proposalKey(pending.proposal)) {
      mutationLock.current = Boolean(pending.scenarioId);
      setState({ ...state, pending: pending.scenarioId ? pending : null, operation: { id: pending.id, status: 'error', confirmedScenarioId: pending.scenarioId, message: 'The result no longer matches the captured baseline and proposal. It was not applied. Review a current baseline before continuing.' }, notice: pending.scenarioId ? 'The existing confirmed scenario reference is retained. This mismatched evaluation did not erase or reconfirm it.' : 'Mismatched scenario references were rejected; existing snapshots were preserved.' });
      return;
    }
    const result = preparedScenarioResult(state.baseline, pending.proposal, pending.id, pending.scenarioId ?? `demo-confirmed-scenario-${pending.id}`);
    if (!result) {
      mutationLock.current = Boolean(pending.scenarioId);
      setState({ ...state, pending: pending.scenarioId ? pending : null, operation: { id: pending.id, status: 'error', confirmedScenarioId: pending.scenarioId, message: pending.scenarioId ? 'This confirmed scenario has no prepared evaluation in the development preview. Its exact confirmation reference and proposal are retained; no replacement result was invented.' : 'These settings are valid, but this development preview has no prepared result for this exact policy. Your draft and previous result remain available. No calculation or scenario confirmation was performed.' }, notice: 'Supported examples are the four presets and Custom 20/20/60, each with no caps, +5%/25%, or +2%/25%. Other valid settings need the future backend calculation.' });
      focusControls(); return;
    }
    const issue = scenarioResultIssue(result, state.baseline);
    if (issue) {
      mutationLock.current = Boolean(pending.scenarioId);
      setState({ ...state, pending: pending.scenarioId ? pending : null, operation: { id: pending.id, status: 'error', confirmedScenarioId: pending.scenarioId, message: issue }, notice: pending.scenarioId ? 'An inconsistent supplied evaluation was not applied. The already confirmed scenario reference and captured proposal are preserved.' : 'An inconsistent supplied result was not applied.' });
      return;
    }
    mutationLock.current = false;
    setState({ ...state, pending: null, applied: structuredClone(result), cleanDraft: structuredClone(result.proposal.policy), history: [...state.history, structuredClone(result)],
      operation: { id: pending.id, status: 'idle', message: '' }, notice: `Supplied result ${result.snapshot.id} is attached to ${result.scenarioId}. The original baseline and all earlier scenario snapshots are unchanged. No service save occurred.` });
    focusControls();
  }
  function resolveRejected() {
    const pending = state.pending;
    if (!pending || !['running', 'checking'].includes(state.operation.status)) return;
    if (pending.scenarioId) {
      setState({ ...state, operation: { id: pending.id, status: 'error', confirmedScenarioId: pending.scenarioId, message: 'The simulated evaluation failed again. The captured confirmed scenario still exists in this walkthrough; resume its evaluation without reconfirming.' }, notice: 'Previous results are retained. The confirmed proposal cannot be silently edited during recovery.' });
    } else {
      mutationLock.current = false;
      setState({ ...state, pending: null, operation: { id: pending.id, status: 'error', message: 'The simulated service confirmed that this scenario was not applied. The draft and previous result are retained; review and deliberately try again if appropriate.' }, notice: 'Known rejection is distinct from an unknown outcome. No scenario confirmation is recorded.' });
    }
    focusControls();
  }
  function resolveConfirmedOnly() {
    const pending = state.pending;
    if (!pending || pending.phase !== 'apply' || !preparedPending || !['running', 'checking'].includes(state.operation.status)) return;
    const scenarioId = `demo-confirmed-scenario-${pending.id}`;
    setState({ ...state, pending: { ...pending, phase: 'evaluate', scenarioId },
      operation: { id: pending.id, status: 'error', confirmedScenarioId: scenarioId, message: 'The scenario is confirmed in this simulation, but its evaluation failed. Resume that evaluation using the same confirmed proposal; do not create a second confirmation.' }, notice: `${scenarioId} retains the exact reviewed proposal. The previous evaluation remains visible and cannot advance as the new result.` });
    focusControls();
  }
  function loseResponse() {
    if (!state.pending || !['running', 'checking'].includes(state.operation.status)) return;
    setState({ ...state, operation: { id: state.pending.id, status: 'uncertain', confirmedScenarioId: state.pending.scenarioId, message: 'The simulated outcome is unknown. Check the same captured operation; another apply or retry is blocked until its result is known.' }, notice: `${state.pending.id} and its reviewed proposal remain unchanged. An unavailable readback does not mean failure.` });
    focusControls();
  }
  function checkResult() {
    if (!state.pending || state.operation.status !== 'uncertain') return;
    setState({ ...state, operation: { id: state.pending.id, status: 'checking', confirmedScenarioId: state.pending.scenarioId, message: 'Checking this same captured scenario operation. Choose its recorded outcome above; this is not another confirmation.' }, notice: 'Readback is simulated. Baseline, proposal and operation references are preserved.' });
  }
  function resumeEvaluation() {
    if (!state.pending?.scenarioId || state.operation.status !== 'error' || state.operation.confirmedScenarioId !== state.pending.scenarioId) return;
    mutationLock.current = true;
    setState({ ...state, operation: { id: state.pending.id, status: 'running', confirmedScenarioId: state.pending.scenarioId, message: 'Resume the evaluation for the already confirmed scenario. Choose a simulated outcome above; no second confirmation is created.' }, notice: `The same scenario ${state.pending.scenarioId} and captured policy are used for recovery.` });
  }
  function reviewDecision(scenarioId: string, evaluationId: string, quoteId: string) {
    const result = state.applied;
    if (!result || scenarioId !== result.scenarioId || evaluationId !== result.snapshot.id || !scenarioOfferSelectable(state.baseline, state.draft, result, state.operation, quoteId)) return;
    const offer = result.snapshot.offers.find((item) => item.id === quoteId);
    if (!offer?.confirmedRevisionId) return;
    setDecision({ scenarioId, evaluationId, quoteId, supplierName: offer.supplierName, baselineId: state.baseline.snapshot.id, caseRevision: state.baseline.context.currentRevision, confirmedRevisionId: offer.confirmedRevisionId });
    decisionDialog.current?.showModal();
  }

  return <div className="app-shell quotation-preview scenario-preview">
    <a className="skip-link" href="#main">Skip to sourcing scenarios</a>
    <aside className="sidebar" aria-label="Preview navigation">
      <div className="brand"><span className="brand-mark"><Icon name="leaf" /></span><span>GreenProcure<span className="brand-subtitle">Fabric sourcing</span></span></div>
      <nav className="primary-nav" aria-label="Scenario preview"><p className="nav-label">DESIGN PREVIEW</p>
        <a className="nav-item" href="/quotation-preview.html" onClick={(event) => { event.preventDefault(); requestLeave({ kind: 'navigate', target: '/quotation-preview.html' }); }}><Icon name="fabric" />Quotation walkthrough</a>
        <a className="nav-item" href="/comparison-preview.html" onClick={(event) => { event.preventDefault(); requestLeave({ kind: 'navigate', target: '/comparison-preview.html' }); }}><Icon name="grid" />Comparison example</a>
        <span className="nav-item" aria-current="page"><Icon name="grid" />Scenarios</span>
      </nav>
      <div className="sidebar-footer"><Icon name="shield" /><div><strong>Independent synthetic example</strong><p>No signed-in session.<br />No scenario or decision is saved.</p></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span>Woven fabric · synthetic demo</span><Icon name="chevron" /><span>Explore scenarios</span></div><span className="session-chip">UI preview</span></header>
      <main id="main" className="main-content" tabIndex={-1}>
        <section className="preview-controls scenario-preview-controls" aria-labelledby="scenario-preview-title">
          <div className="scenario-preview-summary"><h2 id="scenario-preview-title" ref={controlsTitle} tabIndex={-1}>Synthetic scenario preview</h2><p>Independent supplied data; test-only carbon. No calculation, AI call or service save.</p></div>
          <details ref={previewDetails}><summary>Preview controls</summary><div className="preview-control-body">
            <div className="preview-scenario"><label htmlFor="scenario-example">Scenario example state</label><select id="scenario-example" value={state.example} disabled={locked} onChange={(event) => requestLeave({ kind: 'reset', example: event.target.value as ScenarioExample })}>{scenarioExamples.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><button className="button button-secondary" disabled={locked} onClick={() => requestLeave({ kind: 'reset', example: state.example })}>Reset scenario example</button></div>
            {['running', 'checking'].includes(state.operation.status) && <div ref={outcomeControls} tabIndex={-1} className="preview-outcomes" role="group" aria-label="Simulated scenario outcomes">
              <strong>{state.operation.status === 'checking' ? 'Resolve this same operation:' : 'Choose the simulated outcome:'}</strong>
              <button className="button button-secondary" onClick={resolveSuccess}>{preparedPending ? 'Simulate applied scenario and result' : 'Show unavailable prepared result'}</button>
              <button className="button button-secondary" onClick={resolveRejected}>Simulate confirmed failure</button>
              {state.pending?.phase === 'apply' && preparedPending && <button className="button button-secondary" onClick={resolveConfirmedOnly}>Simulate confirmation saved, evaluation failed</button>}
              <button className="button button-secondary" onClick={loseResponse}>{state.operation.status === 'checking' ? 'Simulate readback unavailable' : 'Simulate lost response'}</button>
            </div>}
            <p className="preview-notice" role="status">{state.notice}</p>
            <details className="scenario-fixture-details"><summary>Fixture details and limitations</summary><p>This walkthrough has its own frozen synthetic baseline. It does not receive confirmed quotations or selections from the other examples. It uses 150 cm total/usable width, distinct from the review PDF’s 152 cm total width; reference date is 1 October 2026.</p><p>Prepared policies: Balanced, Lowest Cost, Lower Carbon, Fastest Delivery and Custom 20/20/60. Each supports no relative limits, maximum +5% cost with minimum 25% carbon reduction, or maximum +2% with minimum 25%. Other valid settings have no prepared result; this is a preview limitation, not a backend validation rule.</p><p>All rankings, scores, differences and feasible sets are supplied static examples based on CALCULATION_SPEC §9. No browser calculation engine, supplier PDF, AI request, storage write or real confirmation is connected. Reloading clears this walkthrough.</p></details>
            {state.history.length > 0 && <details className="scenario-fixture-details"><summary>Earlier supplied scenario snapshots ({state.history.length})</summary><p>These local immutable receipts are retained for this walkthrough. They are not persisted business records.</p><ul>{state.history.map((result) => <li key={result.snapshot.id}>{result.scenarioId} · {result.snapshot.id} · {result.snapshot.policy.name} · {result.snapshot.winnerQuoteId ? `preferred offer ${result.snapshot.winnerQuoteId.toUpperCase()}` : 'no feasible offer'} · baseline {result.proposal.baselineEvaluationId}</li>)}</ul></details>}
          </div></details>
        </section>
        <ScenarioView baseline={state.baseline} draft={state.draft} applied={state.applied} operation={state.operation} onDraftChange={changeDraft} onApply={apply} onCheckResult={checkResult} onResumeEvaluation={resumeEvaluation} onBack={() => requestLeave({ kind: 'navigate', target: '/comparison-preview.html' })} onReviewDecision={reviewDecision} />
      </main>
    </div>
    <dialog ref={decisionDialog} className="preview-dialog scenario-preview-dialog" aria-labelledby="scenario-decision-title"><h2 id="scenario-decision-title">Review this scenario decision handoff</h2>
      {decision && decisionCurrent && <><p className="preview-dialog-note">You selected <strong>{decision.supplierName}</strong>. {decision.quoteId !== state.applied?.snapshot.winnerQuoteId ? 'This is an eligible alternative to the scenario’s preferred offer.' : 'This is the scenario’s preferred offer.'}</p><dl><dt>Scenario</dt><dd>{decision.scenarioId}</dd><dt>Evaluation</dt><dd>{decision.evaluationId}</dd><dt>Frozen baseline</dt><dd>{decision.baselineId}</dd><dt>Quotation</dt><dd>{decision.quoteId}</dd><dt>Confirmed reference</dt><dd>{decision.confirmedRevisionId}</dd><dt>Case revision</dt><dd>{decision.caseRevision}</dd></dl><p className="preview-dialog-note"><strong>No decision has been saved.</strong> A later milestone will collect your reason and explicitly save an immutable decision against these exact references. This example places no order and cannot support a real purchase.</p></>}
      <button className="button button-primary" onClick={() => decisionDialog.current?.close()}>Return to scenarios</button>
    </dialog>
    <dialog ref={leaveDialog} className="preview-dialog scenario-preview-dialog" aria-labelledby="scenario-leave-title"><h2 id="scenario-leave-title">{locked ? 'Leave this unresolved scenario?' : 'Discard these scenario edits?'}</h2><p className="preview-dialog-note">{locked ? 'The captured proposal has an unresolved operation. Leaving clears this in-memory walkthrough; it does not cancel, complete or save a real service operation.' : 'Your un-applied draft edits will be discarded when you leave or reset this example. The original baseline has not changed.'}</p><p className="preview-dialog-note">The destination is an independent example. It will not receive these scenario snapshots or your selection.</p><div className="dialog-actions"><button className="button button-primary" autoFocus onClick={() => leaveDialog.current?.close()}>Keep working</button><button className="button button-secondary" onClick={confirmLeave}>{leaveAction?.kind === 'reset' ? 'Discard edits and reset' : locked ? 'Leave this walkthrough' : 'Discard edits and leave'}</button></div></dialog>
  </div>;
}
