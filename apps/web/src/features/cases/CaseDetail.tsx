import type { CaseRead } from '../../api/types';
import { Icon } from '../../components/Icon';
import { formatDecimal } from './format';

export function CaseDetail({ item, onClose }: { item: CaseRead; onClose: () => void }) {
  const requirement = item.requirement;
  return <section className="panel detail-panel" aria-labelledby="case-detail-title">
    <div className="panel-heading"><div><p className="eyebrow">SAVED REQUIREMENTS · REVISION {item.data_revision}</p><h2 id="case-detail-title">{item.name}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close case details"><Icon name="close" /></button></div>
    <div className="detail-badges"><span className="badge">Draft case</span><span className="badge badge-muted">Synthetic demo</span></div>
    <dl className="detail-grid">
      <div><dt>Order quantity</dt><dd>{formatDecimal(requirement.quantity)} <small>metres</small></dd></div>
      <div><dt>Maximum budget</dt><dd>{formatDecimal(requirement.maximum_budget_amount)} <small>{requirement.currency}</small></dd></div>
      <div><dt>Maximum lead time</dt><dd>{requirement.maximum_lead_time_days} <small>calendar days</small></dd></div>
      <div><dt>Order reference date</dt><dd>{requirement.order_reference_date}</dd></div>
      <div className="detail-wide"><dt>Delivery destination</dt><dd>{requirement.destination.label}</dd></div>
      <div className="detail-wide"><dt>Fabric specification</dt><dd>{requirement.textile_specification.construction} · {requirement.textile_specification.composition.map((part) => `${part.percentage}% ${part.fibre}`).join(' / ')}</dd></div>
      <div><dt>Target weight</dt><dd>{requirement.textile_specification.target_gsm} <small>GSM ±{requirement.textile_specification.gsm_tolerance_pct}%</small></dd></div>
      <div><dt>Minimum usable width</dt><dd>{requirement.textile_specification.minimum_usable_width_cm} <small>cm</small></dd></div>
      <div className="detail-wide"><dt>Cost boundary</dt><dd className="detail-copy">{requirement.cost_basis_description}</dd></div>
    </dl>
    <div className="next-step-note"><Icon name="fabric" /><div><strong>Ready for the next build increment</strong><p>These requirements are saved. Quote upload, AI extraction, editing saved cases and comparison are not implemented yet.</p></div></div>
  </section>;
}
