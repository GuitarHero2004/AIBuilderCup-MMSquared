import { useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { QuotationIntake } from '../features/quotations/QuotationIntake';
import { QuotationReviewPreview } from './QuotationReviewPreview';
import type { IntakeQuotation } from '../features/quotations/types';
import { fixtureQuote, previewCase, previewLimits, previewSamples, scenarios, scenarioState } from './quotationFixtures';
import type { Scenario } from './quotationFixtures';

export function QuotationPreview() {
  const [scenario, setScenario] = useState<Scenario>('empty');
  const [state, setState] = useState(() => scenarioState('empty'));
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [notice, setNotice] = useState('Choose a file or a synthetic example to explore the flow.');
  const [reviewQuote, setReviewQuote] = useState<IntakeQuotation | null>(null);
  const [reviewSessions, setReviewSessions] = useState<IntakeQuotation[]>([]);
  const requirementsDialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const sequence = useRef(0);
  const running = state.collection.quotations.find((quote) => quote.processingStatus === 'running');

  function reset(next: Scenario) {
    setScenario(next);
    setReviewSessions([]);
    setReviewQuote(null);
    setState(scenarioState(next));
    setSelectionResetKey((key) => key + 1);
    setNotice('Scenario reset. Previous selections and simulated records were cleared.');
  }

  function beginTransfer(quote: IntakeQuotation) {
    if (state.transfer.status !== 'idle' && state.transfer.status !== 'error') return;
    if (state.collection.status !== 'ready' || state.collection.quotations.length >= previewLimits.maxQuotes) return;
    setState({ ...state, transfer: { status: 'uploading' }, pending: quote });
    setNotice('Simulation paused at upload. Choose an outcome in the preview controls. No file was sent.');
    titleRef.current?.focus();
  }

  function resolveSaved() {
    if (!state.pending) return;
    const pending = state.pending;
    setState({
      collection: { ...state.collection, quotations: [...state.collection.quotations.filter((quote) => quote.id !== pending.id), pending] },
      transfer: { status: 'idle' }, pending: null,
    });
    setSelectionResetKey((key) => key + 1);
    setNotice('Simulated save resolved once. The list is in memory only; extraction has not started.');
    mainRef.current?.querySelector<HTMLElement>('.intake-collection-panel h2')?.focus();
  }

  function resolveRejected() {
    setState({ ...state, transfer: { status: 'error', message: 'The simulated service confirmed that this upload was rejected and nothing was saved. Your selection is retained; you can try again.' }, pending: null });
    setNotice('Confirmed rejection simulated. A failed lookup alone would not make retry safe.');
    mainRef.current?.querySelector<HTMLElement>('.intake-add-panel h2')?.focus();
  }

  function refresh() {
    if (state.transfer.status === 'uncertain') {
      setState({ ...state, transfer: { status: 'checking', message: 'Checking the outcome of the same upload operation.' } });
      setNotice('Simulation paused at readback. Choose a saved, rejected or unavailable outcome above.');
      titleRef.current?.focus();
    } else {
      setState({ ...state, collection: { ...state.collection, status: 'ready', message: undefined } });
      setNotice('Simulated list refresh complete. No server was contacted.');
    }
  }

  function startExtraction(id: string) {
    if (running) return;
    setState({ ...state, collection: { ...state.collection, quotations: state.collection.quotations.map((quote) => quote.id === id ? {
      ...quote, processingStatus: 'running', reviewStatus: 'not_ready', retryAllowed: false, message: undefined,
    } : quote) } });
    setNotice('Simulation paused at extraction. Choose an outcome above; no AI call is running.');
    titleRef.current?.focus();
  }

  function finishExtraction(outcome: 'succeeded' | 'failed' | 'interrupted') {
    if (!running) return;
    setState({ ...state, collection: { ...state.collection, quotations: state.collection.quotations.map((quote) => quote.id === running.id ? {
      ...quote, processingStatus: outcome, reviewStatus: outcome === 'succeeded' ? 'needs_review' : 'not_ready',
      missingFieldCount: null, retryAllowed: outcome !== 'succeeded',
      message: outcome === 'succeeded' ? 'Illustrative outcome only. Open Review quotation for a separate synthetic review walkthrough.' : 'Illustrative outcome only. The saved record remains available for a deliberate retry.',
    } : quote) } });
    setNotice(`Extraction outcome simulated: ${outcome}. No fields were extracted or confirmed.`);
    mainRef.current?.querySelector<HTMLElement>('.intake-collection-panel h2')?.focus();
  }

  return <div className="app-shell quotation-preview">
    <a className="skip-link" href="#main">{reviewQuote ? 'Skip to quotation review' : 'Skip to quotation intake'}</a>
    <aside className="sidebar" aria-label="Preview navigation">
      <div className="brand"><span className="brand-mark"><Icon name="leaf" /></span><span>GreenProcure<span className="brand-subtitle">Fabric sourcing</span></span></div>
      <nav className="primary-nav" aria-label="Case preview">
        <p className="nav-label">DESIGN PREVIEW</p>
        <button className="nav-item" onClick={() => requirementsDialog.current?.showModal()}><Icon name="fabric" />Requirements</button>
        {reviewQuote ? <span className="nav-item" aria-current="page"><Icon name="grid" />Quotation review</span> : <a className="nav-item" href="#main" aria-current="page"><Icon name="grid" />Quotations</a>}
        <a className="nav-item" href="/comparison-preview.html"><Icon name="grid" />Comparison example</a>
      </nav>
      <div className="sidebar-footer"><Icon name="shield" /><div><strong>Synthetic example</strong><p>No signed-in session.<br />Changes last until reload.</p></div></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb"><span>{previewCase.name}</span><Icon name="chevron" /><span>{reviewQuote ? 'Review quotation' : 'Quotations'}</span></div><span className="session-chip">UI preview</span></header>
      <main id="main" ref={mainRef} className="main-content" tabIndex={-1}>
      <section className="preview-controls" aria-labelledby="preview-title" hidden={reviewQuote !== null}>
        <div><h2 id="preview-title" ref={titleRef} tabIndex={-1}>Quotation intake · UI preview</h2><p>Synthetic states. No uploads or AI calls. Selected files stay in your browser.</p></div>
        <details>
          <summary>Preview controls</summary>
          <div className="preview-control-body">
            <div className="preview-scenario"><label htmlFor="preview-scenario">Scenario</label><select id="preview-scenario" value={scenario} onChange={(event) => reset(event.target.value as Scenario)}>{scenarios.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="button button-secondary" onClick={() => reset(scenario)}>Reset scenario</button></div>
            <p>Switching or resetting scenarios clears selections. Limits shown below are illustrative: 10 MiB, 10 pages and four quotations. The server will supply actual limits.</p>
          </div>
        </details>
        {(state.transfer.status === 'uploading' || state.transfer.status === 'checking') && <div className="preview-outcomes" role="group" aria-label="Simulated upload outcomes">
          <strong>{state.transfer.status === 'checking' ? 'Choose a readback result:' : 'Choose an upload result:'}</strong>
          <button className="button button-secondary" onClick={resolveSaved}>Simulate saved result</button>
          <button className="button button-secondary" onClick={resolveRejected}>Simulate confirmed rejection</button>
          <button className="button button-secondary" onClick={() => {
            setState({ ...state, transfer: { status: 'uncertain', message: 'The result is still unknown. Check this operation again before uploading another quotation.' } });
            setNotice('Unknown outcome simulated. Duplicate upload remains blocked.');
            titleRef.current?.focus();
          }}>{state.transfer.status === 'checking' ? 'Simulate readback unavailable' : 'Simulate lost response'}</button>
        </div>}
        {running && <div className="preview-outcomes" role="group" aria-label="Simulated extraction outcomes"><strong>Choose an extraction result:</strong><button className="button button-secondary" onClick={() => finishExtraction('succeeded')}>Simulate ready for review</button><button className="button button-secondary" onClick={() => finishExtraction('failed')}>Simulate failed extraction</button><button className="button button-secondary" onClick={() => finishExtraction('interrupted')}>Simulate interrupted extraction</button></div>}
        <p className="preview-notice" role="status">{notice}</p>
      </section>
        <div hidden={reviewQuote !== null}>
        <QuotationIntake caseInfo={previewCase} collection={state.collection} transfer={state.transfer}
          limits={previewLimits} samples={previewSamples} selectionResetKey={selectionResetKey}
          processingNotice="Preview only: no PDF leaves this browser. Connected intake will explain private storage and AI processing before upload."
          retentionNotice="Retention and deletion terms must be agreed before public uploads are enabled."
          onBack={() => requirementsDialog.current?.showModal()} onRefresh={refresh}
          onUpload={(file) => beginTransfer(fixtureQuote(`local-${++sequence.current}`, { fileName: file.name, source: 'upload', byteSize: file.size }))}
          onUseSample={(id) => {
            const sample = previewSamples.find((item) => item.id === id);
            if (sample) beginTransfer(fixtureQuote(`sample-${++sequence.current}`, { fileName: sample.fileName }));
          }}
          onExtract={startExtraction} onRetryExtraction={startExtraction}
          onReview={(id) => {
            const quote = state.collection.quotations.find((item) => item.id === id);
            if (!quote) return;
            setReviewSessions((sessions) => sessions.some((item) => item.id === id) ? sessions : [...sessions, quote]);
            setReviewQuote(quote);
          }} />
        </div>
        {reviewSessions.map((quote) => <div key={quote.id} hidden={reviewQuote?.id !== quote.id}>
          <QuotationReviewPreview quotationId={quote.id} fileName={quote.fileName} sourceKind={quote.source}
            active={reviewQuote?.id === quote.id} onBack={() => {
              setReviewQuote(null);
              requestAnimationFrame(() => mainRef.current?.querySelector<HTMLElement>('.intake-collection-panel h2')?.focus());
            }} />
        </div>)}
      </main>
    </div>
    <dialog ref={requirementsDialog} className="preview-dialog" aria-labelledby="requirements-title">
      <h2 id="requirements-title">Case requirements</h2><p className="preview-dialog-note">Synthetic context for this preview. Your file selection is preserved while this is open.</p>
      <dl><dt>Case</dt><dd>{previewCase.name}</dd><dt>Fabric</dt><dd>{previewCase.fabricLabel}</dd><dt>Quantity</dt><dd>{previewCase.quantityLabel}</dd><dt>Budget</dt><dd>{previewCase.budgetLabel}</dd><dt>Delivery</dt><dd>{previewCase.deliveryLabel}</dd></dl>
      <p className="preview-dialog-note">Destination: Fictional HCMC buyer facility, Vietnam. The budget covers material and declared delivery charges, excluding tax and duties. Logistics emissions cover the supplier origin facility to the buyer facility, using a well-to-wheel boundary.</p>
      <button className="button button-primary" onClick={() => requirementsDialog.current?.close()}>Return to quotations</button>
    </dialog>
  </div>;
}
