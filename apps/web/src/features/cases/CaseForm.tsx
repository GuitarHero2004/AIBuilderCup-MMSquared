import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import type { CaseCreate } from '../../api/types';
import { demoDefaults, toCaseCreate, validateCaseForm } from './form';
import type { CaseFormValues, FormErrors } from './form';

interface Props { onSave: (input: CaseCreate) => Promise<void>; onCancel: () => void; busy: boolean; error: string | null; uncertain: boolean }

export function CaseForm({ onSave, onCancel, busy, error, uncertain }: Props) {
  const [values, setValues] = useState(demoDefaults);
  const [errors, setErrors] = useState<FormErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = useId();
  function update(field: keyof CaseFormValues, value: string) { setValues((previous) => ({ ...previous, [field]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || uncertain) return;
    const nextErrors = validateCaseForm(values);
    setErrors(nextErrors);
    const invalid = Object.keys(nextErrors)[0];
    if (invalid) { formRef.current?.querySelector<HTMLInputElement>(`[name="${invalid}"]`)?.focus(); return; }
    void onSave(toCaseCreate(values));
  }
  function field(key: keyof CaseFormValues, label: string, options: { unit?: string; type?: string; hint?: string; wide?: boolean } = {}) {
    const id = `${prefix}-${key}`;
    return <div className={options.wide ? 'field field-wide' : 'field'}>
      <label htmlFor={id}>{label}</label>
      <div className="input-wrap">
        <input id={id} name={key} value={values[key]} onChange={(event) => update(key, event.target.value)} type={options.type ?? 'text'} inputMode={options.unit ? 'decimal' : undefined} required aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `${id}-error` : options.hint ? `${id}-hint` : undefined} disabled={busy || uncertain} autoComplete="off" />
        {options.unit && <span className="input-unit">{options.unit}</span>}
      </div>
      {errors[key] ? <p className="field-error" id={`${id}-error`}>{errors[key]}</p> : options.hint && <p className="field-hint" id={`${id}-hint`}>{options.hint}</p>}
    </div>;
  }
  return <section className="panel form-panel" aria-labelledby="create-title">
    <div className="panel-heading"><div><p className="eyebrow">NEW SOURCING CASE</p><h2 id="create-title">Define your starting point</h2></div><button className="icon-button" type="button" onClick={onCancel} disabled={busy} aria-label="Close new case form"><Icon name="close" /></button></div>
    <div className="preset-note"><Icon name="fabric" /><div><strong>Synthetic fabric preset</strong><p>Fictional order and destination. Edit the case details before saving. Use no confidential or real supplier information.</p></div></div>
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="form-grid">
        {field('name', 'Case name', { wide: true })}
        {field('quantity', 'Order quantity', { unit: 'metres' })}
        {field('budget', 'Maximum budget', { unit: 'USD', hint: 'Material and delivery; excludes tax and duties.' })}
        {field('orderDate', 'Order reference date', { type: 'date', hint: 'Delivery time starts on this date.' })}
        {field('leadTime', 'Maximum lead time', { unit: 'days', hint: 'Calendar days for the full order to arrive.' })}
        {field('destination', 'Delivery destination', { wide: true, hint: 'Fictional destination in Vietnam.' })}
      </div>
      <div className="spec-summary"><div><span>Fabric</span><strong>Woven · 65% polyester / 35% cotton</strong></div><div><span>Weight</span><strong>130 GSM ±5%</strong></div><div><span>Usable width</span><strong>At least 150 cm</strong></div></div>
      <p className="form-note">This foundation uses the fixed fabric preset above. Saving records requirements only; it does not calculate costs, emissions or supplier eligibility.</p>
      {error && <div role="alert" className="alert error-alert">{error}</div>}
      <div className="form-actions"><button type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button className="button button-primary" disabled={busy || uncertain} type="submit">{busy ? 'Saving case…' : 'Create sourcing case'}{!busy && <Icon name="arrow" size={17} />}</button></div>
    </form>
  </section>;
}
