import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Icon } from '../../components/Icon';
import { OfferDetails } from '../comparison/ComparisonView';
import { displayMetric, isHistorical, metricAvailable } from '../comparison/model';
import type { ComparisonMetric, ComparisonOffer, ComparisonSnapshot } from '../comparison/types';
import { baselineBlockReason, draftMatchesResult, makeProposal, policyKey, proposalBlockReason, proposalKey, scenarioLocked, scenarioOfferSelectable, scenarioPresets, scenarioResultIssue, scenarioSelectionBlockReason, validateDraft } from './model';
import type { ScenarioDraft, ScenarioProps, ScenarioProposal, ScenarioResult } from './types';
import './scenarios.css';

function Metric({ value }: { value: ComparisonMetric }) {
  return <><strong className="cmp-number">{displayMetric(value)}{metricAvailable(value) && <span className="cmp-unit"> {value.unit}</span>}</strong>
    {!metricAvailable(value) && <span className="cmp-secondary">{value.unavailableReason || 'Required information is unavailable.'}</span>}</>;
}

function Policy({ draft }: { draft: ScenarioDraft }) {
  return <dl className="cmp-detail-list"><div><dt>Priorities</dt><dd>Cost {draft.cost}% · Delivery {draft.leadTime}% · Carbon {draft.carbon}%</dd></div>
    <div><dt>Maximum cost increase</dt><dd>{draft.maxCostIncrease === '' ? 'No relative cost cap' : draft.maxCostIncrease + '% above the baseline preferred offer'}</dd></div>
    <div><dt>Minimum carbon reduction</dt><dd>{draft.minCarbonReduction === '' ? 'No relative carbon target' : draft.minCarbonReduction + '% below the baseline preferred offer'}</dd></div></dl>;
}

