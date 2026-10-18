import { useCallback, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { AppConfig } from '../config/environment';
import type { SessionServices } from '../auth/firebase';
import type { WorkspaceAssistantAction, AssistantAction, CaseCreate, CaseRead } from '../api/types';
import { ApiError } from '../api/client';
import { AppShell } from '../components/AppShell';
import type { WorkspaceView } from '../components/AppShell';
import { DiscardDialog } from '../components/DiscardDialog';
import { Icon } from '../components/Icon';
import { CaseForm } from '../features/cases/CaseForm';
import { CaseDetail } from '../features/cases/CaseDetail';
import { CaseList } from '../features/cases/CaseList';
import { demoDefaults } from '../features/cases/form';
import type { CaseFormValues } from '../features/cases/form';
import { SessionBoundary } from '../auth/sessionBoundary';
import { Help } from './Help';
import { AssistantProvider } from '../features/assistant/AssistantProvider';
import { AssistantScope } from '../features/assistant/AssistantScope';
import { AssistantWorkspaceBridge } from '../features/assistant/AssistantWorkspaceBridge';
import { ConnectedQuotations } from '../features/connected-quotations/ConnectedQuotations';
import type { QuotationNavigationGuard } from '../features/connected-quotations/ConnectedQuotations';

export function App({ config, services }: { config: AppConfig; services: SessionServices }) {
  const [assistantTarget, setAssistantTarget] = useState<AssistantAction | WorkspaceAssistantAction | null>(null);
  const quotationNavigation = useRef<QuotationNavigationGuard>(null);
  const [quotationBusy, setQuotationBusy] = useState(false);
  const [view, setView] = useState<WorkspaceView>('workspace');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CaseRead | null>(null);
  const updateCase = useCallback((item: CaseRead) => { setSelected(item); setCases(previous => previous.map(existing => existing.id === item.id ? item : existing)); }, []);
  const [draft, setDraft] = useState<CaseFormValues | null>(null);
  const [initialDraft, setInitialDraft] = useState<CaseFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [reconciled, setReconciled] = useState(false);
  const [notice, setNotice] = useState('');
  const [navigationError, setNavigationError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [pendingView, setPendingView] = useState<WorkspaceView | null>(null);
  const pendingAssistantNavigation = useRef<(() => void) | null>(null);
  const sessionBoundary = useRef(new SessionBoundary());
  const savingRequest = useRef<symbol | null>(null);
  const signInRequest = useRef<symbol | null>(null);
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(initialDraft);

  useEffect(() => onAuthStateChanged(services.auth, (currentUser) => {
    sessionBoundary.current.enter(currentUser?.uid ?? null);
    savingRequest.current = null; pendingAssistantNavigation.current = null; setNavigationError('');
    setAssistantTarget(null); setQuotationBusy(false); setCases([]); setSelected(null); setLoaded(false); setLoading(false);
    setDraft(null); setInitialDraft(null); setPendingView(null); setView('workspace');
    setSaving(false); setSaveError(null); setUncertain(false); setReconciled(false);
    setNotice(''); setLoadError(null);
    setUser(currentUser); setAuthReady(true); setAuthError(null);
  }, () => {
    sessionBoundary.current.enter(null); savingRequest.current = null; pendingAssistantNavigation.current = null; setNavigationError('');
    setAssistantTarget(null); setUser(null); setCases([]); setSelected(null); setLoaded(false); setLoading(false);
    setDraft(null); setInitialDraft(null); setPendingView(null); setView('workspace');
    setSaving(false); setSaveError(null); setUncertain(false); setReconciled(false); setNotice(''); setLoadError(null);
    setAuthError('Your private session could not be restored. Reload the page to try again.'); setAuthReady(true);
  }), [services]);

  useEffect(() => {
    let active = true;
    if (!user) return;
    const currentSession = sessionBoundary.current.capture();
    async function loadCases() {
      setLoading(true); setLoadError(null);
      try {
        const result = await services.api.listCases();
        if (active && currentSession()) {
          setCases(result.items); setLoaded(true); setUncertain(false);
        }
      } catch (error) {
        if (active && currentSession()) setLoadError(error instanceof ApiError ? error.message : 'Your cases could not be loaded. Please try again.');
      } finally { if (active && currentSession()) setLoading(false); }
    }
    void loadCases();
    return () => { active = false; };
  }, [user, services, refresh]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-page-title]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [view, selected?.id, authReady, user?.uid]);

  useEffect(() => {
    if (!dirty && !saving && !uncertain) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, saving, uncertain]);

  async function startDemo() {
    if (signInRequest.current) return;
    const request = Symbol(); signInRequest.current = request;
    setSigningIn(true); setAuthError(null);
    try { await signInAnonymously(services.auth); }
    catch { setAuthError('We could not start your private session. Check your connection and try again.'); }
    finally { if (signInRequest.current === request) { signInRequest.current = null; setSigningIn(false); } }
  }

  function navigate(next: WorkspaceView) {
    if (savingRequest.current || next === view) return;
    if (view === 'quotations' && quotationNavigation.current) { quotationNavigation.current(() => { setNotice(''); setView(next); }); return; }
    if (view === 'create' && (dirty || uncertain)) { setPendingView(next); return; }
    if (view === 'create') { setDraft(null); setInitialDraft(null); }
    setNotice(''); setView(next);
  }

  function openForm() {
    if (!loaded || loading || loadError || savingRequest.current || cases.length >= 2 || uncertain) return;
    if (!draft) { const defaults = demoDefaults(); setInitialDraft(defaults); setDraft(defaults); }
    setSaveError(null); setSelected(null); setNotice(''); setView('create');
  }

  function refreshCases() {
    if (savingRequest.current || loading) return;
    setLoading(true); setRefresh((value) => value + 1); setNotice('');
  }

  function checkSavedCases() {
    setReconciled(true); setView('workspace'); refreshCases();
  }

  async function save(input: CaseCreate) {
    const currentSession = sessionBoundary.current.capture();
    if (!currentSession() || savingRequest.current || uncertain || !loaded || cases.length >= 2) return;
    const request = Symbol(); savingRequest.current = request;
    setSaving(true); setSaveError(null); setNotice('');
    try {
      const saved = await services.api.createCase(input);
      if (!currentSession()) return;
      setCases((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
      setSelected(saved); setDraft(null); setInitialDraft(null); setReconciled(false); setView('detail');
      setNotice('Case created. Your requirements are saved to your private workspace.');
    } catch (error) {
      if (!currentSession()) return;
      setSaveError(error instanceof ApiError ? error.message : 'The save could not be confirmed. Check saved cases before trying again.');
      if (!(error instanceof ApiError) || error.outcomeUnknown) setUncertain(true);
    } finally {
      if (currentSession() && savingRequest.current === request) { savingRequest.current = null; setSaving(false); }
    }
  }

  async function navigateAssistantWorkspace(action: WorkspaceAssistantAction, stillCurrent: () => boolean): Promise<boolean> {
    if (savingRequest.current || quotationBusy || signingIn || uncertain) return false;
    setNavigationError('');
    const currentSession = sessionBoundary.current.capture();
    const guarded = (next: WorkspaceView, proceed: () => void) => {
      if (view === 'quotations' && quotationNavigation.current) { quotationNavigation.current(proceed); return; }
      if (view === 'create' && dirty) { pendingAssistantNavigation.current = proceed; setPendingView(next); return; }
      if (view === 'create' && next !== 'create') { setDraft(null); setInitialDraft(null); }
      proceed();
    };
    if (action.kind === 'open_workspace' || action.kind === 'open_help') {
      const next = action.kind === 'open_help' ? 'help' : 'workspace';
      if (view !== next) guarded(next, () => { setNotice(''); setView(next); });
      return true;
    }
    if (!user || !currentSession()) return false;
    if (action.kind === 'create_case') {
      if (!loaded || loading || loadError || cases.length >= 2) return false;
      if (view !== 'create') guarded('create', openForm);
      return true;
    }
    if (!action.case_id || action.expected_case_revision === null) return false;
    try {
      const fresh = await services.api.getCase(action.case_id);
      if (!currentSession() || !stillCurrent()) return false;
      if (fresh.data_revision !== action.expected_case_revision) {
        setNavigationError("This case changed. Refresh Luma's workspace overview before opening that destination.");
        return false;
      }
      const next = action.kind === 'open_case' ? 'detail' : 'quotations';
      const openDestination = () => {
        if (!currentSession()) return;
        setCases(previous => [fresh, ...previous.filter(item => item.id !== fresh.id)]);
        setSelected(fresh); setNotice('');
        setAssistantTarget(next === 'quotations' ? action : null); setView(next);
      };
      // A same-case quotation target runs the child's guard once, when it consumes the target.
      // Crossing cases leaves that component, so the outer guard must protect its edits first.
      if (view === 'quotations' && next === 'quotations' && selected?.id === fresh.id) openDestination();
      else guarded(next, openDestination);
      return true;
    } catch (failure) {
      if (currentSession()) setNavigationError(failure instanceof ApiError ? failure.message : "This destination could not be checked. Refresh Luma's workspace overview and try again.");
      return false;
    }
  }

  const createDisabled = !loaded || loading || !!loadError || cases.length >= 2 || uncertain;
  const creationNote = uncertain ? 'Check the previous save before creating another case.'
    : loadError ? 'Refresh your saved cases before creating another.'
      : loading || !loaded ? 'Checking your available case slots...'
        : cases.length >= 2 ? '2 of 2 demo cases used. Open a saved case to continue.'
          : `${cases.length} of 2 demo cases used`;

  return <AssistantProvider key={user?.uid ?? 'signed-out'} api={services.api} ownerId={user?.uid ?? null}><AppShell view={view} caseName={selected?.name} session={!authReady ? 'restoring' : user ? 'active' : 'none'} local={config.environment === 'local'} busy={saving || quotationBusy} onWorkspace={() => navigate('workspace')} onHelp={() => navigate('help')}>
    <AssistantWorkspaceBridge workspace={{ authenticated: Boolean(user), loading: !authReady || signingIn || loading, busy: saving || quotationBusy || uncertain || signingIn, canCreate: Boolean(user) && !createDisabled, error: authError ?? loadError, screen: view === 'help' ? 'help' : view === 'create' ? 'create' : view === 'detail' ? 'case' : view === 'quotations' ? 'intake' : 'workspace' }} onNavigate={navigateAssistantWorkspace} onStartSession={startDemo} />
    <AssistantScope context={{ screen: view === 'detail' ? 'case' : 'workspace', label: view === 'detail' && selected ? selected.name + ' / Requirements' : view === 'create' ? 'Unsaved sourcing case' : view === 'help' ? 'Workspace guide' : 'Sourcing workspace', caseId: user && selected && ['detail', 'quotations'].includes(view) ? selected.id : null, caseRevision: user && selected && ['detail', 'quotations'].includes(view) ? selected.data_revision : null, dirty, busy: saving || quotationBusy, unavailable: uncertain ? 'Resolve the unconfirmed case save before asking about its saved state.' : undefined }} stateKey={JSON.stringify(draft)} handle={action => {
      if (view !== 'detail' || !selected || action.case_id !== selected.id || action.expected_case_revision !== selected.data_revision) return false;
      setAssistantTarget(action); setView('quotations'); return true;
    }} />
    {navigationError && <div className="alert error-alert" role="alert">{navigationError}</div>}
    <div className="sr-only" role="status" aria-live="polite">{notice}</div>
    {notice && view !== 'detail' && <div className="alert success-alert"><Icon name="check" size={18} />{notice}</div>}
    {view === 'help' ? <Help onBack={() => navigate('workspace')} /> : view === 'create' && user && draft ? <>
      {uncertain && <section className="alert warning-alert recovery-panel" aria-label="Unconfirmed save"><div><strong>Check whether your case was saved</strong><p>The response did not confirm the outcome. Your draft is retained. Check saved cases before trying again.</p></div><button type="button" className="button button-secondary" onClick={checkSavedCases}>Check saved cases</button></section>}
      <CaseForm values={draft} onChange={setDraft} onSave={save} onCancel={() => uncertain ? checkSavedCases() : navigate('workspace')} busy={saving} error={saveError} uncertain={uncertain} />
    </> : view === 'quotations' && user && selected ? <ConnectedQuotations key={user.uid + ':' + selected.id} api={services.api} ownerId={user.uid} item={selected} onBack={() => setView('detail')} onCaseChanged={updateCase} navigationGuardRef={quotationNavigation} onBusy={setQuotationBusy} assistantTarget={assistantTarget} onAssistantTargetConsumed={() => setAssistantTarget(null)} /> : view === 'detail' && user && selected ? <CaseDetail item={selected} onClose={() => navigate('workspace')} onQuotations={() => { setNotice(''); setView('quotations'); }} /> : <>
      <div className="page-heading workspace-heading">
        <div className="page-heading-copy"><p className="eyebrow">YOUR WORKSPACE</p><h1 tabIndex={-1} data-page-title>Sourcing cases</h1><p className="page-intro">Manage requirements, review quotations and record your selection.</p></div>
        {user && <div className="page-actions"><button type="button" className="button button-primary" onClick={openForm} disabled={createDisabled} aria-describedby="case-allowance"><Icon name="plus" size={17} />{draft ? 'Resume unsaved draft' : 'Create sourcing case'}</button><p id="case-allowance" className="page-action-note">{creationNote}</p></div>}
      </div>
      {!authReady ? <div className="panel empty-state" role="status"><span className="spinner" />Restoring your private session…</div> : !user ? <section className="panel welcome-panel workspace-welcome"><span className="empty-icon"><Icon name="shield" size={30} /></span><h2>Start with your order requirements</h2><p>Compare two fictional fabric offers using the built-in example PDFs. Gemini reads the documents; you review the evidence, compare cost and delivery, and save your choice. No email account or files needed.</p><button type="button" className="button button-primary" onClick={() => { void startDemo(); }} disabled={signingIn}>{signingIn ? 'Starting session…' : 'Start private demo'}<Icon name="arrow" size={18} /></button><p className="session-note">Your session stays in this browser. Clearing browser data or changing devices can lose access.</p>{authError && <div role="alert" className="alert error-alert">{authError}</div>}</section> : <>
        <div className="list-heading workspace-list-heading">
          <div className="list-heading-copy"><h2 id="saved-cases-title">Saved cases{loaded && <span className="count-badge">{cases.length}</span>}</h2><p>Open a case to continue your sourcing work.</p></div>
          <div className="list-actions"><button type="button" className="button button-secondary" onClick={refreshCases} disabled={loading} aria-label="Refresh cases" aria-controls="saved-case-results"><Icon name="refresh" size={17} />{loading ? 'Refreshing...' : 'Refresh'}</button></div>
        </div>
        <div id="saved-case-results" className="case-results" role="region" aria-labelledby="saved-cases-title" aria-busy={loading}>
        {loadError && <div role="alert" className="alert error-alert recovery-panel"><div><strong>Cases could not be refreshed</strong><p>{loadError}</p>{loaded && <p>The list below shows the last successfully loaded cases.</p>}</div><button type="button" className="button button-secondary" onClick={refreshCases} disabled={loading}>Retry loading cases</button></div>}
        {uncertain && <div role="alert" className="alert warning-alert recovery-panel"><div><strong>The previous save is unconfirmed</strong><p>Refresh your saved cases before creating another. The request may have succeeded.</p></div><button type="button" className="button button-secondary" onClick={refreshCases} disabled={loading}>Check saved cases</button></div>}
        {reconciled && !uncertain && !loading && !loadError && <div className="alert info-alert recovery-panel"><div><strong>Check the list for your saved case</strong><p>Your draft is retained. If the case is listed, open its requirements and discard the draft. Otherwise, you can resume it{cases.length >= 2 ? ' when a case slot is available' : ''}.</p></div>{draft && <button type="button" className="button button-secondary" onClick={() => setPendingView('workspace')}>Discard draft</button>}</div>}
        {loading && <div className="loading-line" role="status"><span className="spinner" />{loaded ? 'Refreshing saved cases…' : 'Loading your cases…'}</div>}
        {loaded && cases.length > 0 ? <CaseList items={cases} onOpen={(item) => { setSelected(item); setNotice(''); setView('detail'); }} /> : loaded && !loading && !loadError ? <section className="panel workspace-empty">
          <span className="empty-icon"><Icon name="fabric" size={25} /></span>
          <div className="workspace-empty-copy"><h3>No sourcing cases yet</h3><p>Start with an order brief. Then add quotation PDFs, review the terms and compare your options in one place.</p>
            <ol className="workspace-start-steps" aria-label="Sourcing workflow"><li><span>1</span>Set requirements</li><li><span>2</span>Review quotations</li><li><span>3</span>Compare and select</li></ol>
            <p className="small-copy">Choose <strong>Create sourcing case</strong> to begin. Built-in synthetic quotations are available inside each case.</p>
          </div>
        </section> : null}
        </div>
      </>}
      <aside className="workspace-guide-link"><Icon name="help" size={20} /><div><h2>New to GreenProcure?</h2><p>Follow the workflow from your first brief to a saved buyer selection.</p></div><button type="button" className="text-link" onClick={() => navigate('help')}>Open guide<Icon name="arrow" size={15} /></button></aside>
    </>}
    {pendingView !== null && <DiscardDialog uncertain={uncertain} editing={view === 'create'} onKeep={() => { pendingAssistantNavigation.current = null; setPendingView(null); }} onDiscard={() => {
      const proceed = pendingAssistantNavigation.current; pendingAssistantNavigation.current = null;
      setDraft(null); setInitialDraft(null); setSaveError(null); setReconciled(false); setPendingView(null);
      if (proceed) proceed(); else setView(pendingView);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-page-title]')?.focus());
    }} />}
  </AppShell></AssistantProvider>;
}
