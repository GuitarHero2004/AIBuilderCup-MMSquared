import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ApiError } from '../../api/client';
import type { ApiClient } from '../../api/client';
import type { WorkspaceAssistantAction, WorkspaceAssistantSnapshot, WorkspaceNavigationResult } from '../../api/types';
import { Icon } from '../../components/Icon';
import { AgentAvatar } from './AgentAvatar';
import { useAssistantSnapshot, useAssistantStore } from './context';

const globalAction = (kind: 'open_workspace' | 'open_help' | 'create_case', label: string): WorkspaceAssistantAction => ({ id: kind, kind, label, case_id: null, expected_case_revision: null });
const recoverKey = (owner: string | null) => {
  if (!owner) return null;
  try { const key = sessionStorage.getItem('greenprocure:luma-navigation:' + owner); return key && /^[A-Za-z0-9_-]{8,100}$/.test(key) ? key : null; } catch { return null; }
};
const failureMessage = (failure: unknown) => failure instanceof ApiError ? failure.message : 'Luma could not read the workspace result. Check the same request before asking again.';
function questionIssue(value: string) {
  const text = value.trim();
  if (!text || !/[^\s\p{Cf}]/u.test(text)) return 'Enter a question about your workspace.';
  if (Array.from(text).length > 2000) return 'Keep your question within 2,000 characters.';
  if (Array.from(text).some(character => { const code = character.codePointAt(0)!; return code < 32 && code !== 9 && code !== 10 || code === 127; })) return 'Remove unsupported control characters.';
  return null;
}
const requestStatus: Record<WorkspaceNavigationResult['status'], string> = { running: 'Finding a workspace destination', succeeded: 'Navigation suggestions ready', failed: 'Request failed', cancelled: 'Request cancelled', timed_out: 'Request timed out', interrupted: 'Request interrupted' };

