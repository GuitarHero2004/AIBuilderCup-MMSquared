import type { CaseCreate } from '../../api/types';

export interface CaseFormValues {
  name: string;
  quantity: string;
  budget: string;
  leadTime: string;
  orderDate: string;
  destination: string;
}
export type FormErrors = Partial<Record<keyof CaseFormValues, string>>;

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function demoDefaults(): CaseFormValues {
  return { name: 'Woven fabric · synthetic demo', quantity: '50000', budget: '150000', leadTime: '25', orderDate: localDate(), destination: 'Fictional HCMC buyer facility' };
}

function positiveDecimal(value: string): boolean {
  return /^(0|[1-9]\d{0,11})(\.\d{1,6})?$/.test(value) && /[1-9]/.test(value);
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateCaseForm(values: CaseFormValues): FormErrors {
  const errors: FormErrors = {};
  const validText = (value: string) => !!value.trim() && value.trim().length <= 160
    && !Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  if (!validText(values.name)) errors.name = 'Use a case name between 1 and 160 characters, without control characters.';
  if (!positiveDecimal(values.quantity.trim())) errors.quantity = 'Enter positive metres: up to 12 digits and 6 decimal places, without commas.';
  if (!positiveDecimal(values.budget.trim())) errors.budget = 'Enter a positive USD amount: up to 12 digits and 6 decimal places, without commas.';
  if (!/^[1-9]\d*$/.test(values.leadTime) || !Number.isSafeInteger(Number(values.leadTime)) || Number(values.leadTime) > 3650) errors.leadTime = 'Enter 1–3,650 calendar days.';
  if (!validDate(values.orderDate)) errors.orderDate = 'Choose a valid order reference date.';
  if (!validText(values.destination)) errors.destination = 'Use a destination between 1 and 160 characters, without control characters.';
  return errors;
}

export function toCaseCreate(values: CaseFormValues): CaseCreate {
  if (Object.keys(validateCaseForm(values)).length) throw new Error('Correct the highlighted requirements before saving.');
  return {
    name: values.name.trim(),
    requirement: {
      quantity: values.quantity.trim(), quantity_unit: 'metre', order_reference_date: values.orderDate,
      maximum_lead_time_days: Number(values.leadTime), maximum_budget_amount: values.budget.trim(), currency: 'USD',
      destination: { label: values.destination.trim(), country_code: 'VN' },
      cost_basis_id: 'delivered_to_buyer_excluding_tax_v1',
      cost_basis_description: 'Material and declared delivery charges; excludes tax and duties',
      carbon_scope_id: 'origin_facility_to_buyer_facility_v1', carbon_accounting_boundary: 'wtw',
      textile_specification: {
        construction: 'woven', composition: [{ fibre: 'polyester', percentage: '65' }, { fibre: 'cotton', percentage: '35' }],
        composition_tolerance_pp: '2', target_gsm: '130', gsm_tolerance_pct: '5', minimum_usable_width_cm: '150',
        required_colour: null, required_finish: null, required_evidence: [],
      },
    },
  };
}
