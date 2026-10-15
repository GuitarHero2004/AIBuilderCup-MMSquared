import type { CaseRead } from '../../api/types';
import { Icon } from '../../components/Icon';
import { formatDecimal } from './format';

const statusLabels: Record<CaseRead['status'], string> = { draft: 'Draft case' };

export function CaseDetail({ item, onClose }: { item: CaseRead; onClose: () => void }) {
  const requirement = item.requirement;
  const textile = requirement.textile_specification;
  const carbonScope = requirement.carbon_scope_id === 'origin_facility_to_buyer_facility_v1'
    ? 'Supplier origin facility to buyer facility'
    : requirement.carbon_scope_id;

  return <section className="panel detail-panel" aria-labelledby="case-detail-title">
    <div className="page-heading">
      <p className="eyebrow">SAVED REQUIREMENTS · REVISION {item.data_revision}</p>
      <h1 id="case-detail-title" tabIndex={-1} data-page-title>{item.name}</h1>
      <p className="page-intro">Your saved order requirements and comparison scope.</p>
    </div>
    <div className="detail-badges">
      <span className="badge">{statusLabels[item.status]}</span>
      {item.is_synthetic_demo && <span className="badge badge-muted">Synthetic demo</span>}
    </div>
    <div className="next-step-note"><Icon name="check" /><div><strong>Requirements saved</strong><p>You can reopen these requirements from your workspace. Editing, quotation upload and comparison are not available in this preview.</p></div></div>

    <section className="detail-section" aria-labelledby="detail-order-title">
      <h2 className="section-heading" id="detail-order-title">Order and delivery</h2>
      <dl className="detail-grid">
        <div><dt>Order quantity</dt><dd>{formatDecimal(requirement.quantity)} <small>metres</small></dd></div>
        <div><dt>Maximum budget</dt><dd>{formatDecimal(requirement.maximum_budget_amount)} <small>{requirement.currency}</small></dd></div>
        <div><dt>Order reference date</dt><dd><time dateTime={requirement.order_reference_date}>{requirement.order_reference_date}</time></dd></div>
        <div><dt>Maximum lead time</dt><dd>{requirement.maximum_lead_time_days} <small>calendar days</small></dd></div>
        <div className="detail-wide"><dt>Delivery destination</dt><dd>{requirement.destination.label}<small> · Vietnam</small></dd></div>
      </dl>
      <p className="section-note">The full order must arrive within this many calendar days of the order reference date.</p>
    </section>

    <section className="detail-section" aria-labelledby="detail-fabric-title">
      <h2 className="section-heading" id="detail-fabric-title">Fabric requirements</h2>
      <dl className="detail-grid">
        <div><dt>Construction</dt><dd>{textile.construction === 'woven' ? 'Woven' : textile.construction}</dd></div>
        <div><dt>Composition</dt><dd>{textile.composition.map((part) => `${formatDecimal(part.percentage)}% ${part.fibre.replaceAll('_', ' ')}`).join(' / ')}</dd></div>
        <div><dt>Composition tolerance</dt><dd>±{formatDecimal(textile.composition_tolerance_pp)} <small>percentage points per fibre</small></dd></div>
        <div><dt>Target weight</dt><dd>{formatDecimal(textile.target_gsm)} <small>GSM ±{formatDecimal(textile.gsm_tolerance_pct)}%</small></dd></div>
        <div><dt>Minimum usable width</dt><dd>{formatDecimal(textile.minimum_usable_width_cm)} <small>cm</small></dd></div>
        <div><dt>Required colour</dt><dd>{textile.required_colour ?? 'No specific requirement'}</dd></div>
        <div><dt>Required finish</dt><dd>{textile.required_finish ?? 'No specific requirement'}</dd></div>
        <div><dt>Certificates or other evidence</dt><dd>{textile.required_evidence.length > 0 ? textile.required_evidence.join('; ') : 'None required'}</dd></div>
      </dl>
    </section>

    <section className="detail-section" aria-labelledby="detail-scope-title">
      <h2 className="section-heading" id="detail-scope-title">Comparison scope</h2>
      <dl className="detail-grid">
        <div className="detail-wide"><dt>Cost boundary</dt><dd className="detail-copy">{requirement.cost_basis_description}</dd></div>
        <div className="detail-wide"><dt>Logistics emissions boundary</dt><dd className="detail-copy">{carbonScope}. Well-to-wheel: fuel production and transport use.</dd></div>
      </dl>
    </section>

    <div className="detail-actions"><button type="button" className="button button-secondary" onClick={onClose}>Back to workspace</button></div>
  </section>;
}
