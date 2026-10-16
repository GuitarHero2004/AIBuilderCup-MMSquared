import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import type { CaseCreate } from '../../api/types';
import { toCaseCreate, validateCaseForm } from './form';
import type { CaseFormValues, FormErrors } from './form';

interface Props {
  values: CaseFormValues;
  onChange: (values: CaseFormValues) => void;
  onSave: (input: CaseCreate) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  uncertain: boolean;
}

const fieldLabels: Record<keyof CaseFormValues, string> = {
  name: 'Case name',
  quantity: 'Order quantity',
  budget: 'Maximum budget',
  orderDate: 'Order reference date',
  leadTime: 'Maximum lead time',
  destination: 'Delivery destination',
};
const fieldOrder: (keyof CaseFormValues)[] = ['name', 'quantity', 'budget', 'orderDate', 'leadTime', 'destination'];

export function CaseForm({ values, onChange, onSave, onCancel, busy, error, uncertain }: Props) {
  const [errors, setErrors] = useState<FormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = useId();
  const invalidFields = fieldOrder.filter((key) => errors[key]);

  function update(field: keyof CaseFormValues, value: string) {
    const nextValues = { ...values, [field]: value };
    onChange(nextValues);
    if (errors[field]) {
      const nextError = validateCaseForm(nextValues)[field];
      setErrors((previous) => ({ ...previous, [field]: nextError }));
    }
  }

  function focusField(field: keyof CaseFormValues) {
    formRef.current?.querySelector<HTMLInputElement>(`[name="${field}"]`)?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || uncertain) return;
    const nextErrors = validateCaseForm(values);
    setErrors(nextErrors);
    const firstInvalid = fieldOrder.find((key) => nextErrors[key]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }
    void onSave(toCaseCreate(values));
  }

  function field(key: keyof CaseFormValues, options: { unit?: string; type?: 'text' | 'date'; hint?: string; wide?: boolean } = {}) {
    const id = `${prefix}-${key}`;
    const descriptions = [options.unit && `${id}-unit`, options.hint && `${id}-hint`, errors[key] && `${id}-error`].filter(Boolean).join(' ');
    return <div className={options.wide ? 'field field-wide' : 'field'}>
      <div className="field-label-row"><label htmlFor={id}>{fieldLabels[key]}</label>{options.unit && <span className="field-label-unit" id={id + '-unit'} aria-hidden="true">· {options.unit}</span>}</div>
      <div className="input-wrap">
        <input
          id={id}
          name={key}
          value={values[key]}
          onChange={(event) => update(key, event.target.value)}
          type={options.type ?? 'text'}
          inputMode={key === 'leadTime' ? 'numeric' : options.unit ? 'decimal' : undefined}
          required
          maxLength={key === 'name' || key === 'destination' ? 160 : undefined}
          aria-invalid={!!errors[key]}
          aria-describedby={descriptions || undefined}
          disabled={busy || uncertain}
          autoComplete="off"
        />
      </div>
      {options.hint && <p className="field-hint" id={`${id}-hint`}>{options.hint}</p>}
      {errors[key] && <p className="field-error" id={`${id}-error`}>{errors[key]}</p>}
    </div>;
  }

  return <section className="form-page" aria-labelledby="create-title">
    <div className="page-heading">
      <p className="eyebrow">SOURCING CASE</p>
      <h1 id="create-title" tabIndex={-1} data-page-title>Create sourcing case</h1>
      <p className="page-intro">Set quantity, budget and delivery requirements for one fabric order.</p>
    </div>
    <div className="panel form-panel">
    <div className="preset-note"><Icon name="fabric" /><div><strong>Synthetic demo</strong><p>Prefilled details are fictional. Use synthetic, non-confidential information.</p></div></div>
    <form ref={formRef} onSubmit={submit} noValidate aria-busy={busy}>
      <p className="section-note">All fields below are required.</p>
      {invalidFields.length > 0 && <div className="alert error-alert validation-summary" role="alert" aria-atomic="true">
        <strong>Check {invalidFields.length === 1 ? 'this field' : `these ${invalidFields.length} fields`} before saving</strong>
        <ul className="validation-links">
          {invalidFields.map((key) => <li key={key}><a href={`#${prefix}-${key}`} onClick={(event) => { event.preventDefault(); focusField(key); }}>{fieldLabels[key]}: {errors[key]}</a></li>)}
        </ul>
      </div>}

      <section className="form-section" aria-labelledby={`${prefix}-order-title`}>
        <h2 className="section-heading" id={`${prefix}-order-title`}>Order and budget</h2>
        <div className="form-grid">
          {field('name', { wide: true, hint: 'Use a name you can recognise in your workspace.' })}
          {field('quantity', { unit: 'metres', hint: 'Enter the full order quantity, without commas.' })}
          {field('budget', { unit: 'USD', hint: 'Material and declared delivery charges; excludes tax and duties.' })}
        </div>
      </section>

      <section className="form-section" aria-labelledby={`${prefix}-delivery-title`}>
        <h2 className="section-heading" id={`${prefix}-delivery-title`}>Delivery</h2>
        <div className="form-grid">
          {field('orderDate', { type: 'date', hint: 'The full-order delivery period starts on this date.' })}
          {field('leadTime', { unit: 'days', hint: 'Calendar days for the entire order to arrive.' })}
          {field('destination', { wide: true, hint: 'Use a fictional buyer facility in Vietnam.' })}
        </div>
      </section>

      <section className="form-section" aria-labelledby={`${prefix}-fabric-title`}>
        <h2 className="section-heading" id={`${prefix}-fabric-title`}>Fixed fabric requirements</h2>
        <dl className="preset-specs">
          <div><dt>Fabric</dt><dd>Woven · 65% polyester / 35% cotton<br /><span>Composition tolerance: ±2 percentage points per fibre</span></dd></div>
          <div><dt>Weight and width</dt><dd>130 GSM ±5% · minimum usable width 150 cm</dd></div>
          <div><dt>Other requirements</dt><dd>No specific colour or finish. No certificates or other evidence required.</dd></div>
        </dl>
      </section>

      <section className="form-section" aria-labelledby={`${prefix}-basis-title`}>
        <h2 className="section-heading" id={`${prefix}-basis-title`}>Comparison scope</h2>
        <p className="section-note scope-summary">Logistics emissions boundary: supplier origin facility to buyer facility, well-to-wheel.</p>
        <details className="methodology-disclosure">
          <summary>How comparison boundaries work</summary>
          <div className="methodology-copy">
            <p><strong>Cost:</strong> material and declared delivery charges, excluding tax and duties, as shown with your budget.</p>
            <p><strong>Well-to-wheel:</strong> includes fuel production and transport use within the logistics boundary. It does not include fabric production.</p>
            <p>These boundaries are saved with your requirements. This preview does not calculate costs or emissions.</p>
          </div>
        </details>
      </section>

      {error && <div role="alert" className="alert error-alert">{error}</div>}
      {uncertain && <p className="section-note">Check your workspace for the saved case before trying again. Your entries are kept here while you check.</p>}
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>{uncertain ? 'Check workspace' : 'Cancel'}</button>
        <button className="button button-primary" disabled={busy || uncertain} type="submit">{busy ? 'Saving case…' : 'Create sourcing case'}{!busy && <Icon name="arrow" size={17} />}</button>
      </div>
    </form>
    </div>
  </section>;
}