export function ScenarioView(props: ScenarioProps) {
  const { baseline, draft, applied, operation, onDraftChange, onApply, onCheckResult, onResumeEvaluation, onBack } = props;
  const id = useId();
  const locked = scenarioLocked(operation);
  const baselineIssue = baselineBlockReason(baseline);
  const proposalIssue = proposalBlockReason(baseline, draft);
  const validation = validateDraft(draft);
  const foreignBaseline = baseline.snapshot.caseId !== baseline.context.id;
  const baselineWinner = foreignBaseline ? null : baseline.snapshot.offers.find((offer) => offer.id === baseline.snapshot.winnerQuoteId);
  const resultIssue = applied ? scenarioResultIssue(applied, baseline) : null;
  const result = !foreignBaseline && applied && !resultIssue ? applied : null;
  const matches = result !== null && draftMatchesResult(draft, result);
  const currentProposal = makeProposal(baseline, draft);
  const currentProposalKey = currentProposal ? proposalKey(currentProposal) : null;
  const [proposal, setProposal] = useState<ScenarioProposal | null>(null);
  const proposalDialog = useRef<HTMLDialogElement>(null);
  const proposalTrigger = useRef<HTMLButtonElement>(null);
  const proposalHeading = useRef<HTMLHeadingElement>(null);
  const submissionLocked = useRef(false);
  const [inspecting, setInspecting] = useState<{ snapshotId: string; offerId: string } | null>(null);
  const sourceDialog = useRef<HTMLDialogElement>(null);
  const sourceTrigger = useRef<HTMLButtonElement | null>(null);
  const inspectSnapshot = inspecting?.snapshotId === baseline.snapshot.id && !foreignBaseline ? baseline.snapshot
    : result && inspecting?.snapshotId === result.snapshot.id ? result.snapshot : null;
  const inspectOffer = inspectSnapshot?.offers.find((offer) => offer.id === inspecting?.offerId);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const previousResultId = useRef(result?.snapshot.id ?? null);
  const previousOperation = useRef(operation.status);
  useEffect(() => {
    const nextId = result?.snapshot.id ?? null;
    if (nextId !== previousResultId.current && nextId && operation.status === 'idle' && previousOperation.current !== 'idle') {
      requestAnimationFrame(() => { resultHeading.current?.focus(); resultHeading.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    }
    previousResultId.current = nextId;
    previousOperation.current = operation.status;
  }, [result?.snapshot.id, operation.status]);
  const canReview = !locked && !proposalIssue && !(matches && operation.status === 'idle');

  useEffect(() => {
    if (proposalDialog.current?.open && (locked || !proposal || currentProposalKey !== proposalKey(proposal))) proposalDialog.current.close();
  }, [locked, proposal, currentProposalKey]);
  useEffect(() => {
    if (proposal && !locked && currentProposalKey === proposalKey(proposal) && !submissionLocked.current) {
      proposalDialog.current?.showModal();
      proposalHeading.current?.focus();
    }
  }, [proposal, locked, currentProposalKey]);
  useEffect(() => {
    if (inspecting && inspectOffer && sourceDialog.current && !sourceDialog.current.open) {
      sourceDialog.current.showModal();
      sourceDialog.current.querySelector<HTMLHeadingElement>('h2')?.focus();
      sourceDialog.current.scrollTop = 0;
    } else if (!inspectOffer) sourceDialog.current?.close();
  }, [inspecting, inspectOffer]);
  useEffect(() => {
    sourceDialog.current?.close();
  }, [baseline.context.id, baseline.context.currentRevision, baseline.snapshot.id, result?.snapshot.id, operation.status]);

  function change(key: keyof ScenarioDraft, value: string) {
    if (locked || baselineIssue) return;
    onDraftChange({ ...draft, [key]: value, ...(['cost', 'leadTime', 'carbon'].includes(key) ? { preset: 'custom' as const } : {}) });
  }
  function reviewProposal() {
    if (!canReview) return;
    const next = makeProposal(baseline, draft);
    if (!next) return;
    submissionLocked.current = false;
    setProposal(next);
  }
  function applyProposal() {
    const current = makeProposal(baseline, draft);
    if (submissionLocked.current || locked || !proposal || !current || proposalKey(current) !== proposalKey(proposal)) {
      proposalDialog.current?.close();
      return;
    }
    submissionLocked.current = true;
    proposalDialog.current?.close();
    onApply(proposal);
  }
  function inspect(snapshot: ComparisonSnapshot, offer: ComparisonOffer, trigger: HTMLButtonElement) {
    sourceTrigger.current = trigger;
    setInspecting({ snapshotId: snapshot.id, offerId: offer.id });
  }
  function field(key: 'cost' | 'leadTime' | 'carbon' | 'maxCostIncrease' | 'minCarbonReduction', label: string, note?: string) {
    const error = validation.errors[key];
    return <div className="sc-field"><label htmlFor={id + '-' + key}>{label} <span className="sc-field-unit">(%)</span></label>
      <input id={id + '-' + key} type="text" inputMode="decimal" value={draft[key]} maxLength={32} disabled={locked || Boolean(baselineIssue)}
        aria-invalid={Boolean(error)} aria-describedby={error ? id + '-' + key + '-error' : note ? id + '-' + key + '-note' : undefined}
        onChange={(event) => change(key, event.target.value)} />
      {error && <p className="field-error" id={id + '-' + key + '-error'}>{error}</p>}
      {note && <p className="sc-note" id={id + '-' + key + '-note'}>{note}</p>}</div>;
  }

  return <div className="comparison-page scenario-page">
    <header className="page-heading"><div><p className="eyebrow">SOURCING CASE</p><h1 data-page-title tabIndex={-1}>Explore a scenario</h1><p className="page-intro">{baseline.context.name}</p></div>
      <button type="button" className="button button-secondary" onClick={onBack}>Back to comparison</button></header>
    {!foreignBaseline && <section className="panel sc-baseline" aria-labelledby={id + '-baseline'}>
      <div className="sc-section-heading"><div><h2 id={id + '-baseline'}>Your unchanged baseline</h2><p>Relative limits compare each offer with this preferred offer. The original comparison stays intact.</p></div>
        <span className={'status-badge status-' + (baselineIssue ? 'warning' : 'neutral')}>{baselineIssue ? 'Baseline needs attention' : 'Frozen baseline'}</span></div>
      <dl className="sc-baseline-metrics"><div><dt>Baseline preferred offer</dt><dd>{baselineWinner?.supplierName || 'No preferred offer'}</dd></div>
        <div><dt>Comparable cost</dt><dd>{baselineWinner ? <Metric value={baselineWinner.cost} /> : 'Unavailable'}</dd></div>
        <div><dt>Full-order delivery</dt><dd>{baselineWinner ? <Metric value={baselineWinner.delivery} /> : 'Unavailable'}</dd></div>
        <div><dt>Estimated logistics carbon</dt><dd>{baselineWinner ? <Metric value={baselineWinner.carbon} /> : 'Unavailable'}</dd></div></dl>
      <div className="sc-boundaries"><p><strong>Common order and cost basis</strong>{baseline.snapshot.quantityLabel} · {baseline.snapshot.costBasis}</p>
        <p><strong>Logistics carbon boundary</strong>{baseline.snapshot.carbonBoundary}</p></div>
      <p className="sc-note"><strong>Fixed budget: {baseline.context.budgetLabel}; Delivery requirement: {baseline.context.deliveryLabel}.</strong></p>
      <p className="sc-note">Technical requirements, MOQ, budget and delivery deadline stay fixed. Preferences cannot override a failed requirement.</p>
      {baseline.snapshot.mode === 'synthetic' && <p className="cmp-synthetic-note"><Icon name="shield" size={16} /><span><strong>Synthetic scenario.</strong> Illustrative suppliers and results; test-only carbon figures cannot support a real sourcing decision.</span></p>}
      {baselineWinner && <button type="button" className="text-link" onClick={(event) => inspect(baseline.snapshot, baselineWinner, event.currentTarget)}>View baseline details</button>}
    </section>}
    {baselineIssue && <div className="alert warning-alert" role="alert"><div><strong>Start from a current, complete baseline</strong><p>{foreignBaseline ? 'The returned baseline does not belong to this case. Its quotation data is hidden.' : baselineIssue}</p></div></div>}

    <section className="panel sc-editor" aria-labelledby={id + '-editor'}>
      <div className="sc-section-heading"><div><h2 id={id + '-editor'}>Scenario settings</h2><p>Adjust priorities and optional relative limits, then review what you will apply.</p></div>
        <span className={'status-badge status-' + (matches ? 'neutral' : 'info')}>{matches ? 'Applied settings' : 'Unapplied draft'}</span></div>
      <fieldset disabled={locked || Boolean(baselineIssue)}><legend>Preference preset</legend>
        <div className="sc-presets">{scenarioPresets.map((preset) => <label className="sc-preset" key={preset.id}>
          <input type="radio" name={id + '-preset'} value={preset.id} checked={draft.preset === preset.id} onChange={() => {
            if (!locked && !baselineIssue) onDraftChange({ ...draft, preset: preset.id, cost: preset.cost, leadTime: preset.leadTime, carbon: preset.carbon });
          }} /><span>{preset.label}<small>{preset.id === 'custom' ? 'Set your own priorities' : preset.cost + ' / ' + preset.leadTime + ' / ' + preset.carbon}</small></span></label>)}</div></fieldset>
      <div className="sc-weights">{field('cost', 'Cost priority')}{field('leadTime', 'Delivery priority')}{field('carbon', 'Carbon priority')}</div>
      <p className={'sc-weight-total' + (validation.errors.total ? ' field-error' : '')} role="status">{validation.total === null ? 'Enter all three priorities.' : 'Priority total: ' + validation.total + '%'}{validation.errors.total && ' ' + validation.errors.total}</p>
      <div className="sc-limits">{field('maxCostIncrease', 'Maximum cost increase', 'Optional. Leave blank for no cap. Zero permits no increase above the baseline preferred offer.')}
        {field('minCarbonReduction', 'Minimum carbon reduction', 'Optional. Leave blank for no target. Measured against the baseline preferred offer, within the same logistics boundary.')}</div>
      <p className="sc-note">Percentages use up to two decimal places. Editing these settings does not change the applied result or confirm a scenario.</p>
      {validation.errors.preset && <p className="field-error">{validation.errors.preset}</p>}
      {proposalIssue && !baselineIssue && validation.valid && <p className="field-error" role="alert">{proposalIssue}</p>}
      <div className="sc-editor-actions"><p className="sc-note">{matches ? 'The visible results use these settings.' : result ? 'The results below still use the previously applied settings.' : 'No scenario has been applied yet.'}</p>
        <div>{result && !matches && <button type="button" className="button button-secondary" disabled={locked} onClick={() => { if (!locked) onDraftChange({ ...result.proposal.policy }); }}>Restore applied settings</button>}
          <button ref={proposalTrigger} type="button" className="button button-primary" disabled={!canReview} onClick={reviewProposal}>Review scenario<Icon name="arrow" size={17} /></button></div></div>
      {operation.status !== 'idle' && <div className={'cmp-operation sc-operation ' + (operation.status === 'error' ? 'cmp-operation-error' : operation.status === 'uncertain' ? 'cmp-operation-warning' : 'cmp-operation-info')} role={operation.status === 'error' ? 'alert' : 'status'}>
        <strong>{operation.confirmedScenarioId ? 'Scenario confirmed; evaluation unresolved' : operation.status === 'running' ? 'Applying the reviewed scenario' : operation.status === 'checking' ? 'Checking recorded scenario state' : operation.status === 'uncertain' ? 'Scenario outcome unknown' : 'Scenario could not be applied'}</strong>
        <p>{operation.message}</p>
        <div className="section-actions">
          {operation.status === 'uncertain' && <button type="button" className="button button-secondary" onClick={onCheckResult}>Check scenario result</button>}
          {operation.confirmedScenarioId && operation.status === 'error' && onResumeEvaluation && <button type="button" className="button button-primary" onClick={onResumeEvaluation}>Resume evaluation</button>}
        </div></div>}
    </section>

    {resultIssue && <div className="alert error-alert" role="alert"><div><strong>Scenario result could not be shown</strong><p>{resultIssue} Obtain a matching result before continuing.</p></div></div>}
    {result ? <ScenarioResults key={JSON.stringify([baseline.snapshot.id, baseline.context.currentRevision, result.scenarioId, result.snapshot.id, policyKey(draft), operation.status])}
      {...props} applied={result} onInspect={inspect} headingRef={resultHeading} /> : <section className="panel sc-empty"><h2>No scenario result yet</h2><p>Review and apply valid settings to compare the outcome with your unchanged baseline. A result with no feasible offer is valid; limits are never relaxed automatically.</p></section>}

    {!foreignBaseline && <details className="panel sc-record"><summary>Frozen baseline references and limitations</summary>
      <dl className="cmp-detail-list"><div><dt>Baseline evaluation</dt><dd>{baseline.snapshot.id}</dd></div><div><dt>Input revision</dt><dd>{baseline.snapshot.inputRevision}</dd></div>
        <div><dt>Current case revision</dt><dd>{baseline.context.currentRevision}</dd></div><div><dt>Input fingerprint</dt><dd>{baseline.inputFingerprint}</dd></div><div><dt>Scoring anchors</dt><dd>{baseline.anchorsId}</dd></div><div><dt>Comparison scope</dt><dd>{baseline.scopeKey}</dd></div></dl>
      <p className="sc-note">Scores express relative preferences using the frozen baseline anchors. They are not sustainability ratings.</p>
      {baseline.snapshot.limitations.length > 0 && <ul>{baseline.snapshot.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul>}</details>}

    <dialog ref={proposalDialog} className="cmp-dialog sc-proposal" aria-labelledby={id + '-proposal'} onClose={() => { setProposal(null); proposalTrigger.current?.focus(); }}>
      {proposal && <div className="cmp-dialog-content"><p className="eyebrow">REVIEW BEFORE APPLYING</p><h2 ref={proposalHeading} id={id + '-proposal'} tabIndex={-1}>Apply these scenario settings?</h2>
        <p className="sc-note">Baseline preferred offer: {baselineWinner?.supplierName || 'Unavailable'}</p><Policy draft={proposal.policy} />
        <div className="sc-proposal-copy"><p>The order quantity, cost/carbon boundaries and confirmed quotation revisions remain the same. Technical, MOQ, budget and deadline requirements remain mandatory.</p>
          <p>Applying confirms these settings and requests a separate scenario evaluation. It does not overwrite the baseline, save a sourcing decision or place an order.</p></div>
        <details className="cmp-disclosure"><summary>Exact baseline references</summary><dl className="cmp-detail-list"><div><dt>Baseline evaluation</dt><dd>{proposal.baselineEvaluationId}</dd></div><div><dt>Case revision</dt><dd>{proposal.caseRevision}</dd></div><div><dt>Input fingerprint</dt><dd>{proposal.inputFingerprint}</dd></div><div><dt>Scoring anchors</dt><dd>{proposal.anchorsId}</dd></div><div><dt>Scope</dt><dd>{proposal.scopeKey}</dd></div></dl></details></div>}
      <footer className="cmp-dialog-actions"><button type="button" className="button button-secondary" onClick={() => proposalDialog.current?.close()}>Keep editing</button>
        <button type="button" className="button button-primary" disabled={locked || !proposal || currentProposalKey !== proposalKey(proposal)} onClick={applyProposal}>Apply scenario</button></footer>
    </dialog>
    <dialog ref={sourceDialog} className="cmp-dialog" aria-labelledby={id + '-source'} onClose={() => { setInspecting(null); sourceTrigger.current?.focus(); }}>
      {inspectOffer && inspectSnapshot && <OfferDetails offer={inspectOffer} snapshot={inspectSnapshot} titleId={id + '-source'} />}
      <footer className="cmp-dialog-actions"><button type="button" className="button button-primary" onClick={() => sourceDialog.current?.close()}>Close details</button></footer>
    </dialog>
  </div>;
}

function ScenarioResults(props: ScenarioProps & { headingRef: RefObject<HTMLHeadingElement | null>; applied: ScenarioResult; onInspect: (snapshot: ComparisonSnapshot, offer: ComparisonOffer, trigger: HTMLButtonElement) => void }) {
  const { baseline, draft, applied, operation, onReviewDecision, onInspect, headingRef } = props;
  const id = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const snapshot = applied.snapshot;
  const historical = isHistorical(snapshot, baseline.context) || isHistorical(baseline.snapshot, baseline.context);
  const matches = draftMatchesResult(draft, applied);
  const blocked = scenarioSelectionBlockReason(baseline, draft, applied, operation);
  const baselineWinner = baseline.snapshot.offers.find((offer) => offer.id === baseline.snapshot.winnerQuoteId);
  const winner = snapshot.offers.find((offer) => offer.id === snapshot.winnerQuoteId);
  const ranked = snapshot.rankedQuoteIds.flatMap((quoteId) => snapshot.offers.find((offer) => offer.id === quoteId) ?? []);
  const unranked = snapshot.offers.filter((offer) => !snapshot.rankedQuoteIds.includes(offer.id));
  const selected = snapshot.offers.find((offer) => offer.id === selectedId);
  const canContinue = Boolean(selectedId && onReviewDecision && scenarioOfferSelectable(baseline, draft, applied, operation, selectedId));
  const deltaKeys = ['cost', 'delivery', 'carbon'] as const;
  const metricLabels = { cost: 'Comparable cost', delivery: 'Full-order delivery', carbon: 'Estimated logistics carbon' };

  function row(offer: ComparisonOffer, isRanked: boolean) {
    const state = offer.eligibility === 'ineligible' ? { label: 'Ineligible', tone: 'error' } : offer.eligibility === 'needs_review' ? { label: 'Needs review', tone: 'warning' }
      : offer.scenarioFeasible === false ? { label: 'Outside scenario limits', tone: 'warning' } : offer.scenarioFeasible === null ? { label: 'Scenario needs review', tone: 'warning' } : { label: 'Eligible', tone: 'success' };
    return <tr className={'cmp-row' + (selectedId === offer.id ? ' cmp-row-selected' : '')} key={offer.id} role="row">
      <th className="cmp-offer-cell" scope="row" role="rowheader"><span className="cmp-mobile-label">Quotation</span><strong>{offer.supplierName}</strong>
        {isRanked && <span className="cmp-rank">{offer.id === snapshot.winnerQuoteId ? 'Scenario preferred offer' : 'Eligible alternative'}</span>}</th>
      <td role="cell"><span className="cmp-mobile-label">Status</span><span className={'status-badge status-' + state.tone}>{state.label}</span>{offer.reasons.length > 0 && <ul className="cmp-reasons">{offer.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>}</td>
      <td role="cell"><span className="cmp-mobile-label">Comparable cost</span><Metric value={offer.cost} /></td>
      <td role="cell"><span className="cmp-mobile-label">Full-order delivery</span><Metric value={offer.delivery} /></td>
      <td role="cell"><span className="cmp-mobile-label">Estimated logistics carbon</span><Metric value={offer.carbon} /></td>
      <td role="cell"><span className="cmp-mobile-label">Preference score</span>{isRanked && offer.weightedScore !== null ? <strong className="cmp-number">{Number.isInteger(offer.weightedScore) ? offer.weightedScore : offer.weightedScore.toFixed(1)}<span className="cmp-unit"> / 100</span></strong> : <span className="cmp-secondary">Not ranked</span>}</td>
      <td role="cell" className="cmp-actions"><span className="cmp-mobile-label">Details and choice</span><button type="button" className="button button-secondary" aria-label={'View details for ' + offer.supplierName} onClick={(event) => onInspect(snapshot, offer, event.currentTarget)}>View details</button>
        {isRanked && <label className={'cmp-offer-radio' + (selectedId === offer.id ? ' cmp-offer-radio-selected' : '')}><input type="radio" name={id + '-choice'} aria-label={'Choose ' + offer.supplierName} checked={selectedId === offer.id}
          disabled={!scenarioOfferSelectable(baseline, draft, applied, operation, offer.id)} onChange={() => { if (scenarioOfferSelectable(baseline, draft, applied, operation, offer.id)) setSelectedId(offer.id); }} /><span>{selectedId === offer.id ? 'Your selection' : 'Choose offer'}</span></label>}</td>
    </tr>;
  }
  function group(title: string, offers: ComparisonOffer[], eligible: boolean, note: string) {
    if (!offers.length) return null;
    return <tbody role="rowgroup"><tr role="row" className="cmp-group-row"><th role="rowheader" scope="rowgroup" colSpan={7}><span>{title}<span className="count-badge">{offers.length}</span></span><p>{note}</p></th></tr>{offers.map((offer) => row(offer, eligible))}</tbody>;
  }
  function decision() {
    return <section className="cmp-decision" aria-labelledby={id + '-choice-heading'}><div><h2 id={id + '-choice-heading'}>Your scenario choice</h2>
      <p role="status">{selected ? 'Selected: ' + selected.supplierName : 'Choose an eligible offer from this scenario.'}</p>
      {selected && selected.id !== snapshot.winnerQuoteId && <p className="cmp-secondary">Your choice differs from the scenario preferred offer.</p>}
      <p className="cmp-secondary">{blocked || 'You will review this choice before a decision is saved. No order is placed.'}</p></div>
      <button type="button" className="button button-primary" disabled={!canContinue} onClick={() => {
        if (selectedId && onReviewDecision && scenarioOfferSelectable(baseline, draft, applied, operation, selectedId)) onReviewDecision(applied.scenarioId, snapshot.id, selectedId);
      }}>Review decision<Icon name="arrow" size={17} /></button></section>;
  }

  return <>
    <section className="panel sc-result-summary" aria-labelledby={id + '-results'}>
      <div className="sc-section-heading"><div><h2 ref={headingRef} tabIndex={-1} id={id + '-results'}>Applied scenario result</h2><p>{winner ? 'Scenario preferred offer: ' + winner.supplierName : snapshot.status === 'no_feasible_option' ? 'No offer meets these scenario limits.' : 'No complete ranking is available yet.'}</p></div>
        <span className={'status-badge status-' + (historical || baselineBlockReason(baseline) ? 'warning' : !matches ? 'info' : operation.status !== 'idle' ? 'warning' : 'neutral')}>{historical ? 'Historical results' : baselineBlockReason(baseline) ? 'Baseline unavailable' : !matches ? 'Earlier applied settings' : operation.status !== 'idle' ? 'Status unverified' : 'Current scenario'}</span></div>
      <p className="sc-applied-policy">{scenarioPresets.find((preset) => preset.id === applied.proposal.policy.preset)?.label || 'Applied policy'} · Cost {applied.proposal.policy.cost}% · Delivery {applied.proposal.policy.leadTime}% · Carbon {applied.proposal.policy.carbon}%</p>
      <p className="sc-note">Cost increase cap: {applied.proposal.policy.maxCostIncrease === '' ? 'off' : applied.proposal.policy.maxCostIncrease + '%'} · Carbon reduction target: {applied.proposal.policy.minCarbonReduction === '' ? 'off' : applied.proposal.policy.minCarbonReduction + '%'}</p>
      {winner && baselineWinner && <div className="sc-delta-grid">{deltaKeys.map((key) => <section className="sc-delta" key={key}><h3>{metricLabels[key]}</h3><dl><dt>Baseline preferred</dt><dd><Metric value={baselineWinner[key]} /></dd><dt>Scenario preferred</dt><dd><Metric value={winner[key]} /></dd></dl>
        <p>{applied.deltas?.[key] ?? 'Difference unavailable. No difference is inferred from the displayed values.'}</p></section>)}</div>}
      {applied.deltas?.notes.map((note, i) => <p className="sc-note" key={i}>{note}</p>)}
      {!winner && <p className="sc-note">{snapshot.status === 'no_feasible_option' ? 'No feasible option is a valid outcome. Adjust the relative limits or return to the baseline; mandatory requirements are never relaxed automatically.' : 'The result is incomplete. Review the missing information below before treating any offer as feasible or choosing it.'}</p>}
      {!matches && <p className="field-error">The settings above have unapplied changes. Apply the draft or restore these applied settings before choosing an offer.</p>}
    </section>
    <section className="cmp-results panel" aria-labelledby={id + '-offers'}><div className="cmp-section-heading"><div><h2 id={id + '-offers'}>Scenario quotations</h2><p>Original amounts and hard requirements are unchanged. Only preferences and relative limits differ.</p></div></div>
      <fieldset className="cmp-choice-group"><legend className="cmp-visually-hidden">Choose an eligible scenario offer</legend><table className="cmp-table" role="table" aria-label="Scenario quotation comparison">
        <colgroup><col className="cmp-col-offer" /><col className="cmp-col-status" /><col className="cmp-col-cost" /><col className="cmp-col-delivery" /><col className="cmp-col-carbon" /><col className="cmp-col-score" /><col className="cmp-col-actions" /></colgroup>
        <thead role="rowgroup"><tr role="row">{['Quotation', 'Status', 'Comparable cost', 'Full-order delivery', 'Logistics carbon', 'Preference score', 'Details and choice'].map((title) => <th key={title} role="columnheader" scope="col">{title}</th>)}</tr></thead>
        {group('Eligible scenario offers', ranked, true, 'In the recorded scenario order; you may choose an eligible alternative.')}
        {ranked.length > 0 && <tbody className="cmp-decision-group" role="rowgroup"><tr role="row"><td colSpan={7} role="cell">{decision()}</td></tr></tbody>}
        {group('Outside scenario limits', unranked.filter((offer) => offer.eligibility === 'eligible' && offer.scenarioFeasible === false), false, 'These offers remain eligible for the case but do not qualify for this scenario.')}
        {group('Scenario review needed', unranked.filter((offer) => offer.eligibility === 'eligible' && offer.scenarioFeasible !== false), false, 'Case eligibility is known, but this result does not establish a complete scenario ranking.')}
        {group('Needs review', unranked.filter((offer) => offer.eligibility === 'needs_review'), false, 'Missing mandatory information remains unresolved.')}
        {group('Ineligible offers', unranked.filter((offer) => offer.eligibility === 'ineligible'), false, 'Hard requirement failures remain excluded under every preference policy.')}
      </table></fieldset>{ranked.length === 0 && decision()}
    </section>
    <details className="panel sc-record"><summary>Applied scenario record</summary><dl className="cmp-detail-list"><div><dt>Scenario</dt><dd>{applied.scenarioId}</dd></div><div><dt>Evaluation</dt><dd>{snapshot.id}</dd></div><div><dt>Baseline</dt><dd>{applied.proposal.baselineEvaluationId}</dd></div><div><dt>Input revision</dt><dd>{snapshot.inputRevision}</dd></div><div><dt>Recorded request</dt><dd>{applied.requestId}</dd></div></dl><Policy draft={applied.proposal.policy} /></details>
    {snapshot.limitations.length > 0 && <section className="panel cmp-limitations"><h2>Scenario limitations</h2><ul>{snapshot.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></section>}
  </>;
}
