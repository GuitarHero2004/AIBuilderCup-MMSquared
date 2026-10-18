import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type WorkspaceView = 'workspace' | 'create' | 'detail' | 'quotations' | 'help';

interface Props {
  children: ReactNode;
  view: WorkspaceView;
  caseName?: string;
  session: 'restoring' | 'active' | 'none';
  local: boolean;
  busy: boolean;
  onWorkspace: () => void;
  onHelp: () => void;
}

export function AppShell({ children, view, caseName, session, local, busy, onWorkspace, onHelp }: Props) {
  const scrollport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = scrollport.current;
    if (!node) return;
    // A wrapped topbar changes the available height at enlarged text sizes.
    const observer = new ResizeObserver(() => {
      node.style.setProperty('--workspace-scroll-height', `${node.clientHeight}px`);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const current = view === 'create' ? 'Create case' : view === 'detail' || view === 'quotations' ? caseName : view === 'help' ? 'Workspace guide' : 'Sourcing cases';
  return <div className="app-shell">
    <a href="#main" className="skip-link">Skip to main content</a>
    <aside className="sidebar">
      <button type="button" className="brand" onClick={onWorkspace} disabled={busy} aria-label="GreenProcure workspace">
        <span className="brand-mark"><Icon name="leaf" size={24} /></span>
        <span>GreenProcure<span className="brand-subtitle">Fabric sourcing</span></span>
      </button>
      <nav className="primary-nav" aria-label="Main navigation">
        <span className="nav-label">WORKSPACE</span>
        <button type="button" className="nav-item" aria-current={view !== 'help' ? 'page' : undefined} onClick={onWorkspace} disabled={busy}><Icon name="grid" size={19} />Workspace</button>
        <button type="button" className="nav-item" aria-current={view === 'help' ? 'page' : undefined} onClick={onHelp} disabled={busy}><Icon name="help" size={19} />Help</button>
      </nav>
      <div className="sidebar-footer"><Icon name="shield" size={19} /><div><strong>Private demo</strong><p>Your cases belong to this browser’s session.</p></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar">
        <nav aria-label="Breadcrumb" className="breadcrumb"><button type="button" onClick={onWorkspace} disabled={busy}>Workspace</button><Icon name="chevron" size={14} /><span aria-current="page">{current}</span></nav>
        <div className="assistant-topbar-actions"><span className="session-chip"><span className={`status-dot ${session === 'active' ? 'active' : ''}`} />{session === 'active' ? 'Private session' : session === 'restoring' ? 'Restoring session' : 'No active session'}</span></div>
      </header>
      <div className="workspace-scroll" ref={scrollport}>
        <main id="main" className="main-content" tabIndex={-1}>{children}</main>
        <footer className="workspace-footer"><span>Synthetic demo · Private sourcing workspace</span><span>{local ? 'Local preview' : 'GreenProcure'}</span></footer>
      </div>
    </div>
  </div>;
}