export function WorkspaceNavigator({ api, ownerId, visible, onNavigate }: { api: ApiClient; ownerId: string | null; visible: boolean; onNavigate: (action: WorkspaceAssistantAction) => Promise<void> }) {
  const store = useAssistantStore(), snapshot = useAssistantSnapshot();
  const [workspace, setWorkspace] = useState<WorkspaceAssistantSnapshot | null>(null);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [question, setQuestion] = useState(''), [asked, setAsked] = useState('');
  const [result, setResult] = useState<WorkspaceNavigationResult | null>(null);
  const [pending, setPending] = useState<string | null>(() => recoverKey(ownerId));
  const [reading, setReading] = useState(false), [cancelling, setCancelling] = useState(false), [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState('');
  const alive = useRef(true), pendingRef = useRef(pending), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postInFlight = useRef(false), readLock = useRef(false), cancelLock = useRef(false), elapsed = useRef(0), loadGeneration = useRef(0);
  const composer = useRef<HTMLTextAreaElement>(null), id = useId();
  function remember(key: string | null) {
    pendingRef.current = key; setPending(key);
    if (!ownerId) return;
    try { if (key) sessionStorage.setItem('greenprocure:luma-navigation:' + ownerId, key); else sessionStorage.removeItem('greenprocure:luma-navigation:' + ownerId); } catch { /* In-memory recovery remains available. */ }
  }
  const refresh = useCallback(async () => {
    if (!ownerId) return;
    const generation = ++loadGeneration.current; setLoading(true); setError('');
    try { const data = await api.getAssistantWorkspace(); if (alive.current && generation === loadGeneration.current) setWorkspace(data); }
    catch (failure) { if (alive.current && generation === loadGeneration.current) setError(failureMessage(failure)); }
    finally { if (alive.current && generation === loadGeneration.current) setLoading(false); }
  }, [api, ownerId]);
  function accept(data: WorkspaceNavigationResult) {
    if (!alive.current || data.request_key !== pendingRef.current) return;
    setResult(data);
    if (data.status !== 'running') { remember(null); if (timer.current) clearTimeout(timer.current); }
  }
  async function check(key = pendingRef.current, automatic = false) {
    if (!key || key !== pendingRef.current || readLock.current) return;
    readLock.current = true; if (!automatic) { setReading(true); setError(''); }
    let repeat = false;
    try {
      const data = await api.getAssistantWorkspaceOperation(key);
      if (!alive.current || key !== pendingRef.current) return;
      accept(data); repeat = data.status === 'running';
    } catch (failure) {
      if (!alive.current || key !== pendingRef.current) return;
      if (automatic && postInFlight.current && failure instanceof ApiError && (failure.code === 'ASSISTANT_OPERATION_NOT_FOUND' || failure.code === 'HTTP_404')) repeat = true;
      else setError(failureMessage(failure));
    } finally {
      readLock.current = false;
      if (alive.current) {
        setReading(false);
        if (repeat && key === pendingRef.current && performance.now() - elapsed.current < 135000) timer.current = setTimeout(() => { void check(key, true); }, 1800);
        else if (repeat) setNotice('Automatic updates stopped. Check the recorded request to see whether it finished.');
      }
    }
  }
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => {
    if (!visible || !ownerId) return;
    const frame = requestAnimationFrame(() => {
      void refresh();
      if (pendingRef.current) { elapsed.current = performance.now(); void check(pendingRef.current, true); }
    });
    return () => cancelAnimationFrame(frame);
    // Opening refreshes persisted workspace data; typing never calls the model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ownerId, snapshot.generation, refresh]);
  async function ask() {
    const live = store.getSnapshot();
    if (!ownerId || !workspace || pendingRef.current || loading || live.workspace.loading || live.workspace.busy || live.context.busy || questionIssue(question)) return;
    const text = question.trim(), key = crypto.randomUUID();
    remember(key); setAsked(text); setQuestion(''); setResult(null); setError(''); setNotice(''); postInFlight.current = true;
    elapsed.current = performance.now();
    timer.current = setTimeout(() => { void check(key, true); }, 700);
    try {
      const data = await api.navigateAssistantWorkspace({ message: text, expected_workspace_fingerprint: workspace.workspace_fingerprint, screen: snapshot.context.caseId ? snapshot.context.screen : snapshot.workspace.screen }, key);
      if (!alive.current || key !== pendingRef.current) return;
      accept(data); if (data.status === 'running') void check(key, true);
    } catch (failure) {
      if (!alive.current || key !== pendingRef.current) return;
      setError(failureMessage(failure));
      if (failure instanceof ApiError && !failure.outcomeUnknown && !failure.runId) { remember(null); if (timer.current) clearTimeout(timer.current); setQuestion(current => current || text); }
      else void check(key, true);
    } finally { postInFlight.current = false; }
  }
  async function cancel() {
    const key = pendingRef.current; if (!key || cancelLock.current) return;
    cancelLock.current = true; setCancelling(true); setError('');
    try { const data = await api.cancelAssistantWorkspace(key); if (!alive.current || key !== pendingRef.current) return; accept(data); if (data.status === 'running') void check(key, true); }
    catch (failure) { if (alive.current) setError(failureMessage(failure)); }
    finally { cancelLock.current = false; if (alive.current) setCancelling(false); }
  }
  async function start() {
    setStarting(true); setError('');
    try { await store.startSession(); } catch (failure) { if (alive.current) setError(failureMessage(failure)); }
    finally { if (alive.current) setStarting(false); }
  }
  const length = Array.from(question.trim()).length;
  const issue = questionIssue(question);
  const blocked = !ownerId || !workspace || loading || snapshot.workspace.loading || Boolean(pending) || Boolean(issue) || snapshot.workspace.busy || snapshot.context.busy;
  return <div className="assistant-workspace-panel" hidden={!visible}>
    <div className="assistant-thread">
      <section className="assistant-welcome"><span className="eyebrow">YOUR WORKSPACE, IN REACH</span><h3>Where would you like to go?</h3><p>Find any saved case and move between its requirements, quotations, comparison and selections.</p></section>
      <div className="assistant-shortcuts" aria-label="Workspace shortcuts">
        <button type="button" className="button button-secondary" onClick={() => { void onNavigate(globalAction('open_workspace', 'Open workspace')); }}><Icon name="grid" size={16} />Open workspace</button>
        <button type="button" className="button button-secondary" onClick={() => { void onNavigate(globalAction('open_help', 'Open Help')); }}><Icon name="help" size={16} />Open Help</button>
        {ownerId && <button type="button" className="button button-secondary" disabled={!snapshot.workspace.canCreate || snapshot.workspace.busy} onClick={() => { void onNavigate(globalAction('create_case', 'Create sourcing case')); }}><Icon name="plus" size={16} />Create sourcing case</button>}
      </div>
      {ownerId && !snapshot.workspace.canCreate && <p className="assistant-shortcut-note">{workspace && workspace.cases.length >= 2 ? '2 of 2 demo cases used. Open a saved case to continue.' : snapshot.workspace.busy ? 'Finish or resolve the active operation before creating a case.' : snapshot.workspace.loading || loading ? 'Checking your workspace...' : 'Refresh your workspace before creating a case.'}</p>}
      {!ownerId ? <section className="assistant-context"><h3>Start your private workspace</h3><p>Luma can read the cases saved in this browser's private session once you start it.</p><button type="button" className="button button-primary" disabled={starting || snapshot.workspace.loading} onClick={() => { void start(); }}>{starting ? 'Starting session...' : 'Start private session'}</button></section> : <>
        <div className="assistant-section-heading"><h3>Your sourcing cases{workspace ? ' (' + workspace.cases.length + ')' : ''}</h3><button type="button" className="text-link" disabled={loading} onClick={() => { void refresh(); }}><Icon name="refresh" size={15} />{loading ? 'Refreshing...' : 'Refresh cases'}</button></div>
        {loading && !workspace && <p className="assistant-turn-meta" role="status">Reading your saved workspace...</p>}
        {workspace?.cases.length === 0 && <p className="assistant-empty">Your workspace is ready. Create a sourcing case to add requirements and supplier quotations.</p>}
        <div className="assistant-case-list">{workspace?.cases.map(item => <article className="assistant-case-card" key={item.id} aria-label={item.name}><h4>{item.name}</h4><p>{item.quotation_count} quotations / {item.confirmed_count} confirmed / {item.selection_count} saved selections</p><div className="assistant-case-links">{(['open_case', 'open_intake', 'open_comparison', 'open_history'] as const).map((kind, index) => {
          const action = workspace.actions.find(candidate => candidate.kind === kind && candidate.case_id === item.id);
          return action && <button key={kind} type="button" onClick={() => { void onNavigate(action); }}>{['Requirements', 'Quotations', 'Comparison', 'Saved selections'][index]}<Icon name="chevron" size={13} /></button>;
        })}</div></article>)}</div>
        <div className="assistant-prompt-list" aria-label="Suggested workspace questions">{['Show my saved selections.', 'Take me to my quotations.'].map(prompt => <button key={prompt} className="button button-secondary" type="button" disabled={Boolean(pending)} onClick={() => { setQuestion(prompt); composer.current?.focus(); }}>{prompt}</button>)}</div>
      </>}
      {(asked || result) && <article className="assistant-turn">{asked && <p className="assistant-question">{asked}</p>}{result && <><div className="assistant-answer-identity"><AgentAvatar size={26} /><strong>Luma</strong><span>{requestStatus[result.status]}</span></div>{result.summary && <p className="assistant-answer assistant-message">{result.summary}</p>}{result.error && <div className="alert error-alert" role="alert"><p>{result.error.message}</p></div>}{result.is_current === false && <p className="assistant-turn-meta">Your workspace changed. Refresh cases and ask again for current suggestions.</p>}<div className="assistant-actions">{result.actions.map(action => <button type="button" className="button button-secondary" key={action.id} disabled={result.is_current !== true} onClick={() => { void onNavigate(action); }}>{action.label}<Icon name="arrow" size={16} /></button>)}</div><p className="assistant-turn-meta">{result.model_call_count} recorded model {result.model_call_count === 1 ? 'call' : 'calls'}. Navigation changes your view; it does not edit or approve records.</p></>}</article>}
      {pending && <section className="assistant-context" aria-label="Active workspace request"><strong>Luma is finding your next step</strong><p role="status">Checking the saved navigation request. Closing this panel does not cancel it.</p><div className="assistant-recovery"><button type="button" className="button button-secondary" disabled={reading || cancelling} onClick={() => { void check(); }}>{reading ? 'Checking...' : 'Check navigation result'}</button><button type="button" className="button button-secondary" disabled={cancelling} onClick={() => { void cancel(); }}>{cancelling ? 'Requesting cancellation...' : 'Cancel navigation request'}</button></div></section>}
      {(error || snapshot.workspace.error) && <div className="alert error-alert" role="alert"><p>{error || snapshot.workspace.error}</p></div>}{notice && <div className="alert info-alert" role="status"><p>{notice}</p></div>}
    </div>
    <form className="assistant-composer" onSubmit={event => { event.preventDefault(); void ask(); }}><label htmlFor={id + '-question'}>Ask across your workspace</label><textarea id={id + '-question'} ref={composer} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Find a case or tell Luma where to take you..." disabled={!ownerId} rows={2} aria-describedby={id + '-scope'} /><div className="assistant-composer-footer"><p id={id + '-scope'}>{length} / 2,000 / Uses AI allowance.<br />Saved workspace records. No screenshots.</p><button className="button button-primary" type="submit" disabled={blocked}>Ask Luma<Icon name="arrow" size={16} /></button></div>{question && issue && <p className="field-error">{issue}</p>}</form>
  </div>;
}
