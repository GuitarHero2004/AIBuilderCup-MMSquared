import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import type { User } from 'firebase/auth';
import type { AppConfig } from '../config/environment';
import type { SessionServices } from '../auth/firebase';
import type { CaseCreate, CaseRead } from '../api/types';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';
import { CaseForm } from '../features/cases/CaseForm';
import { CaseDetail } from '../features/cases/CaseDetail';
import { SessionBoundary } from '../auth/sessionBoundary';
import { formatDecimal } from '../features/cases/format';

export function App({ config, services }: { config: AppConfig; services: SessionServices }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cases, setCases] = useState<CaseRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CaseRead | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const detailsRef = useRef<HTMLDivElement>(null);
  const sessionBoundary = useRef(new SessionBoundary());

  useEffect(() => onAuthStateChanged(services.auth, (currentUser) => {
    sessionBoundary.current.enter(currentUser?.uid ?? null);
    setCases([]); setSelected(null); setLoaded(false); setLoading(false);
    setShowForm(false); setSaving(false); setSaveError(null); setUncertain(false);
    setNotice(''); setLoadError(null);
    setUser(currentUser); setAuthReady(true); setAuthError(null);
  }, () => {
    sessionBoundary.current.enter(null); setUser(null); setCases([]); setSelected(null); setLoaded(false); setShowForm(false);
    setAuthError('Your session could not be restored. Reload the page to try again.'); setAuthReady(true);
  }), [services]);

  useEffect(() => {
    let active = true;
    if (!user) return;
    const currentSession = sessionBoundary.current.capture();
    async function loadCases() {
      setLoading(true); setLoadError(null);
      try {
        const result = await services.api.listCases();
        if (active && currentSession()) { setCases(result.items); setLoaded(true); setUncertain(false); }
      } catch (error) {
        if (active && currentSession()) setLoadError(error instanceof ApiError ? error.message : 'Your cases could not be loaded. Please try again.');
      } finally { if (active && currentSession()) setLoading(false); }
    }
    void loadCases();
    return () => { active = false; };
  }, [user, services, refresh]);

  async function startDemo() {
    setSigningIn(true); setAuthError(null);
    try { await signInAnonymously(services.auth); }
    catch { setAuthError(config.environment === 'local' ? 'The local sign-in service could not be reached. Start the Firebase Auth emulator and try again.' : 'We could not start your private session. Check your connection and try again.'); }
    finally { setSigningIn(false); }
  }

  function openForm() { setSaveError(null); setSelected(null); setShowForm(true); setNotice(''); }
  async function save(input: CaseCreate) {
    const currentSession = sessionBoundary.current.capture();
    if (!currentSession()) return;
    setSaving(true); setSaveError(null); setNotice('');
    try {
      const saved = await services.api.createCase(input);
      if (!currentSession()) return;
      setCases((previous) => [saved, ...previous]); setSelected(saved); setShowForm(false);
      setNotice('Case created. Your requirements are saved to your private workspace.');
      requestAnimationFrame(() => detailsRef.current?.focus());
    } catch (error) {
      if (!currentSession()) return;
      setSaveError(error instanceof ApiError ? error.message : 'The save could not be confirmed. Refresh your cases before creating another.');
      if (!(error instanceof ApiError) || ['CONNECTION_FAILED', 'INVALID_RESPONSE'].includes(error.code)) setUncertain(true);
    } finally { if (currentSession()) setSaving(false); }
  }

  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to workspace</a>
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="GreenProcure home"><span className="brand-mark"><Icon name="leaf" size={24} /></span><span>GreenProcure<span className="brand-subtitle">FABRIC SOURCING</span></span></a>
      <p className="nav-label">YOUR WORKSPACE</p>
      <a className="nav-item" href="#main" aria-current="page"><Icon name="grid" size={18} />Sourcing cases<span className="nav-dot" /></a>
      <div className="sidebar-footer"><div className="sidebar-symbol"><Icon name="leaf" size={28} /></div><p>Better decisions<br />begin with clear inputs.</p><span>Vietnam textile & garment SMEs</span></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span className="breadcrumb">Workspace <span>/</span> <strong>Sourcing cases</strong></span><span className="session-chip"><span className={user ? 'status-dot active' : 'status-dot'} />{user ? 'Private demo session' : 'No active session'}</span></header>
      <main id="main" className="main-content">
        <div className="hero"><div><p className="eyebrow">A CONSIDERED START</p><h1>Your next sourcing<br className="desktop-break" /> decision starts here.</h1><p className="hero-copy">Bring the fabric requirements together.<br />Build a clear foundation for comparing supplier offers.</p></div><div className="fabric-art" aria-hidden="true"><div className="fabric-swatch swatch-back" /><div className="fabric-swatch swatch-front"><span>65 / 35</span><small>POLYESTER · COTTON</small></div><div className="swatch-tag">WOVEN COLLECTION <span>01</span></div></div></div>
        <div className="release-banner"><span className="release-icon"><Icon name="leaf" size={18} /></span><div><strong>Foundation preview</strong><span>Create and view sourcing cases. Quote extraction, calculations and comparison are not available yet.</span></div><span className="badge badge-muted">{config.environment === 'local' ? 'Local emulators' : 'Configured services'}</span></div>
        <ol className="journey" aria-label="Sourcing workflow availability"><li className="journey-current"><span className="step-number">01</span><div><strong>Define requirements</strong><span>Available in this build</span></div><Icon name="check" size={18} /></li><li><span className="step-number">02</span><div><strong>Review quotations</strong><span>Not implemented</span></div></li><li><span className="step-number">03</span><div><strong>Compare & decide</strong><span>Not implemented</span></div></li></ol>
        <div className="section-heading"><div><p className="eyebrow">YOUR WORK</p><h2>Sourcing cases {user && loaded && <span className="count-badge">{cases.length}</span>}</h2></div>{user && <div className="section-actions"><button className="button button-text" aria-label="Refresh cases" onClick={() => { setRefresh((value) => value + 1); setNotice(''); }} disabled={loading || saving}><Icon name="refresh" size={16} /><span>{loading ? 'Refreshing…' : 'Refresh'}</span></button><button className="button button-primary" onClick={openForm} disabled={!loaded || loading || saving || cases.length >= 2 || uncertain}><Icon name="plus" size={17} />New case</button></div>}</div>
        <div className="sr-only" role="status" aria-live="polite">{notice}</div>
        {notice && <div className="alert success-alert"><Icon name="check" size={18} />{notice}</div>}
        {!authReady ? <div className="panel empty-state" role="status"><span className="spinner" />Restoring your private session…</div> : !user ? <section className="panel welcome-panel"><div className="welcome-icon"><Icon name="shield" size={28} /></div><div className="welcome-copy"><h3>A workspace of your own</h3><p>Start a private demo to create your first sourcing case. No email or shared account needed.</p><p className="small-copy">Your anonymous session stays in this browser. Clearing browser data or changing devices can lose access.</p>{authError && <div role="alert" className="alert error-alert">{authError}</div>}</div><button className="button button-primary" onClick={() => { void startDemo(); }} disabled={signingIn}>{signingIn ? 'Starting session…' : 'Start private demo'}<Icon name="arrow" size={18} /></button></section> : <>
          {loadError && <div role="alert" className="alert error-alert">{loadError} Use Refresh to try again.</div>}
          {uncertain && <div role="alert" className="alert error-alert">Check your saved cases with Refresh before retrying. The previous request may have succeeded.</div>}
          {loading && !loaded ? <div className="panel empty-state" role="status"><span className="spinner" />Loading your cases…</div> : loaded && cases.length === 0 && !showForm ? <section className="panel empty-state"><div className="empty-icon"><Icon name="fabric" size={28} /></div><h3>A clean slate for a better brief</h3><p>Create a case with the synthetic fabric preset.<br />Set your quantity, delivery window and budget.</p><button className="button button-secondary" onClick={openForm}>Create your first case<Icon name="arrow" size={17} /></button></section> : cases.length > 0 && <div className="case-grid">{cases.map((item) => <button className={`case-card ${selected?.id === item.id ? 'is-selected' : ''}`} key={item.id} onClick={() => { setSelected(item); setShowForm(false); }} aria-pressed={selected?.id === item.id}><div className="case-card-top"><span className="case-icon"><Icon name="fabric" size={21} /></span><span className="badge">Draft</span></div><h3>{item.name}</h3><p>{item.requirement.textile_specification.construction} · Synthetic demo</p><div className="case-metrics"><span><strong>{formatDecimal(item.requirement.quantity)}</strong> metres</span><span><strong>{item.requirement.maximum_lead_time_days}</strong> days maximum</span></div><div className="case-card-bottom"><span>View saved requirements</span><Icon name="arrow" size={18} /></div></button>)}</div>}
          {cases.length >= 2 && <p className="limit-note">This demo allows two cases per visitor. You can still open your saved requirements.</p>}
          {showForm && <CaseForm onSave={save} onCancel={() => setShowForm(false)} busy={saving} error={saveError} uncertain={uncertain} />}
          {selected && <div ref={detailsRef} tabIndex={-1}><CaseDetail item={selected} onClose={() => setSelected(null)} /></div>}
        </>}
        <footer className="workspace-footer"><span><Icon name="shield" size={14} />Requirements stay within your signed-in workspace.</span><span>{config.environment === 'local' && 'Local emulators · '}Synthetic inputs · No live AI in this build</span></footer>
      </main>
    </div>
  </div>;
}
