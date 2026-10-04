import { describe, expect, it } from 'vitest';
import { demoDefaults, localDate, toCaseCreate, validateCaseForm } from './form';
import { formatDecimal } from './format';

describe('case requirements', () => {
  it('uses the local calendar date and labels the preset synthetic', () => {
    expect(localDate(new Date(2026, 9, 4, 0, 1))).toBe('2026-10-04');
    const payload = toCaseCreate(demoDefaults());
    expect(payload.name).toContain('synthetic demo');
    expect(payload.requirement.quantity).toBe('50000');
    expect(payload.requirement.destination.label).toContain('Fictional');
    expect(payload.requirement.textile_specification.required_evidence).toEqual([]);
    expect(payload).not.toHaveProperty('owner_uid');
    expect(payload).not.toHaveProperty('default_policy');
  });
  it('preserves decimal amounts exactly across validation, payload and display', () => {
    const values = { ...demoDefaults(), budget: '999999999999.999999', quantity: '0.000001' };
    expect(validateCaseForm(values)).toEqual({});
    expect(toCaseCreate(values).requirement.maximum_budget_amount).toBe('999999999999.999999');
    expect(formatDecimal(values.budget)).toBe('999,999,999,999.999999');
    expect(formatDecimal(values.quantity)).toBe('0.000001');
  });
  it.each(['0', '-1', 'NaN', 'Infinity', '1e5', '50,000', '00.5', '.1', '1000000000000', '1.0000001'])('rejects an invalid decimal %s', (value) => {
    const values = { ...demoDefaults(), quantity: value, budget: value };
    expect(validateCaseForm(values)).toHaveProperty('quantity');
    expect(validateCaseForm(values)).toHaveProperty('budget');
    expect(() => toCaseCreate(values)).toThrow();
  });
  it('rejects rolled-over dates, fractional lead time and text beyond the API limit', () => {
    const errors = validateCaseForm({ ...demoDefaults(), name: 'x'.repeat(161), destination: 'invalid\nlabel', orderDate: '2026-02-30', leadTime: '25.5' });
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['name', 'destination', 'orderDate', 'leadTime']));
    expect(validateCaseForm({ ...demoDefaults(), orderDate: '2028-02-29' })).toEqual({});
  });
});
