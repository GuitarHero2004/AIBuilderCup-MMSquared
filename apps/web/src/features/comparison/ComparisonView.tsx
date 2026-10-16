import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { displayMetric, explanationMatches, isHistorical, metricAvailable, operationPending, rankingIssue, selectableOffer, selectionBlockReason } from './model';
import type { ComparisonMetric, ComparisonOffer, ComparisonProps, ComparisonSnapshot } from './types';
import './comparison.css';

function dateLabel(value: string, includeTime = false) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-GB', includeTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function Metric({ metric }: { metric: ComparisonMetric }) {
  return <><strong className="cmp-number">{displayMetric(metric)}{metricAvailable(metric) && <span className="cmp-unit"> {metric.unit}</span>}</strong>
    {!metricAvailable(metric) && <span className="cmp-secondary">{metric.unavailableReason || 'Required inputs are not available.'}</span>}</>;
}

function offerStatus(offer: ComparisonOffer) {
  if (offer.eligibility === 'ineligible') return { label: 'Ineligible', tone: 'error' };
  if (offer.eligibility === 'needs_review') return { label: 'Needs review', tone: 'warning' };
  if (offer.scenarioFeasible === false) return { label: 'Outside scenario limits', tone: 'warning' };
  return { label: 'Eligible', tone: 'success' };
}

/** Changed inputs or evaluation operations discard selection; explanations preserve it. */
export function ComparisonView(props: ComparisonProps) {
  const snapshot = props.snapshot;
  const identity = JSON.stringify([props.context.id, props.context.currentRevision, snapshot?.id,
    snapshot?.inputRevision, snapshot?.historical, snapshot?.selectionAllowed, snapshot?.rankedQuoteIds, snapshot?.selectableQuoteIds,
    snapshot?.winnerQuoteId, snapshot ? rankingIssue(snapshot, props.context) : null, props.operation.kind === 'explanation' ? 'idle' : props.operation.status]);
  return <ComparisonContent key={identity} {...props} />;
}

