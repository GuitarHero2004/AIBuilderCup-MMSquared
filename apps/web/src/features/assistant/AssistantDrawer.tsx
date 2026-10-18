import { useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import type { ApiClient } from '../../api/client';
import type { AssistantAction, AssistantEvents, AssistantRequest, AssistantRun, WorkspaceAssistantAction } from '../../api/types';
import { Icon } from '../../components/Icon';
import { useAssistantSnapshot, useAssistantStore } from './context';
import type { AssistantScreenContext } from './store';
import { AgentAvatar } from './AgentAvatar';
import { agentPersonas } from './personas';
import type { AgentPersona } from './personas';
import { WorkspaceNavigator } from './WorkspaceNavigator';

interface Attempt { key: string; caseId: string; label: string; question?: string; generation?: number; started: number }
const terminal = (run: AssistantRun) => run.status !== 'running';
const explain = (error: unknown) => error instanceof ApiError ? error.message : 'The recorded assistant result could not be read. Check the same request before asking again.';
const statusLabel: Record<AssistantRun['status'], string> = { running: 'Working with saved records', succeeded: 'Answer recorded', failed: 'Request failed', cancelled: 'Request cancelled', timed_out: 'Request timed out', interrupted: 'Request interrupted' };
const screenLabel = { workspace: 'Workspace', case: 'Requirements', intake: 'Quotations', review: 'Quotation review', comparison: 'Confirmed comparison', selection: 'Saved buyer selection' };
function readAttempt(owner: string | null): Attempt | null {
  if (!owner) return null;
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem('greenprocure:assistant:' + owner) ?? 'null');
    if (raw && typeof raw === 'object' && 'key' in raw && typeof raw.key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(raw.key) && 'caseId' in raw && typeof raw.caseId === 'string' && /^[a-f0-9]{32}$/.test(raw.caseId)) return { key: raw.key, caseId: raw.caseId, label: 'Previously opened case', started: performance.now() };
  } catch { /* Only an opaque valid operation reference is recoverable. */ }
  return null;
}
function questionIssue(value: string) {
  const text = value.trim();
  if (!text || !/[^\s\p{Cf}]/u.test(text)) return 'Enter a question about this saved case.';
  if (Array.from(text).length > 2000) return 'Keep your question within 2,000 characters.';
  if (Array.from(text).some(character => { const code = character.codePointAt(0)!; return code < 32 && code !== 9 && code !== 10 || code === 127; })) return 'Remove unsupported control characters.';
  return null;
}
function requestFor(context: AssistantScreenContext, message: string, previous: AssistantRun | undefined): AssistantRequest {
  const intent = context.selectionId ? 'explain_selection' : context.quoteId ? 'quote_help' : 'explain_comparison';
  return { intent, message: message.trim(), screen: context.screen, expected_case_revision: context.caseRevision!, quote_id: intent === 'quote_help' ? context.quoteId : null, expected_draft_revision: intent === 'quote_help' ? context.draftRevision : null, selection_id: intent === 'explain_selection' ? context.selectionId : null, expected_input_fingerprint: intent === 'explain_comparison' ? context.inputFingerprint ?? null : null, has_unsaved_changes: context.dirty, previous_run_id: previous?.id ?? null };
}

