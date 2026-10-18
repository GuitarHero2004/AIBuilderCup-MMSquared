import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ApiClient } from '../../api/client';
import { ApiError } from '../../api/client';
import type { CaseComparison, CaseRead } from '../../api/types';
import type { SelectionSource } from '../connected-selections/recovery';
import { Icon } from '../../components/Icon';
import './connected-comparison.css';

interface Props {
  api: ApiClient; ownerId: string; item: CaseRead; minimumRevision: number; busy: boolean;
  onBack: () => void; onReview: (quoteId: string) => void; onSelect: (source: SelectionSource) => void;
}
type Row = CaseComparison['rows'][number];
type Check = Row['checks'][number];
const rowStatus: Record<Row['status'], { label: string; tone: string }> = {
  meets_checked_requirements: { label: 'Meets checked requirements', tone: 'success' },
  does_not_meet_requirements: { label: 'Does not meet requirements', tone: 'error' },
  needs_review: { label: 'Needs information', tone: 'warning' },
  unconfirmed: { label: 'Not confirmed', tone: 'neutral' },
};
const checkStatus: Record<Check['status'], { label: string; tone: string }> = {
  pass: { label: 'Meets check', tone: 'success' }, fail: { label: 'Does not meet', tone: 'error' },
  needs_review: { label: 'Needs review', tone: 'warning' }, not_applicable: { label: 'Not checked', tone: 'neutral' },
};
// Formatting preserves the server decimal string. No cost, mass or ranking is calculated here.
function displayDecimal(value: string): string {
  const [whole, fraction] = value.split('.');
  const tail = fraction?.replace(/0+$/, '');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (tail ? '.' + tail : '');
}
function dateLabel(value: string, withTime = false) {
  return new Intl.DateTimeFormat('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
}
function checkLabel(code: string) {
  const labels: Record<string, string> = { CONFIRMATION: 'Buyer confirmation', CONSTRUCTION: 'Fabric construction', COMPOSITION: 'Fibre composition', GSM: 'Fabric weight (GSM)', USABLE_WIDTH: 'Usable width', COLOUR: 'Colour', FINISH: 'Finish', WIDTH_CONSISTENCY: 'Width consistency', NET_MASS: 'Net fabric mass', SHIPMENT_MASS: 'Shipment mass', CURRENCY: 'Currency', QUOTE_QUANTITY: 'Quoted quantity', MOQ: 'Minimum order', COST_BASIS: 'Comparable cost basis', QUOTED_COST: 'Quoted cost', BUDGET: 'Budget', DELIVERY_BASIS: 'Delivery commitment', DELIVERY: 'Delivery deadline', QUOTE_VALIDITY: 'Quotation validity', EVIDENCE: 'Required evidence' };
  return labels[code] ?? code.replaceAll('_', ' ').toLowerCase();
}
const explanation = (error: unknown) => error instanceof ApiError
  ? error.message + (error.requestId ? ' Reference: ' + error.requestId + '.' : '')
  : 'The saved checks could not be read. Try refreshing them.';

export function ConnectedComparison(props: Props) {
  return <ComparisonContent key={props.ownerId + ':' + props.item.id} {...props} />;
}
function ComparisonContent({ api, item, minimumRevision, busy, onBack, onReview, onSelect }: Props) {
  const [result, setResult] = useState<CaseComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const readComparison = useCallback(() => {
    const request = ++generation.current;
    return api.getComparison(item.id).then(next => {
      if (request !== generation.current) return;
      if (next.case_id !== item.id || next.case_data_revision < minimumRevision) {
        throw new ApiError('The response does not match the saved case revision. Refresh before using these checks.', 'INVALID_RESPONSE');
      }
      setResult(next); setError(null);
    }).catch(failure => { if (request === generation.current) setError(explanation(failure)); })
      .finally(() => { if (request === generation.current) setLoading(false); });
  }, [api, item.id, minimumRevision]);
  useEffect(() => { void readComparison(); return () => { generation.current += 1; }; }, [readComparison]);
  function refresh() { setLoading(true); setError(null); void readComparison(); }
  useEffect(() => { heading.current?.focus(); }, []);
  const outdated = result !== null && result.case_data_revision < minimumRevision;
  const requirement = result?.requirement;
  return <section className="connected-comparison" aria-labelledby={headingId}>
    <header className="cc-heading">
      <button className="button button-secondary" type="button" disabled={busy} onClick={onBack}>Back to quotations</button>
      <div className="page-heading"><div><p className="eyebrow">CONFIRMED QUOTATION CHECKS</p>
        <h1 ref={heading} id={headingId} tabIndex={-1} data-page-title>Compare terms for {item.name}</h1>
        <p className="page-intro">Check confirmed offers against your saved order requirements. These results do not rank suppliers or recommend a purchase.</p>
      </div><button className="button button-secondary" type="button" disabled={loading || busy} onClick={() => { void refresh(); }}><Icon name="refresh" size={17} />{loading ? 'Checking…' : 'Refresh checks'}</button></div>
    </header>
    {error && <div className="alert error-alert" role="alert"><div><strong>Checks could not be refreshed</strong><p>{error}</p>{result && <p>The previous result is still shown below. Its current status has not been verified.</p>}</div></div>}
    {outdated && !error && <div className="alert warning-alert" role="status"><div><strong>The saved inputs have changed</strong><p>The result below belongs to an earlier case revision. Refresh before using it.</p></div></div>}
    {loading && <p className="loading-line" role="status"><span className="spinner" />{result ? 'Checking saved inputs again. The previous result remains visible.' : 'Reading confirmed quotations and checking their requirements…'}</p>}
    {result && requirement && <>
      <section className="panel cc-context" aria-label="Requirements used for these checks">
        <div className="cc-section-heading"><h2>Requirements used</h2><p>Case revision {result.case_data_revision} · Checked <time dateTime={result.checked_at}>{dateLabel(result.checked_at, true)}</time></p></div>
        <dl className="cc-requirements">
          <div><dt>Order quantity</dt><dd>{displayDecimal(requirement.quantity)} metres</dd></div>
          <div><dt>Maximum budget</dt><dd>{requirement.currency} {displayDecimal(requirement.maximum_budget_amount)}</dd></div>
          <div><dt>Delivery commitment</dt><dd>Within {requirement.maximum_lead_time_days} calendar days</dd></div>
          <div><dt>Reference order date</dt><dd>{dateLabel(requirement.order_reference_date)}</dd></div>
        </dl>
        <details className="cc-disclosure"><summary>Fabric specification and cost scope</summary><div className="cc-specification">
          <p><strong>Fabric:</strong> {requirement.textile_specification.construction}; {requirement.textile_specification.composition.map(part => displayDecimal(part.percentage) + '% ' + part.fibre.replaceAll('_', ' ')).join(', ')}; {displayDecimal(requirement.textile_specification.target_gsm)} GSM ±{displayDecimal(requirement.textile_specification.gsm_tolerance_pct)}%; minimum usable width {displayDecimal(requirement.textile_specification.minimum_usable_width_cm)} cm.</p>
          <p><strong>Comparable cost scope:</strong> {requirement.cost_basis_description}</p>
          <p><strong>Destination:</strong> {requirement.destination.label}</p>
        </div></details>
      </section>
      <section className="panel cc-results" aria-label="Quotation check results" aria-busy={loading}>
        <div className="cc-section-heading"><div><h2>Quotation results <span className="count-badge">{result.rows.length}</span></h2><p>Unconfirmed drafts are listed for follow-up. Only confirmed terms are checked.</p></div></div>
        {result.rows.length === 0 ? <div className="empty-state"><Icon name="fabric" size={28} /><h3>No quotations to check yet</h3><p>Add a PDF, extract its terms and confirm your review to see its requirement checks.</p><button type="button" className="button button-primary" disabled={busy} onClick={onBack}>Add a quotation<Icon name="arrow" size={17} /></button></div>
          : <table className="cc-table" role="table"><colgroup><col className="cc-col-offer" /><col className="cc-col-status" /><col className="cc-col-cost" /><col className="cc-col-delivery" /><col className="cc-col-actions" /></colgroup>
            <thead role="rowgroup"><tr role="row"><th scope="col">Quotation</th><th scope="col">Requirement checks</th><th scope="col">Cost for this order</th><th scope="col">Full-order delivery</th><th scope="col">Next step</th></tr></thead>
            <tbody role="rowgroup">{result.rows.map(row => {
              const status = rowStatus[row.status], metric = row.metrics, detailsId = headingId + '-' + row.quote_id;
              const reasons = row.checks.filter(check => ['fail', 'needs_review'].includes(check.status));
              const canReview = row.confirmation_revision_id !== null || row.draft_revision > 0;
              return <Fragment key={row.quote_id}><tr className="cc-row" role="row">
                <th scope="row" role="rowheader"><strong>{row.supplier_name ?? 'Supplier not identified'}</strong><span className="cc-secondary">{row.source_name}</span><span className="cc-secondary">{row.confirmation_revision_id ? 'Confirmed review · Draft ' + row.draft_revision : 'Review not confirmed'}</span></th>
                <td role="cell"><span className="cc-mobile-label">Requirement checks</span><span className={'status-badge status-' + status.tone}>{status.label}</span>{reasons[0] && <p className="cc-secondary">{reasons[0].message}{reasons.length > 1 ? ' Open checks for all reasons.' : ''}</p>}</td>
                <td role="cell"><span className="cc-mobile-label">Cost for this order</span><strong className="cc-value">{metric.comparable_cost_amount !== null ? metric.currency + ' ' + displayDecimal(metric.comparable_cost_amount) : row.status === 'unconfirmed' ? 'Not checked' : 'Not comparable yet'}</strong>
                  {metric.comparable_cost_amount !== null && <span className="cc-secondary">On the reviewed cost basis</span>}
                  {metric.quoted_cost_amount !== null && metric.comparable_cost_amount === null && <span className="cc-secondary">Quoted amount: {metric.currency ?? 'Currency unconfirmed \u00b7'} {displayDecimal(metric.quoted_cost_amount)}. Not used as a comparable total.</span>}
                </td>
                <td role="cell"><span className="cc-mobile-label">Full-order delivery</span><strong className="cc-value">{metric.end_to_end_lead_time_days !== null ? metric.end_to_end_lead_time_days + ' calendar days' : row.status === 'unconfirmed' ? 'Not checked' : 'Needs delivery review'}</strong>{metric.arrival_date && <span className="cc-secondary">Arrival: {dateLabel(metric.arrival_date)}</span>}</td>
                <td role="cell" className="cc-actions"><span className="cc-mobile-label">Next step</span><button type="button" className="button button-secondary" aria-expanded={expanded === row.quote_id} aria-controls={detailsId} onClick={() => setExpanded(current => current === row.quote_id ? null : row.quote_id)}>{expanded === row.quote_id ? 'Hide checks' : 'View checks'}</button><button className="text-link" type="button" disabled={busy} onClick={() => canReview ? onReview(row.quote_id) : onBack()}>{canReview ? 'Review quotation' : 'Open quotations'}<Icon name="arrow" size={16} /></button>{row.status === 'meets_checked_requirements' && <button type="button" className="button button-primary" disabled={busy || loading || !!error || outdated} onClick={() => onSelect({ comparison: structuredClone(result), quoteId: row.quote_id })}>Record buyer selection</button>}</td>
              </tr>
              <tr className="cc-detail-row" hidden={expanded !== row.quote_id}><td colSpan={5}><section id={detailsId} className="cc-details" aria-label={'Checks for ' + (row.supplier_name ?? row.source_name)}><h3>Checks for {row.supplier_name ?? row.source_name}</h3>
                <dl className="cc-mass"><dt>{metric.net_mass_basis === 'actual' ? 'Actual net fabric mass' : metric.net_mass_basis === 'estimated' ? 'Estimated net fabric mass' : 'Net fabric mass'}</dt><dd>{metric.net_fabric_mass_kg !== null ? displayDecimal(metric.net_fabric_mass_kg) + ' kg' : 'Unavailable from the confirmed terms'}<span className="cc-secondary">Fabric mass does not include packaging or establish freight weight.</span></dd></dl>
                <ul className="cc-checks">{row.checks.map((check, index) => <li key={check.code + ':' + index}><div><strong>{checkLabel(check.code)}</strong><span className={'status-badge status-' + checkStatus[check.status].tone}>{checkStatus[check.status].label}</span></div><p>{check.message}</p></li>)}</ul>
              </section></td></tr></Fragment>;
            })}</tbody></table>}
      </section>
      <section className="panel cc-limitations"><h2>What these checks cover</h2><p>Carbon estimates, preference scores and recommendations are unavailable. A passing check is not a sourcing approval. You can separately record a limited buyer selection note with your reason.</p>{result.limitations.length > 0 && <ul>{result.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>}<p className="cc-secondary">Results reflect the saved inputs at the time shown above. Review changed quotations and refresh these checks before relying on them.</p></section>
    </>}
    {!loading && !result && !error && <div className="panel empty-state"><h2>No verified result is available</h2><p>Refresh the checks to read the saved quotations.</p></div>}
  </section>;
}