function ComparisonContent(props: ComparisonProps) {
  const { context, explanation, operation, canEvaluate, evaluationBlockedReason, onEvaluate, onCheckResult,
    onBack, onInspectQuotation, onRequestExplanation, onReviewDecision } = props;
  const foreignSnapshot = props.snapshot !== null && props.snapshot.caseId !== context.id;
  const snapshot = foreignSnapshot ? null : props.snapshot;
  const issue = snapshot ? rankingIssue(snapshot, context) : null;
  const historical = snapshot ? isHistorical(snapshot, context) : false;
  const blockedReason = snapshot ? selectionBlockReason(snapshot, context, operation) : null;
  const busy = operationPending(operation);
  const explanationOperation = operation.kind === 'explanation';
  const unverified = !explanationOperation && operation.status !== 'idle';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedOffer = snapshot?.offers.find((offer) => offer.id === selectedId);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailOffer = snapshot?.offers.find((offer) => offer.id === detailId);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const explanationReady = snapshot !== null && explanationMatches(explanation, snapshot, context);
  const rankedOffers = snapshot && !issue ? snapshot.rankedQuoteIds.flatMap((id) => {
    const offer = snapshot.offers.find((item) => item.id === id);
    return offer ? [offer] : [];
  }) : [];
  const onlyEligibleOption = rankedOffers.length === 1 && snapshot?.offers.filter((offer) => offer.eligibility === 'eligible').length === 1;
  const unrankedOffers = snapshot?.offers.filter((offer) => !rankedOffers.some((ranked) => ranked.id === offer.id)) ?? [];
  const canContinue = Boolean(snapshot && selectedId && onReviewDecision && selectableOffer(snapshot, context, operation, selectedId));

  useEffect(() => {
    if (detailId && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
      dialog.current.querySelector<HTMLHeadingElement>('h2')?.focus();
      dialog.current.scrollTop = 0;
    }
  }, [detailId]);

  function inspect(offer: ComparisonOffer, trigger: HTMLButtonElement) {
    dialogTrigger.current = trigger;
    setDetailId(offer.id);
  }

  function finishInspecting() {
    setDetailId(null);
    dialogTrigger.current?.focus();
  }

  function continueDecision() {
    if (!snapshot || !selectedId || !onReviewDecision || !selectableOffer(snapshot, context, operation, selectedId)) return;
    onReviewDecision(snapshot.id, selectedId);
  }

  function renderOffer(offer: ComparisonOffer, ranked: boolean, index: number) {
    const status = offerStatus(offer);
    const selectable = snapshot !== null && selectableOffer(snapshot, context, operation, offer.id);
    const winner = ranked && snapshot?.winnerQuoteId === offer.id;
    return <tr key={offer.id} className={selectedId === offer.id ? 'cmp-row cmp-row-selected' : 'cmp-row'} role="row">
      <th scope="row" role="rowheader" className="cmp-offer-cell"><span className="cmp-mobile-label">Quotation</span><strong>{offer.supplierName}</strong>
        {ranked && <span className="cmp-rank">{rankedOffers.length === 1 ? onlyEligibleOption ? 'Only eligible option' : 'Only ranked option' : winner ? 'Preferred offer' : 'Rank ' + (index + 1)}</span>}
        <span className="cmp-secondary">{offer.confirmedRevisionId ? 'Confirmed quotation' : 'Confirmation needed'}</span>
      </th>
      <td role="cell"><span className="cmp-mobile-label">Eligibility</span><span className={'status-badge status-' + status.tone}>{status.label}</span>
        {offer.reasons.length > 0 && <ul className="cmp-reasons">{offer.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}
        {offer.scenarioFeasible === false && offer.reasons.length === 0 && <span className="cmp-secondary">Meets case requirements but fails a scenario limit.</span>}
      </td>
      <td role="cell"><span className="cmp-mobile-label">Comparable cost</span><Metric metric={offer.cost} /></td>
      <td role="cell"><span className="cmp-mobile-label">Full-order delivery</span><Metric metric={offer.delivery} />
        {offer.arrivalDate && <span className="cmp-secondary">Arrives <time dateTime={offer.arrivalDate}>{dateLabel(offer.arrivalDate)}</time></span>}</td>
      <td role="cell"><span className="cmp-mobile-label">Estimated logistics carbon</span><Metric metric={offer.carbon} /></td>
      <td role="cell"><span className="cmp-mobile-label">Preference score</span>{ranked && offer.weightedScore !== null
        ? <strong className="cmp-number">{Number.isInteger(offer.weightedScore) ? offer.weightedScore : offer.weightedScore.toFixed(1)}<span className="cmp-unit"> / 100</span></strong>
        : <span className="cmp-secondary cmp-unranked">{issue ? 'Unavailable' : 'Not ranked'}</span>}</td>
      <td className="cmp-actions" role="cell"><span className="cmp-mobile-label">Actions</span>
        <button type="button" className="button button-secondary" aria-label={'View details for ' + offer.supplierName} onClick={(event) => inspect(offer, event.currentTarget)}>View details</button>
        {ranked && <label className={'cmp-offer-radio' + (selectedId === offer.id ? ' cmp-offer-radio-selected' : '')}>
          <input type="radio" name={titleId + '-choice'} value={offer.id} aria-label={'Choose ' + offer.supplierName}
            checked={selectedId === offer.id} disabled={!selectable} onChange={() => { if (snapshot && selectableOffer(snapshot, context, operation, offer.id)) setSelectedId(offer.id); }} />
          <span>{selectedId === offer.id ? 'Your selection' : 'Choose offer'}</span></label>}
      </td>
    </tr>;
  }

  function renderGroup(label: string, offers: ComparisonOffer[], ranked: boolean, note: string) {
    if (offers.length === 0) return null;
    return <tbody role="rowgroup"><tr className="cmp-group-row" role="row"><th scope="rowgroup" colSpan={7} role="rowheader"><span>{label} <span className="count-badge">{offers.length}</span></span><p>{note}</p></th></tr>
      {offers.map((offer, index) => renderOffer(offer, ranked, index))}</tbody>;
  }

  function renderExplanation() {
    if (!snapshot) return null;
    return <section className="cmp-explanation" aria-labelledby={titleId + '-explanation'}>
          <div className="cmp-explanation-heading"><h3 id={titleId + '-explanation'}>{explanationReady ? 'Recommendation explanation' : 'Explanation unavailable'}</h3>
            {!explanationReady && onRequestExplanation && !issue && <button type="button" className="text-link" disabled={busy || historical || (!explanationOperation && operation.status === 'error')} onClick={onRequestExplanation}>{explanationOperation && operation.status === 'error' ? 'Retry explanation' : 'Request explanation'}</button>}</div>
          {explanationReady ? <><p>{explanation.summary}</p></>
            : <p>The comparison remains available. An explanation is optional and does not change its values or your choice.</p>}
{explanationReady && <details className="cmp-disclosure"><summary>Full explanation and its limitations</summary>
            {explanation.tradeoffs.length > 0 && <ul>{explanation.tradeoffs.map((tradeoff, i) => <li key={i}>{tradeoff}</li>)}</ul>}
            {explanation.limitations.length > 0 && <div className="cmp-explanation-limitations"><h3>Explanation limitations</h3><ul>{explanation.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul></div>}
            <p className="cmp-secondary">Grounded in evaluation {explanation.evaluationId}.</p></details>}
          {renderOperation(true)}
        </section>;
  }

  function renderDecision() {
    if (!snapshot) return null;
    return <section className="cmp-decision" aria-labelledby={titleId + '-decision'}>
      <div><h2 id={titleId + '-decision'}>Your sourcing choice</h2><p role="status">{selectedOffer && !blockedReason ? 'Selected: ' + selectedOffer.supplierName : 'Choose an eligible offer above to review your decision.'}</p>
        {selectedOffer && !blockedReason && selectedOffer.id !== snapshot.winnerQuoteId && <p className="cmp-secondary">Your choice differs from the preferred offer. Review the trade-offs before continuing.</p>}
        <p className="cmp-secondary">{blockedReason || (!onReviewDecision ? 'Decision review is not connected in this view.' : 'You will review this choice before any decision is saved. No order is placed.')}</p></div>
      <button type="button" className="button button-primary" disabled={!canContinue} onClick={continueDecision}>Review decision<Icon name="arrow" size={17} /></button>
    </section>;
  }

  function renderOperation(forExplanation = false) {
    if (operation.status === 'idle' || explanationOperation !== forExplanation) return null;
    return <div className={'cmp-operation ' + (operation.status === 'error' ? 'cmp-operation-error' : operation.status === 'uncertain' ? 'cmp-operation-warning' : 'cmp-operation-info')} role={operation.status === 'error' ? 'alert' : 'status'}>
      <strong>{operation.status === 'running' ? forExplanation ? 'Explanation requested' : 'Request in progress'
        : operation.status === 'checking' ? forExplanation ? 'Checking the explanation result' : 'Checking recorded result'
          : operation.status === 'uncertain' ? forExplanation ? 'Explanation outcome unknown' : 'Outcome unknown'
            : forExplanation ? 'Explanation unavailable' : 'Request could not be completed'}</strong>
      <p>{operation.message || (forExplanation ? 'Your recorded comparison and current selection remain available.' : 'Check or refresh the recorded result before continuing.')}</p>
      {forExplanation && <p>The comparison remains visible; an explanation does not change which offers are eligible.</p>}
      {forExplanation && (operation.status === 'uncertain' || operation.status === 'error') && <button type="button" className="button button-secondary" onClick={onCheckResult}>Check explanation result</button>}
    </div>;
  }

  function renderEvaluateButton() {
    return <button type="button" className={'button ' + (snapshot ? 'button-secondary' : 'button-primary')} disabled={!canEvaluate || busy} onClick={() => { if (canEvaluate && !busy) onEvaluate(); }}>
      <Icon name="refresh" size={17} />{!explanationOperation && operation.status === 'error' ? 'Retry evaluation' : snapshot ? 'Re-evaluate quotations' : 'Evaluate quotations'}</button>;
  }

  return <div className="comparison-page">
    <header className="page-heading"><div><p className="eyebrow">SOURCING CASE</p><h1 data-page-title tabIndex={-1}>Compare quotations</h1><p className="page-intro">{context.name}</p></div>
      <button type="button" className="button button-secondary" onClick={onBack}>Back to quotations</button></header>

    {foreignSnapshot && <div className="alert error-alert cmp-notice" role="alert"><div><strong>Evaluation could not be shown</strong><p>The returned evaluation does not belong to this case. Its data is hidden. Check the result or evaluate this case again.</p></div></div>}

    <section className="cmp-context cmp-basis panel" aria-labelledby={titleId + '-basis'}>
      <div className="cmp-context-heading"><h2 id={titleId + '-basis'}>{snapshot ? 'Requirements and comparison scope' : 'Case requirements'}</h2>
        {snapshot && <div className="cmp-context-actions"><span className={'status-badge status-' + (historical || unverified ? 'warning' : 'neutral')}>{historical ? 'Historical results' : unverified ? 'Current status unverified' : 'Current results'}</span>{snapshot.offers.length === 0 && renderEvaluateButton()}</div>}</div>
      <dl className="cmp-requirements"><div><dt>Order quantity</dt><dd>{context.quantityLabel}</dd></div><div><dt>Budget limit</dt><dd>{context.budgetLabel}</dd></div><div><dt>Delivery requirement</dt><dd>{context.deliveryLabel}</dd></div>
        {snapshot && <div><dt>Preference policy</dt><dd>{snapshot.policy.name}<span className="cmp-secondary">Cost {snapshot.policy.cost} · Delivery {snapshot.policy.leadTime} · Carbon {snapshot.policy.carbon}</span></dd></div>}</dl>
      {snapshot && <>
        <dl className="cmp-scope-grid"><div><dt>Common cost basis</dt><dd>{snapshot.costBasis}</dd></div><div><dt>Logistics carbon boundary</dt><dd>{snapshot.carbonBoundary}</dd></div></dl>
        {snapshot.quantityLabel !== context.quantityLabel && <p className="cmp-factor-note">These results compare {snapshot.quantityLabel}; the current case requests {context.quantityLabel}.</p>}
        {snapshot.mode === 'synthetic' && <p className="cmp-synthetic-note"><Icon name="shield" size={16} /><span><strong>Synthetic comparison.</strong> Illustrative suppliers and results{snapshot.factorStatus === 'test_only' ? '; carbon estimates and scores use test-only factors.' : '; not a real sourcing assessment.'}</span></p>}
        {snapshot.factorStatus !== 'approved' && !(snapshot.mode === 'synthetic' && snapshot.factorStatus === 'test_only') && <p className="cmp-factor-note">{snapshot.factorStatus === 'test_only' ? 'Carbon factors are test-only. Estimates and scores are illustrative.' : 'Approved compatible carbon factors are unavailable. A complete carbon-aware ranking cannot be shown.'}</p>}

      </>}
      {!canEvaluate && evaluationBlockedReason && <p className="cmp-blocked">{evaluationBlockedReason}</p>}
      {!explanationOperation && (operation.status === 'uncertain' || operation.status === 'error' || foreignSnapshot) && <div className="cmp-recovery-action"><button type="button" className="button button-secondary" disabled={operation.status === 'checking' || operation.status === 'running'} onClick={onCheckResult}>Check result</button></div>}
      {renderOperation()}
    </section>

    {!snapshot && <section className="cmp-evaluate panel" aria-labelledby={titleId + '-evaluate'}>
      <div><h2 id={titleId + '-evaluate'}>{canEvaluate ? 'Ready to compare' : 'Before you compare'}</h2><p>Evaluate confirmed quotations against the case requirements and a common comparison basis.</p></div>
      <div className="cmp-evaluate-actions">{renderEvaluateButton()}</div>
    </section>}

    {snapshot ? <>
      {historical && <div className="alert warning-alert cmp-notice"><div><strong>These results describe earlier inputs</strong><p>Inspect them as history. Re-evaluate the current case before reviewing a new decision.</p></div></div>}
      {issue && <div className="alert error-alert cmp-notice" role="alert"><div><strong>Ranking needs to be checked</strong><p>{issue} Scores, ranking labels and selection are withheld.</p></div></div>}
      {!issue && rankedOffers.length === 0 && <div className="alert warning-alert cmp-notice"><div><strong>{snapshot.status === 'no_feasible_option' ? 'No offer meets the current scenario limits' : snapshot.offers.length === 0 ? 'No quotations in this evaluation' : 'No offer is ready for a decision'}</strong>
        <p>{snapshot.offers.length === 0 ? 'Return to quotations to add and confirm offers before evaluating again.' : 'Review the reasons below. Resolve missing information or obtain suitable quotations, then re-evaluate. Changing preferences does not remove hard requirements.'}</p></div></div>}
      {!issue && rankedOffers.length === 1 && <div className="alert info-alert cmp-notice"><div><strong>{onlyEligibleOption ? 'Only eligible option' : 'Only ranked option'}</strong><p>There is no alternative ranked offer in this evaluation. A score of 100 for a one-option baseline is relative to that one-option set.</p></div></div>}

      {snapshot.offers.length > 0 && <section className="cmp-results panel" aria-labelledby={titleId + '-results'}>
        <div className="cmp-section-heading"><div><h2 id={titleId + '-results'}>Quotation comparison</h2><p>{snapshot.offers.length} {snapshot.offers.length === 1 ? 'quotation' : 'quotations'} · Missing values remain unavailable</p></div>{renderEvaluateButton()}</div>
        <fieldset className="cmp-choice-group"><legend className="cmp-visually-hidden">Choose an eligible offer</legend>
          <div className="cmp-table-container"><table className="cmp-table" role="table" aria-label="Quotation comparison">
            <colgroup><col className="cmp-col-offer" /><col className="cmp-col-status" /><col className="cmp-col-cost" /><col className="cmp-col-delivery" /><col className="cmp-col-carbon" /><col className="cmp-col-score" /><col className="cmp-col-actions" /></colgroup>
            <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Quotation</th><th scope="col" role="columnheader">Eligibility</th><th scope="col" role="columnheader">Comparable cost</th><th scope="col" role="columnheader">Full-order delivery</th><th scope="col" role="columnheader">Estimated logistics carbon</th><th scope="col" role="columnheader">Preference score</th><th scope="col" role="columnheader">Details and choice</th></tr></thead>
            {renderGroup('Eligible ranked offers', rankedOffers, true, 'Ordered by the recorded preference policy. Your choice may differ from the preferred offer.')}
            {rankedOffers.length > 0 && <tbody role="rowgroup" className="cmp-explanation-group"><tr role="row"><td role="cell" colSpan={7}>{renderExplanation()}</td></tr></tbody>}
            {rankedOffers.length > 0 && <tbody role="rowgroup" className="cmp-decision-group"><tr role="row"><td role="cell" colSpan={7}>{renderDecision()}</td></tr></tbody>}
            {issue ? renderGroup('Results need checking', unrankedOffers, false, 'The ranking is inconsistent. Inspect the recorded values and request a fresh evaluation.') : <>
              {renderGroup('Needs review', unrankedOffers.filter((offer) => offer.eligibility === 'needs_review'), false, 'Missing or unconfirmed information prevents comparison or selection.')}
              {renderGroup('Ineligible offers', unrankedOffers.filter((offer) => offer.eligibility === 'ineligible'), false, 'These offers fail one or more hard requirements. Their metrics are diagnostic only.')}
              {renderGroup('Other unranked offers', unrankedOffers.filter((offer) => offer.eligibility === 'eligible'), false, 'Case eligibility alone does not establish a complete, feasible ranking. See each offer\'s details.')}
            </>}
          </table></div>
        </fieldset>
        {rankedOffers.length === 0 && <>{renderExplanation()}{renderDecision()}</>}
      </section>}

      <details className="cmp-disclosure cmp-provenance-disclosure panel"><summary>Evaluation record and scoring method</summary>
          <dl className="cmp-detail-list"><div><dt>Evaluation</dt><dd>{snapshot.id}</dd></div><div><dt>Compared quantity</dt><dd>{snapshot.quantityLabel}</dd></div><div><dt>Input revision</dt><dd>{snapshot.inputRevision}</dd></div><div><dt>Current case revision</dt><dd>{context.currentRevision}</dd></div><div><dt>Evaluated at</dt><dd><time dateTime={snapshot.createdAt}>{dateLabel(snapshot.createdAt, true)}</time></dd></div></dl>
          <p className="cmp-secondary">Preference scores compare this evaluation's eligible offers. They are not sustainability ratings or confidence levels.</p>
        </details>
      {snapshot.limitations.length > 0 && <section className="cmp-limitations panel" aria-labelledby={titleId + '-limitations'}><h2 id={titleId + '-limitations'}>Evaluation limitations</h2><ul>{snapshot.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul></section>}

      {snapshot.offers.length === 0 && renderDecision()}
    </> : <section className="empty-state panel cmp-empty"><span className="empty-icon"><Icon name="grid" size={26} /></span><h2>No comparison results yet</h2><p>Confirmed quotations will appear here with their eligibility, comparable cost, delivery and estimated logistics carbon. Missing information will remain visible.</p></section>}


    <dialog ref={dialog} className="cmp-dialog" aria-labelledby={titleId + '-details'} onClose={finishInspecting}>
      {detailOffer && snapshot && <OfferDetails offer={detailOffer} snapshot={snapshot} titleId={titleId + '-details'} />}
      <footer className="cmp-dialog-actions">{detailOffer && onInspectQuotation && <button type="button" className="button button-secondary" onClick={() => {
        if (!detailOffer) return;
        const currentOffer = detailOffer;
        dialog.current?.close();
        onInspectQuotation(currentOffer.id, currentOffer.confirmedRevisionId);
      }}>Inspect quotation record</button>}<button type="button" className="button button-primary" onClick={() => dialog.current?.close()}>Close details</button></footer>
    </dialog>
  </div>;
}

function OfferDetails({ offer, snapshot, titleId }: { offer: ComparisonOffer; snapshot: ComparisonSnapshot; titleId: string }) {
  return <div className="cmp-dialog-content"><p className="eyebrow">EVALUATION DETAILS</p><h2 id={titleId} tabIndex={-1}>{offer.supplierName}</h2><p className="cmp-secondary">These are the inputs and limitations recorded with this evaluation.</p>
    <section><h3>Eligibility checks</h3>{offer.checks.length > 0 ? <ul className="cmp-checks">{offer.checks.map((check, i) => <li key={i}><div><strong>{check.label}</strong><span className={'status-badge status-' + (check.state === 'pass' ? 'success' : check.state === 'fail' ? 'error' : 'warning')}>{check.state === 'pass' ? 'Pass' : check.state === 'fail' ? 'Fail' : 'Needs review'}</span></div><p>{check.reason}</p></li>)}</ul> : <p className="cmp-secondary">Individual checks were not recorded. Do not infer a pass from their absence.</p>}</section>
    <section><h3>Common comparison scope</h3><dl className="cmp-detail-list"><div><dt>Quantity</dt><dd>{snapshot.quantityLabel}</dd></div><div><dt>Cost basis</dt><dd>{snapshot.costBasis}</dd></div><div><dt>Carbon boundary</dt><dd>{snapshot.carbonBoundary}</dd></div><div><dt>Carbon factor status</dt><dd>{snapshot.factorStatus === 'test_only' ? 'Test-only factors; illustrative estimates' : snapshot.factorStatus === 'approved' ? 'Approved factors recorded with evaluation' : 'Approved compatible factors unavailable'}</dd></div></dl></section>
    <section><h3>Mass, route and source evidence</h3>{offer.evidence.length > 0 ? <dl className="cmp-detail-list">{offer.evidence.map((entry, i) => <div key={i}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl> : <p className="cmp-secondary">Supporting mass, route and factor details were not recorded.</p>}</section>
    <section><h3>Limitations</h3>{offer.limitations.length > 0 ? <ul>{offer.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul> : <p className="cmp-secondary">No offer-specific limitations were recorded. This is not a verification of supporting documents.</p>}</section>
    <section><h3>Revision provenance</h3><dl className="cmp-detail-list"><div><dt>Quotation reference</dt><dd>{offer.id}</dd></div><div><dt>Confirmed revision</dt><dd>{offer.confirmedRevisionId ?? 'No confirmed revision recorded'}</dd></div><div><dt>Evaluation</dt><dd>{snapshot.id}</dd></div><div><dt>Case revision</dt><dd>{snapshot.inputRevision}</dd></div><div><dt>Evaluated at</dt><dd><time dateTime={snapshot.createdAt}>{dateLabel(snapshot.createdAt, true)}</time></dd></div></dl></section>
  </div>;
}