export function AssistantDrawer({ api, ownerId }: { api: ApiClient; ownerId: string | null }) {
  const store = useAssistantStore(), snapshot = useAssistantSnapshot(), context = snapshot.context;
  const [scopeChoice, setScopeChoice] = useState<{ caseId: string | null; mode: 'workspace' | 'case' } | null>(null);
  const mode = scopeChoice?.caseId === context.caseId ? scopeChoice.mode : context.caseId ? 'case' : 'workspace';
  const setMode = (next: 'workspace' | 'case') => setScopeChoice({ caseId: context.caseId, mode: next });
  const [view, setView] = useState<'conversation' | 'team' | 'context'>('conversation');
  const [navigationError, setNavigationError] = useState('');
  const [runs, setRuns] = useState<AssistantRun[]>([]);
  const [events, setEvents] = useState<Record<string, AssistantEvents['items']>>({});
  const [questionDraft, setQuestionDraft] = useState({ caseId: context.caseId, text: '' });
  const question = questionDraft.caseId === context.caseId ? questionDraft.text : '';
  const setQuestion = (text: string) => setQuestionDraft({ caseId: store.getSnapshot().context.caseId, text });
  const [originGenerations, setOriginGenerations] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<Attempt | null>(() => readAttempt(ownerId));
  const [reading, setReading] = useState(false), [cancelling, setCancelling] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), composer = useRef<HTMLTextAreaElement>(null), thread = useRef<HTMLDivElement>(null);
  const mounted = useRef(true), pendingRef = useRef(pending), postInFlight = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null), readLock = useRef(false), cancelLock = useRef(false);
  const historyGeneration = useRef(0), origins = useRef(new Map<string, number>()), sticky = useRef(true);
  const id = useId();
  function isPending(key: string) { return pendingRef.current?.key === key; }
  function remember(attempt: Attempt | null) {
    pendingRef.current = attempt; setPending(attempt);
    if (!ownerId) return;
    try { if (attempt) sessionStorage.setItem('greenprocure:assistant:' + ownerId, JSON.stringify({ key: attempt.key, caseId: attempt.caseId })); else sessionStorage.removeItem('greenprocure:assistant:' + ownerId); } catch { /* In-memory readback remains available. */ }
  }
  function accept(run: AssistantRun, attempt?: Attempt) {
    if (!mounted.current) return;
    if (attempt?.generation !== undefined) { origins.current.set(run.id, attempt.generation); setOriginGenerations(previous => previous[run.id] === attempt.generation ? previous : { ...previous, [run.id]: attempt.generation! }); }
    if (run.case_id === store.getSnapshot().context.caseId) setRuns(previous => {
      const existing = previous.find(item => item.id === run.id);
      if (existing && terminal(existing) && !terminal(run)) return previous;
      return [run, ...previous.filter(item => item.id !== run.id && item.case_id === run.case_id)].sort((a, b) => a.started_at.localeCompare(b.started_at)).slice(-20);
    });
    if (terminal(run) && pendingRef.current?.key === run.request_key) { remember(null); if (timer.current) clearTimeout(timer.current); }
  }
  async function readEvents(run: AssistantRun) {
    try { const result = await api.getAssistantEvents(run.case_id, run.id); if (mounted.current) setEvents(previous => ({ ...previous, [run.id]: result.items })); }
    catch { /* A failed activity read never fabricates events or hides the saved result. */ }
  }
  async function checkResult(attempt = pendingRef.current, automatic = false) {
    if (!attempt || !isPending(attempt.key) || readLock.current) return;
    readLock.current = true; if (!automatic) { setReading(true); setError(''); }
    let repeat = false;
    try {
      const run = await api.getAssistantOperation(attempt.caseId, attempt.key);
      if (!mounted.current || !isPending(attempt.key)) return;
      accept(run, attempt); await readEvents(run); repeat = !terminal(run);
      if (repeat && !automatic) setNotice('The request is still recorded as running. Activity updates continue while it is active.');
    } catch (failure) {
      if (!mounted.current || !isPending(attempt.key)) return;
      if (failure instanceof ApiError && failure.code === 'OPERATION_CANCELLED') {
        remember(null); if (timer.current) clearTimeout(timer.current);
        setNotice('The server confirms this request was cancelled before it started. You can ask a new question.'); return;
      }
      const notFound = failure instanceof ApiError && failure.code === 'ASSISTANT_OPERATION_NOT_FOUND';
      if (automatic && notFound && postInFlight.current === attempt.key) repeat = true;
      else setError(notFound ? 'This request has not been found yet. Check again or cancel this request before asking a new question.' : explain(failure));
    } finally {
      readLock.current = false;
      if (mounted.current) {
        setReading(false);
        if (repeat && isPending(attempt.key) && performance.now() - attempt.started < 135000) timer.current = setTimeout(() => { void checkResult(attempt, true); }, 1800);
        else if (repeat) setNotice('Automatic updates stopped. Check the recorded request to see whether it finished.');
      }
    }
  }
  async function refreshHistory(caseId: string) {
    const generation = ++historyGeneration.current; setHistoryLoading(true);
    try {
      const result = await api.listAssistantRuns(caseId);
      if (!mounted.current || generation !== historyGeneration.current || store.getSnapshot().context.caseId !== caseId) return;
      setRuns(previous => {
        const merged = new Map(result.items.map(run => [run.id, run]));
        for (const run of previous) if (run.case_id === caseId && origins.current.has(run.id) && (!merged.has(run.id) || !terminal(merged.get(run.id)!))) merged.set(run.id, run);
        return [...merged.values()].sort((a, b) => a.started_at.localeCompare(b.started_at)).slice(-20);
      });
      const running = result.items.find(run => run.status === 'running');
      // The elapsed-time origin is captured after the history network response, never during render.
      // eslint-disable-next-line react-hooks/purity
      if (running && !pendingRef.current) { const attempt = { key: running.request_key, caseId, label: 'Recorded request', started: performance.now() }; remember(attempt); void checkResult(attempt, true); }
    } catch (failure) { if (mounted.current && generation === historyGeneration.current) setError(explain(failure)); }
    finally { if (mounted.current && generation === historyGeneration.current) setHistoryLoading(false); }
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => {
    if (snapshot.open && !dialog.current?.open) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLElement>('[data-assistant-title]')?.focus(); }
    else if (!snapshot.open && dialog.current?.open) dialog.current.close();
  }, [snapshot.open]);
  useEffect(() => {
    if (!snapshot.open || !ownerId) return;
    const frame = requestAnimationFrame(() => {
      if (context.caseId) void refreshHistory(context.caseId);
      if (pendingRef.current) void checkResult(pendingRef.current, true);
    });
    return () => cancelAnimationFrame(frame);
    // Each opening and case switch rereads persisted history; local screen edits do not call the model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.open, context.caseId, ownerId]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { if (sticky.current && thread.current) thread.current.scrollTop = thread.current.scrollHeight; });
    return () => cancelAnimationFrame(frame);
  }, [runs, events, pending]);

  async function ask() {
    const live = store.getSnapshot(), scope = live.context;
    if (!ownerId || !scope.caseId || !scope.caseRevision || scope.busy || scope.unavailable || pendingRef.current || historyLoading || questionIssue(question)) return;
    const intent = scope.selectionId ? 'explain_selection' : scope.quoteId ? 'quote_help' : 'explain_comparison';
    const previous = [...runs].reverse().find(run => run.case_id === scope.caseId && run.intent === intent && run.quote_id === (scope.quoteId ?? null) && run.selection_id === (scope.selectionId ?? null) && run.status === 'succeeded' && run.expected_case_revision === scope.caseRevision && run.expected_draft_revision === (scope.draftRevision ?? null) && run.is_current === true);
    const body = requestFor(scope, question, previous);
    // This timestamp is created only by the explicit form-submit handler.
    // eslint-disable-next-line react-hooks/purity
    const attempt: Attempt = { key: crypto.randomUUID(), caseId: scope.caseId, label: scope.label, question: body.message, generation: live.generation, started: performance.now() };
    remember(attempt); setError(''); setNotice(''); setActionError(''); setQuestion(''); sticky.current = true; postInFlight.current = attempt.key;
    timer.current = setTimeout(() => { void checkResult(attempt, true); }, 700);
    try {
      const run = await api.askAssistant(attempt.caseId, body, attempt.key);
      if (!mounted.current || !isPending(attempt.key)) return;
      accept(run, attempt); await readEvents(run);
      if (!terminal(run)) void checkResult(attempt, true);
    } catch (failure) {
      if (!mounted.current || !isPending(attempt.key)) return;
      setError(explain(failure));
      if (failure instanceof ApiError && !failure.outcomeUnknown && !failure.runId) { remember(null); if (timer.current) clearTimeout(timer.current); setQuestionDraft(current => current.caseId === attempt.caseId && !current.text ? { caseId: attempt.caseId, text: body.message } : current); }
      else void checkResult(attempt, true);
    } finally { if (postInFlight.current === attempt.key) postInFlight.current = null; }
  }
  async function cancel() {
    const attempt = pendingRef.current; if (!attempt || cancelLock.current) return;
    cancelLock.current = true; setCancelling(true); setError('');
    try {
      const receipt = await api.cancelAssistant(attempt.caseId, attempt.key);
      if (!mounted.current || !isPending(attempt.key)) return;
      if (receipt.state === 'cancelled') {
        remember(null); if (timer.current) clearTimeout(timer.current); setNotice('The server cancelled this request. Any model work already used still counts toward your allowance.');
        if (receipt.run_id) { const run = await api.getAssistantRun(attempt.caseId, receipt.run_id); accept(run, attempt); await readEvents(run); }
      } else { setNotice('Cancellation was requested. Check the recorded result while the active work stops. Model work already used still counts toward your allowance.'); void checkResult(attempt, true); }
    } catch (failure) { if (mounted.current) setError(explain(failure)); }
    finally { cancelLock.current = false; if (mounted.current) setCancelling(false); }
  }
  function activateAction(action: AssistantAction, run: AssistantRun) {
    const generation = origins.current.get(run.id);
    if (generation === undefined || generation !== store.getSnapshot().generation || run.is_current !== true) { setActionError('The screen or saved inputs changed. Ask again for current actions.'); return; }
    dialog.current?.close(); store.setOpen(false);
    requestAnimationFrame(() => { if (!store.dispatch(action, generation)) { setActionError('This action is no longer available for the current screen. Ask again after checking its saved state.'); store.setOpen(true); } });
  }
  function closeAssistant() {
    store.setOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.assistant-launcher')?.focus());
  }
  async function navigateWorkspace(action: WorkspaceAssistantAction) {
    setNavigationError(''); dialog.current?.close(); store.setOpen(false);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      if (!await store.navigateWorkspace(action)) {
        setNavigationError('Navigation was not completed. Your current work is still here; check the saved case or finish the active operation, then try again.'); store.setOpen(true);
      }
    } catch {
      setNavigationError('This destination could not be opened. Refresh your workspace and try again.'); store.setOpen(true);
    }
  }
  async function copyClarification(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice('Clarification draft copied. Review it before sharing it with the supplier.'); }
    catch { setNotice('Copy was unavailable. You can select and copy the draft text below.'); }
  }
  const shown = runs.filter(run => run.case_id === context.caseId);
  const prompts = context.quoteId ? ['What should I review next?', 'Draft clarification questions for the supplier.'] : context.selectionId ? ['Explain this saved buyer selection.', 'What are the limits of this selection?'] : ['Explain the cost and delivery trade-off.', 'Which saved checks need attention?'];
  const issue = questionIssue(question);
  const sendBlocked = !ownerId || !context.caseId || !context.caseRevision || context.busy || Boolean(context.unavailable) || Boolean(pending) || historyLoading || Boolean(issue);
  const pendingRun = pending && shown.find(run => run.request_key === pending.key);
  const latestEvent = pendingRun ? events[pendingRun.id]?.at(-1)?.message : null;
  return <dialog ref={dialog} className="assistant-drawer" aria-labelledby={id + '-title'} onCancel={event => { event.preventDefault(); closeAssistant(); }} onClose={() => { if (!dialog.current?.open) store.setOpen(false); }}>
    <div className="assistant-layout">
      <header className="assistant-header"><div className="assistant-brand"><AgentAvatar size={44} /><div><h2 id={id + '-title'} data-assistant-title tabIndex={-1}>Luma</h2><p>GreenProcure assistant</p></div></div><button type="button" className="button button-secondary assistant-close" aria-label="Close assistant" onClick={closeAssistant}><Icon name="close" size={18} /></button></header>
      <div className="assistant-toolbar"><button type="button" className="text-link" onClick={() => setView('team')}>Meet the team</button><button type="button" className="text-link" onClick={() => setView('context')}><Icon name="shield" size={15} />What Luma can see</button></div>
      <div className="assistant-main-panel" hidden={view !== 'conversation'}>
        <div className="assistant-modes" role="group" aria-label="Assistant scope"><button type="button" aria-pressed={mode === 'workspace'} onClick={() => setMode('workspace')}><Icon name="grid" size={16} />Workspace</button><button type="button" aria-pressed={mode === 'case'} onClick={() => setMode('case')}><Icon name="fabric" size={16} />Current case</button></div>
        {navigationError && <div className="assistant-navigation-error alert warning-alert" role="alert"><p>{navigationError}</p></div>}
        <WorkspaceNavigator key={ownerId ?? 'public'} api={api} ownerId={ownerId} visible={snapshot.open && view === 'conversation' && mode === 'workspace'} onNavigate={navigateWorkspace} />
        <div className="assistant-case-panel" hidden={mode !== 'case'}>
      <div className="assistant-thread" ref={thread} onScroll={() => { const node = thread.current; if (node) sticky.current = node.scrollHeight - node.scrollTop - node.clientHeight < 70; }}>
        <section className="assistant-context assistant-current-context" aria-label="Assistant screen context"><span className="eyebrow">CURRENT CASE CONTEXT</span><strong>{context.label}</strong>{context.caseRevision && <p>Saved case revision {context.caseRevision}{context.draftRevision !== undefined && context.draftRevision !== null ? ' / Draft ' + context.draftRevision : ''}</p>}{context.dirty && <><span className="status-badge status-warning">Unsaved changes</span><p>Answers use saved records. Your unsaved field values and notes are not sent to Luma.</p></>}{context.busy && <p>Finish or resolve the current operation before starting another request.</p>}{context.unavailable && <p>{context.unavailable}</p>}</section>
        {!context.caseId ? <section className="assistant-empty"><h3>Choose a sourcing case</h3><p>Open any case from the workspace navigator. Luma can then explain its saved quotation gaps, checked terms and buyer selections.</p><button type="button" className="button button-secondary" onClick={() => setMode('workspace')}>Browse workspace cases<Icon name="arrow" size={16} /></button></section> : <>
          <div className="assistant-prompt-list" aria-label="Suggested questions">{prompts.map(prompt => <button key={prompt} className="button button-secondary" type="button" disabled={Boolean(pending)} onClick={() => { setQuestion(prompt); composer.current?.focus(); }}>{prompt}</button>)}</div>
          {historyLoading && <p className="assistant-turn-meta" role="status">Reading saved assistant history...</p>}
          {shown.length === 0 && !historyLoading && <p className="assistant-empty">Ask about the saved evidence on this screen. The assistant can suggest where to go next; you keep control of edits, confirmation and buyer selections.</p>}
        </>}
        {shown.map(run => {
          const result = run.result, runEvents = events[run.id] ?? [];
          const stale = originGenerations[run.id] !== snapshot.generation || run.is_current !== true || context.dirty || context.busy;
          return <article key={run.id} className="assistant-turn"><p className="assistant-question">{run.message}</p><p className="assistant-turn-meta">{screenLabel[run.screen]} / Case revision {run.expected_case_revision} / {statusLabel[run.status]}</p>
            {run.has_unsaved_changes && <p className="assistant-turn-meta">This answer used saved records; browser edits were not read.</p>}
            {result && <><div className="assistant-answer-identity"><AgentAvatar size={26} /><strong>Luma</strong></div><p className="assistant-answer assistant-message">{result.summary}</p><div className="assistant-evidence"><h3>Saved evidence for this answer</h3><dl className="assistant-facts">{result.referenced_fact_ids.map(reference => result.facts.find(fact => fact.id === reference)!).map(fact => <div key={fact.id}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></div>{result.facts.some(fact => !result.referenced_fact_ids.includes(fact.id)) && <details className="assistant-details"><summary>Other saved facts</summary><dl className="assistant-facts">{result.facts.filter(fact => !result.referenced_fact_ids.includes(fact.id)).map(fact => <div key={fact.id}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></details>}
              {result.clarification_draft && <details className="assistant-details"><summary>Supplier clarification draft</summary><p className="assistant-clarification assistant-message">{result.clarification_draft}</p><button className="button button-secondary" type="button" onClick={() => { void copyClarification(result.clarification_draft!); }}>Copy clarification draft</button><p className="assistant-turn-meta">Draft only. Nothing has been sent to the supplier.</p></details>}
              {run.is_current === false && <p className="assistant-turn-meta">Saved inputs changed after this answer. Ask again using the current screen.</p>}{run.is_current === null && <p className="assistant-turn-meta">Current inputs could not be verified. This answer reflects its recorded saved state.</p>}
              {result.actions.length > 0 && <div className="assistant-actions">{stale && <p className="assistant-turn-meta">These actions belong to an earlier screen or saved state. Ask again for current actions.</p>}{result.actions.map((action, index) => <button key={index} className="button button-secondary" type="button" disabled={stale} onClick={() => activateAction(action, run)}>{action.label}<Icon name="arrow" size={16} /></button>)}</div>}
            </>}
            {run.error && <div className="alert error-alert" role="alert"><p>{run.error.message}</p></div>}
            <p className="assistant-turn-meta">{run.model_call_count} recorded model {run.model_call_count === 1 ? 'call' : 'calls'} / {run.tool_call_count} tool {run.tool_call_count === 1 ? 'call' : 'calls'}</p>
            <details className="assistant-details" open={run.status === 'running'}><summary>Recorded assistant activity</summary>{runEvents.length ? <ol className="assistant-events">{runEvents.map(event => <li key={event.sequence}>{event.agent_name && <span className="assistant-event-agent"><AgentAvatar agent={event.agent_name} size={22} />{agentPersonas[event.agent_name].name}</span>}<span>{event.message}</span></li>)}</ol> : <p className="assistant-turn-meta">Activity has not been read in this view.</p>}<button type="button" className="text-link" onClick={() => { void readEvents(run); }}>Read recorded activity</button></details>
          </article>;
        })}
        {pending && <section className="assistant-context" aria-label="Active assistant request">{!pendingRun && pending.question && <p className="assistant-question">{pending.question}</p>}<strong>{pending.caseId === context.caseId ? 'Assistant request in progress' : 'A request for another case is unresolved'}</strong><p role="status" aria-live="polite">{latestEvent ?? 'Checking the recorded request. Closing this panel does not cancel it.'}</p><div className="assistant-recovery"><button type="button" className="button button-secondary" disabled={reading || cancelling} onClick={() => { void checkResult(); }}>{reading ? 'Checking...' : 'Check recorded result'}</button><button type="button" className="button button-secondary" disabled={cancelling} onClick={() => { void cancel(); }}>{cancelling ? 'Requesting cancellation...' : 'Cancel request'}</button></div></section>}
        {error && <div className="alert error-alert" role="alert"><p>{error}</p></div>}{actionError && <div className="alert warning-alert" role="alert"><p>{actionError}</p></div>}{notice && <div className="alert info-alert" role="status"><p>{notice}</p></div>}
      </div>
      <form className="assistant-composer" onSubmit={event => { event.preventDefault(); void ask(); }}><label htmlFor={id + '-question'}>Ask about this saved case</label><textarea ref={composer} id={id + '-question'} value={question} onChange={event => setQuestion(event.target.value)} disabled={!ownerId || !context.caseId} aria-describedby={id + '-allowance'} rows={2} /><div className="assistant-composer-footer"><p id={id + '-allowance'}>{Array.from(question.trim()).length} / 2,000<br />Uses AI allowance.</p><button className="button button-primary" type="submit" disabled={sendBlocked}>Ask assistant<Icon name="arrow" size={16} /></button></div>{question && issue && <p className="field-error">{issue}</p>}</form>
        </div>
      </div>
      <section className="assistant-subview assistant-thread" hidden={view !== 'team'} aria-label="Meet the assistant team"><button type="button" className="text-link assistant-back" onClick={() => setView('conversation')}><Icon name="arrow" size={16} />Back to assistant</button><h3>Meet your sourcing team</h3><p className="assistant-subview-intro">One conversation, with focused help when your task needs it.</p><div className="assistant-team-list">{(Object.entries(agentPersonas) as [AgentPersona, typeof agentPersonas[AgentPersona]][]).map(([key, agent]) => <article className="assistant-team-card" key={key}><AgentAvatar agent={key} size={48} /><div><h4>{agent.name}<span>{agent.role}</span></h4><p>{agent.description}</p></div></article>)}</div><p className="assistant-footnote">The team uses Google agents. Specialist activity appears only when a recorded request actually calls that specialist. You review, confirm and select.</p></section>
      <section className="assistant-subview assistant-thread" hidden={view !== 'context'} aria-label="Assistant context details"><button type="button" className="text-link assistant-back" onClick={() => setView('conversation')}><Icon name="arrow" size={16} />Back to assistant</button><h3>What Luma can see</h3><p className="assistant-subview-intro">Luma uses structured saved records across your private workspace. It does not capture your screen or browser tab.</p><dl className="assistant-scope-facts"><div><dt>Workspace navigation</dt><dd>Your saved case names, revisions and quotation, confirmation and selection counts. You can find a destination from any page.</dd></div><div><dt>Current case answers</dt><dd>Saved requirements and the quotation, comparison or selection you opened. Source references stay tied to their recorded revisions.</dd></div><div><dt>Current location</dt><dd>{context.caseId ? context.label : snapshot.workspace.screen === 'help' ? 'Workspace guide' : snapshot.workspace.screen === 'create' ? 'Create sourcing case' : 'Sourcing workspace'}{context.caseRevision ? ' / Saved revision ' + context.caseRevision : ''}</dd></div><div><dt>Your control</dt><dd>Unsaved field values are not sent. Luma can suggest navigation and saved-record actions; you remain responsible for edits, confirmation and buyer selections.</dd></div></dl>{context.dirty && <div className="alert warning-alert"><p>You have unsaved changes. Navigation keeps the existing save/discard check.</p></div>}<p className="assistant-footnote">Private access follows this browser session. Luma cannot see other users' cases or supplier accounts.</p></section>
    </div>
  </dialog>;
}
