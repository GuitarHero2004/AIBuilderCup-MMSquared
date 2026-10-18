import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { OfferDetails } from '../comparison/ComparisonView';
import { displayMetric, explanationMatches, metricAvailable } from '../comparison/model';
import type { ComparisonMetric, ComparisonOffer, ComparisonSnapshot } from '../comparison/types';
import { decisionIsHistorical, decisionLocked, decisionReasonLimit, decisionRecordIssue, decisionSaveIssue, decisionSourceIssue, makeDecisionProposal, reasonIssue, reasonLength, sourceKey } from './model';
import type { DecisionProps, DecisionSource } from './types';
import './decisions.css';

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(date) : 'Time unavailable';
}

function Metric({ metric }: { metric: ComparisonMetric }) {
  return <><strong className="cmp-number">{displayMetric(metric)}{metricAvailable(metric) && <span className="cmp-unit"> {metric.unit}</span>}</strong>
    {!metricAvailable(metric) && <span className="cmp-secondary">{metric.unavailableReason || 'Required information is unavailable.'}</span>}</>;
}

function DecisionFacts({ source, saved, id, onInspect }: {
  source: DecisionSource; saved: boolean; id: string;
  onInspect: (snapshot: ComparisonSnapshot, offer: ComparisonOffer, trigger: HTMLButtonElement) => void;
}) {
  const snapshot = source.evaluation;
  const selected = snapshot.offers.find((offer) => offer.id === source.selectedQuoteId);
  const preferred = snapshot.offers.find((offer) => offer.id === snapshot.winnerQuoteId);
  if (!selected || !preferred) return null;
  const sameOffer = selected.id === preferred.id;
  const baseline = source.scenario?.baseline.snapshot;
  const baselinePreferred = baseline?.offers.find((offer) => offer.id === baseline.winnerQuoteId);
  const policy = source.scenario?.result.proposal.policy;
  const explanation = source.explanation;
  const matchedExplanation = explanation && explanationMatches(explanation, snapshot, source.context);
  const metrics: { label: string; key: 'cost' | 'delivery' | 'carbon' }[] = [
    { label: 'Comparable cost', key: 'cost' },
    { label: 'Full-order delivery', key: 'delivery' },
    { label: 'Estimated logistics carbon', key: 'carbon' },
  ];
  return <>
    <section className="panel dv-selection" aria-labelledby={id + '-choice'}>
      <div className="dv-section-heading"><div><h2 id={id + '-choice'}>{saved ? 'Recorded sourcing choice' : 'Review your choice'}</h2>
        <p>{sameOffer ? 'Your selection matches the preferred offer for this evaluation.' : 'Your selection differs from the preferred offer. Your reason will accompany the decision.'}</p></div>
        <span className="status-badge status-success">{saved ? 'Recorded eligible offer' : 'Eligible offer'}</span></div>
      <div className="dv-choice-heading"><div><h3>{saved ? 'Chosen offer' : 'Your selection'}</h3><p>{selected.supplierName}</p></div>
        <div><h3>Preferred for this evaluation</h3><p>{preferred.supplierName}</p></div></div>
      <table className="dv-metrics" role="table" aria-label="Selected and preferred offer metrics">
        <thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col">Recorded measure</th><th role="columnheader" scope="col">Your selection</th><th role="columnheader" scope="col">Preferred offer</th></tr></thead>
        <tbody role="rowgroup">{metrics.map(({ label, key }) => <tr key={key} role="row"><th scope="row" role="rowheader">{label}</th>
          <td className="dv-selected-metric" role="cell"><span className="dv-mobile-label">Your selection</span><Metric metric={selected[key]} /></td>
          <td role="cell"><span className="dv-mobile-label">Preferred offer</span><Metric metric={preferred[key]} /></td></tr>)}</tbody>
      </table>
      <p className="dv-policy"><strong>{snapshot.policy.name}:</strong> cost {snapshot.policy.cost}, delivery {snapshot.policy.leadTime}, carbon {snapshot.policy.carbon}.
        {' '}The preference policy supports the choice; the buyer records the final decision.</p>
      {source.origin === 'scenario' && baseline && baselinePreferred && policy && <div className="dv-scenario-context">
        <p><strong>Original baseline preferred offer:</strong> {baselinePreferred.supplierName}.</p>
        <p className="dv-note">Applied scenario limits: {policy.maxCostIncrease === '' ? 'no relative cost cap' : 'maximum ' + policy.maxCostIncrease + '% cost increase'};
          {' '}{policy.minCarbonReduction === '' ? 'no relative carbon target' : 'minimum ' + policy.minCarbonReduction + '% carbon reduction'}. Limits use the original baseline preferred offer.</p>
      </div>}
      <div className="dv-source-actions">
        <button type="button" className="text-link" onClick={(event) => onInspect(snapshot, selected, event.currentTarget)}>Inspect chosen offer</button>
        {!sameOffer && <button type="button" className="text-link" onClick={(event) => onInspect(snapshot, preferred, event.currentTarget)}>Inspect preferred offer</button>}
        {source.origin === 'scenario' && baseline && baselinePreferred && <button type="button" className="text-link" onClick={(event) => onInspect(baseline, baselinePreferred, event.currentTarget)}>Inspect original baseline</button>}
      </div>
      {matchedExplanation && <details className="cmp-disclosure dv-explanation"><summary>Recorded recommendation explanation</summary><p>{explanation.summary}</p>
        {explanation.tradeoffs.length > 0 && <ul>{explanation.tradeoffs.map((item, index) => <li key={index}>{item}</li>)}</ul>}
        {explanation.limitations.length > 0 && <><h3>Explanation limitations</h3><ul>{explanation.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
        <p className="dv-note">This explanation supports the recorded evaluation. It does not replace the buyer's reason.</p></details>}
      {!matchedExplanation && <p className="dv-note">No recommendation explanation is attached. The recorded preference and offer values remain available for your review.</p>}
    </section>


  </>;
}


function DecisionScope({ source, id }: { source: DecisionSource; id: string }) {
  const snapshot = source.evaluation;
  const selected = snapshot.offers.find((offer) => offer.id === source.selectedQuoteId);
  if (!selected) return null;
  return <section className="panel dv-scope" aria-labelledby={id + '-scope'}><div className="dv-section-heading"><div><h2 id={id + '-scope'}>Requirements and comparison scope</h2>
      <p>These are the requirements and measurement boundaries recorded with this evaluation.</p></div></div>
      <dl className="dv-scope-grid"><div><dt>Order quantity</dt><dd>{snapshot.quantityLabel}</dd></div><div><dt>Budget limit</dt><dd>{source.context.budgetLabel}</dd></div>
        <div><dt>Delivery requirement</dt><dd>{source.context.deliveryLabel}</dd></div><div><dt>Mandatory checks</dt><dd>Technical compliance and minimum order quantity remain required. Inspect the chosen offer for its recorded checks.</dd></div>
        <div><dt>Comparable cost includes</dt><dd>{snapshot.costBasis}</dd></div><div><dt>Logistics carbon boundary</dt><dd>{snapshot.carbonBoundary}</dd></div></dl>
      <p className="dv-policy">{snapshot.mode === 'synthetic' && <strong>Synthetic example. </strong>}
        {snapshot.factorStatus === 'test_only' ? 'Carbon factors and estimates are test-only; they are not verified procurement evidence.'
          : snapshot.factorStatus === 'approved' ? 'Approved carbon factors were recorded with this evaluation.' : 'Approved compatible carbon factors are unavailable.'}</p>
      {(snapshot.limitations.length > 0 || selected.limitations.length > 0) && <div className="dv-limitations"><h3>Limitations to consider</h3>
        <ul>{[...new Set([...snapshot.limitations, ...selected.limitations])].map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    </section>;
}

/** The controller supplies receipts; this view never reconstructs a saved decision from draft data. */
export function DecisionView(props: DecisionProps) {
  const { source, reason, operation, currentCaseRevision, onReasonChange, onSave, onCheckSave, onReadSaved, onBack } = props;
  const id = useId();
  const captured = operation.proposal?.source;
  const foreignOperation = Boolean(captured && (captured.context.id !== source.context.id || captured.evaluation.caseId !== source.context.id
    || (captured.scenario && (captured.scenario.baseline.context.id !== source.context.id || captured.scenario.baseline.snapshot.caseId !== source.context.id))));
  const recordIssue = props.record ? decisionRecordIssue(props.record, {
    caseId: source.context.id, proposal: operation.proposal, requestId: operation.id, decisionId: operation.confirmedDecisionId,
  }) : null;
  const record = props.record && !recordIssue && !foreignOperation ? props.record : null;
  const knownReceipt = foreignOperation ? null : operation.confirmedDecisionId || record?.id || null;
  const hasReturnedRecord = props.record !== null;
  const recoveryOnly = !foreignOperation && !record && Boolean(knownReceipt || hasReturnedRecord);
  const locked = decisionLocked(operation) || hasReturnedRecord;
  const busy = ['saving', 'checking', 'reading'].includes(operation.status);
  const capturedSource = locked && operation.proposal ? operation.proposal.source : source;
  const reviewSource = record?.summary ?? capturedSource;
  const foreignSource = reviewSource.context.id !== source.context.id || reviewSource.evaluation.caseId !== source.context.id
    || Boolean(reviewSource.scenario && (reviewSource.scenario.baseline.context.id !== source.context.id || reviewSource.scenario.baseline.snapshot.caseId !== source.context.id));
  const sourceIssue = foreignSource ? 'The decision information belongs to another case. Return to this case before continuing.' : decisionSourceIssue(reviewSource);
  const visibleSource = !foreignOperation && !recoveryOnly && !sourceIssue ? reviewSource : null;
  const displayedReason = locked && operation.proposal ? operation.proposal.reason : reason;
  const saveIssue = decisionSaveIssue(source, reason, operation, currentCaseRevision);
  const invalidReason = reasonIssue(reason);
  const [reasonTouched, setReasonTouched] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const submitLocked = useRef(false);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const previousRecordId = useRef(record?.id ?? null);
  const previousStatus = useRef(operation.status);
  const sourceDialog = useRef<HTMLDialogElement>(null);
  const sourceTrigger = useRef<HTMLButtonElement | null>(null);
  const [inspecting, setInspecting] = useState<{ snapshotId: string; quoteId: string } | null>(null);
  const inspectedSnapshot = visibleSource && inspecting?.snapshotId === visibleSource.evaluation.id ? visibleSource.evaluation
    : visibleSource?.scenario && inspecting?.snapshotId === visibleSource.scenario.baseline.snapshot.id ? visibleSource.scenario.baseline.snapshot : null;
  const inspectedOffer = inspectedSnapshot?.offers.find((offer) => offer.id === inspecting?.quoteId);
  const visibleSourceKey = visibleSource ? sourceKey(visibleSource) : null;
  const historical = record ? decisionIsHistorical(record, currentCaseRevision) : currentCaseRevision !== reviewSource.context.currentRevision;
  const backLabel = source.origin === 'scenario' ? 'Back to scenario' : 'Back to comparison';

  useEffect(() => {
    if (['idle', 'error'].includes(operation.status)) submitLocked.current = false;
  }, [operation.status, operation.id]);
  useEffect(() => {
    if (record?.id && record.id !== previousRecordId.current && previousStatus.current !== 'idle') {
      requestAnimationFrame(() => { summaryHeading.current?.focus(); summaryHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    }
    previousRecordId.current = record?.id ?? null;
    previousStatus.current = operation.status;
  }, [record?.id, operation.status]);
  useEffect(() => { sourceDialog.current?.close(); }, [visibleSourceKey, record?.id]);
  useEffect(() => {
    if (inspecting && inspectedOffer && sourceDialog.current && !sourceDialog.current.open) {
      sourceDialog.current.showModal();
      sourceDialog.current.querySelector<HTMLHeadingElement>('h2')?.focus();
      sourceDialog.current.scrollTop = 0;
    } else if (!inspectedOffer) sourceDialog.current?.close();
  }, [inspecting, inspectedOffer]);

  function inspect(snapshot: ComparisonSnapshot, offer: ComparisonOffer, trigger: HTMLButtonElement) {
    sourceTrigger.current = trigger;
    setInspecting({ snapshotId: snapshot.id, quoteId: offer.id });
  }
  function save() {
    setReasonTouched(true);
    if (submitLocked.current || props.record || decisionSaveIssue(source, reason, operation, currentCaseRevision)) {
      if (invalidReason) reasonRef.current?.focus();
      return;
    }
    const proposal = makeDecisionProposal(source, reason);
    if (!proposal) return;
    submitLocked.current = true;
    onSave(proposal);
  }
  function renderOperation() {
    if (operation.status === 'idle' || recoveryOnly) return null;
    const unknown = operation.status === 'uncertain';
    const failed = operation.status === 'error';
    return <div className={'alert dv-operation ' + (failed ? 'error-alert' : unknown ? 'warning-alert' : 'info-alert')} role={failed || unknown ? 'alert' : 'status'}>
      <div><strong>{record ? failed ? 'Saved summary could not be refreshed' : 'Reading the saved summary'
        : unknown ? 'Save outcome is not known yet' : failed ? 'Decision was not saved' : operation.status === 'checking' ? 'Checking this save' : 'Saving your decision'}</strong>
        <p>{operation.message || (unknown ? 'Check this same request before attempting another save.' : failed ? 'Review the information below and try saving again.' : 'Keep this review open while the request is resolved.')}</p>
        {unknown && !knownReceipt && <div className="section-actions"><button type="button" className="button button-secondary" onClick={onCheckSave}><Icon name="refresh" />Check save result</button></div>}
      </div></div>;
  }

  return <div className="decision-page">
    <header className="page-heading"><div><p className="eyebrow">SOURCING DECISION</p><h1 data-page-title tabIndex={-1}>{foreignOperation ? 'Decision review unavailable' : record ? 'Decision summary' : recoveryOnly ? knownReceipt ? 'Saved decision' : 'Decision needs verification' : 'Review decision'}</h1>
      <p className="page-intro">{source.context.name}</p></div><button type="button" className="button button-secondary" onClick={onBack}>{backLabel}</button></header>

    {foreignOperation ? <div className="alert error-alert" role="alert"><div><strong>This save belongs to another case</strong><p>Its information is withheld. Return to the current case to continue.</p></div></div> : recoveryOnly ? <section className="panel dv-recovery" aria-labelledby={id + '-recovery'} role="status">
      <h2 id={id + '-recovery'}>{knownReceipt ? (operation.proposal?.source.evaluation.mode === 'synthetic' ? 'Decision saved in this preview; summary unavailable' : 'Decision saved; summary unavailable') : 'Save outcome needs verification'}</h2>
      <p className="dv-note">{knownReceipt ? 'A saved decision reference was received. Read that existing record to see its complete summary.'
        : 'The returned response could not be verified. Check this save request before making any further decision.'}</p>
      {knownReceipt && <p className="dv-policy"><strong>Decision reference:</strong> {knownReceipt}</p>}
      <div className={'alert dv-operation ' + (operation.status === 'error' || recordIssue ? 'warning-alert' : 'info-alert')}><div>
        <strong>{busy ? knownReceipt ? 'Reading the saved summary' : 'Checking this save' : 'Saving again is unavailable'}</strong>
        <p>{recordIssue ? 'The returned summary did not match this case and reviewed decision. Its details are withheld.' : operation.message || 'The saved choice and reason will appear only after its record has been verified.'}</p></div></div>
      <div className="dv-actions"><p>{knownReceipt ? "This recovery reads the existing decision. It does not create another one." : "Checking resolves this same save request without submitting another decision."}</p><button type="button" className="button button-primary" disabled={busy} onClick={knownReceipt ? onReadSaved : onCheckSave}><Icon name="refresh" />{knownReceipt ? "Read saved summary" : "Check save result"}</button></div>
    </section> : <>
      {record && <section className="panel dv-receipt" aria-labelledby={id + '-saved'}><div className="dv-section-heading"><div><div className="dv-receipt-title"><Icon name="check" /><h2 id={id + '-saved'} ref={summaryHeading} tabIndex={-1}>{record.summary.evaluation.mode === 'synthetic' ? 'Decision saved in this preview' : 'Decision saved'}</h2></div>
        <p>The chosen offer, reason and evaluation below are the recorded decision.</p></div><button type="button" className="button button-secondary" disabled={busy} onClick={onReadSaved}><Icon name="refresh" />Refresh saved summary</button></div>
        <div className="dv-receipt-meta"><span><strong>Decision:</strong> {record.id}</span><span><strong>Recorded by:</strong> {record.selectedByLabel}</span><span><strong>Saved:</strong> <time dateTime={record.createdAt}>{dateLabel(record.createdAt)}</time></span></div>
      </section>}
      {historical && <div className="alert warning-alert" role="status"><div><strong>{record ? 'The case has changed since this decision' : 'The case changed during review'}</strong>
        <p>{record ? 'This summary remains the decision as saved. Current case changes do not rewrite it.' : 'Return to a current evaluation before saving. This review does not include the latest inputs.'}
          {' '}Recorded case revision {reviewSource.context.currentRevision}; current revision {currentCaseRevision}.</p></div></div>}
      {sourceIssue && <div className="alert error-alert" role="alert"><div><strong>Decision review unavailable</strong><p>{sourceIssue} No decision can be saved from this review.</p></div></div>}
      {renderOperation()}
      {visibleSource && <DecisionFacts source={visibleSource} saved={Boolean(record)} id={id} onInspect={inspect} />}
      <div className="dv-final-review">{visibleSource && <DecisionScope source={visibleSource} id={id} />}
      {record ? <section className="panel dv-reason" aria-labelledby={id + '-reason-saved'}><h2 id={id + '-reason-saved'}>Buyer's reason</h2><p className="dv-note">Recorded with the decision, including when the buyer chose the preferred offer.</p>
        <p className="dv-reason-saved">{record.reason}</p></section>
        : visibleSource && <form className="panel dv-reason" noValidate onSubmit={(event) => { event.preventDefault(); save(); }}>
          <label htmlFor={id + '-reason'}>Why did you choose this offer? <span className="dv-required">(required)</span></label>
          <textarea id={id + '-reason'} ref={reasonRef} value={displayedReason} readOnly={locked} required
            aria-invalid={reasonTouched && Boolean(invalidReason)} aria-describedby={id + '-reason-help ' + id + '-reason-count' + (reasonTouched && invalidReason ? ' ' + id + '-reason-error' : '')}
            onBlur={() => setReasonTouched(true)} onChange={(event) => { if (!locked) onReasonChange(event.target.value); }} />
          <div className="dv-reason-meta"><p id={id + '-reason-help'}>Explain the trade-off or evidence behind your choice. A reason is required even when you choose the preferred offer.</p>
            <p id={id + '-reason-count'}>{reasonLength(displayedReason.trim()).toLocaleString('en-GB')} / {decisionReasonLimit.toLocaleString('en-GB')} characters</p></div>
          {reasonTouched && invalidReason && <p className="field-error" id={id + '-reason-error'} role="alert">{invalidReason}</p>}
          <div className="dv-actions"><p>{saveIssue || 'Save this offer and your reason as the final sourcing decision for this evaluation.'}</p>
            <button type="submit" className="button button-primary" disabled={Boolean(saveIssue) || locked}><Icon name="check" />Save decision</button></div>
        </form>}</div>
      {visibleSource && <details className="panel dv-record"><summary>Decision references and evaluation record</summary>
        <dl className="dv-scope-grid"><div><dt>Source</dt><dd>{visibleSource.origin === 'scenario' ? 'Applied scenario' : 'Quotation comparison'}</dd></div>
          <div><dt>Evaluation</dt><dd>{visibleSource.evaluation.id}</dd></div><div><dt>Evaluated at</dt><dd><time dateTime={visibleSource.evaluation.createdAt}>{dateLabel(visibleSource.evaluation.createdAt)}</time></dd></div>
          <div><dt>Recorded case revision</dt><dd>{visibleSource.context.currentRevision}</dd></div><div><dt>Chosen quotation</dt><dd>{visibleSource.selectedQuoteId}</dd></div>
          <div><dt>Confirmed quotation revision</dt><dd>{visibleSource.evaluation.offers.find((offer) => offer.id === visibleSource.selectedQuoteId)?.confirmedRevisionId}</dd></div>
          {visibleSource.scenario && <><div><dt>Confirmed scenario</dt><dd>{visibleSource.scenario.result.scenarioId}</dd></div><div><dt>Original evaluation</dt><dd>{visibleSource.scenario.baseline.snapshot.id}</dd></div></>}
          <div><dt>Input fingerprint</dt><dd>{visibleSource.inputFingerprint}</dd></div><div><dt>Recommendation reference</dt><dd>{visibleSource.recommendationId || 'No recommendation reference attached'}</dd></div>
          {record && <><div><dt>Save request</dt><dd>{record.requestId}</dd></div><div><dt>Recorded user reference</dt><dd>{record.selectedByUid}</dd></div></>}</dl>
        <p className="dv-note">These references identify the exact confirmed quotation and evaluation used for this choice.</p></details>}
    </>}
    <dialog className="cmp-dialog" ref={sourceDialog} aria-labelledby={id + '-details'} onClose={() => { setInspecting(null); sourceTrigger.current?.focus(); }}>
      {inspectedSnapshot && inspectedOffer && <OfferDetails snapshot={inspectedSnapshot} offer={inspectedOffer} titleId={id + '-details'} />}
      <footer className="cmp-dialog-actions"><button type="button" className="button button-primary" onClick={() => sourceDialog.current?.close()}>Close details</button></footer>
    </dialog>
  </div>;
}
