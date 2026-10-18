import type { ReviewBatchAction, ReviewDraft, ReviewField, ReviewIssue } from './types';

export function hasFieldEvidence(field: ReviewField): boolean {
  return Boolean(field.source?.excerpt?.trim());
}

// Compare non-negative decimal strings without converting supplier amounts to floating point.
function compareDecimals(left: string, right: string): number {
  const [leftInteger, leftFraction = ''] = left.split('.');
  const [rightInteger, rightFraction = ''] = right.split('.');
  const a = leftInteger.replace(/^0+(?=\d)/, '');
  const b = rightInteger.replace(/^0+(?=\d)/, '');
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  if (a !== b) return a < b ? -1 : 1;
  const width = Math.max(leftFraction.length, rightFraction.length);
  const af = leftFraction.padEnd(width, '0');
  const bf = rightFraction.padEnd(width, '0');
  return af === bf ? 0 : af < bf ? -1 : 1;
}

/** Local review completeness and input-shape feedback, never eligibility or calculations. */
export function collectReviewIssues(fields: ReviewField[], draft: ReviewDraft): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  for (const field of fields) {
    const entry = draft[field.id];
    const value = entry?.value.trim() ?? '';
    const note = entry?.note.trim() ?? '';
    const impact = field.requiredFor ?? [];
    const required = impact.length > 0;
    const add = (suffix: string, title: string, message: string, kind: ReviewIssue['kind'], blocksConfirmation: boolean) => {
      issues.push({ id: `${field.id}-${suffix}`, fieldId: field.id, title, message, impact, kind, blocksConfirmation });
    };
    if (!value) {
      const clearedExtraction = Boolean(field.originalValue?.trim());
      if ((required || clearedExtraction) && (!entry?.reviewed || !note)) {
        add('missing', `${field.label} is missing`, 'Enter the value, or explicitly review it as unknown and explain what remains unresolved. It will stay missing in the saved record.', 'review', true);
      } else if (required || clearedExtraction) {
        add('unknown', `${field.label} remains unknown`, note, 'information', false);
      }
      continue;
    }
    if (field.kind === 'decimal' && !/^\d+(?:\.\d+)?$/.test(value)) {
      add('format', `Check ${field.label.toLowerCase()}`, 'Use a non-negative decimal with a dot, without separators or a unit. Do not guess an ambiguous number.', 'validation', true);
    }
    if (field.kind === 'decimal' && /^\d+(?:\.\d+)?$/.test(value) && field.numeric) {
      const { minimum, maximum, exclusiveMinimum, integer } = field.numeric;
      if (integer && !/^\d+(?:\.0+)?$/.test(value)) {
        add('integer', `Check ${field.label.toLowerCase()}`, 'Enter a whole number; a fractional value cannot be confirmed here.', 'validation', true);
      }
      if (minimum !== undefined && (compareDecimals(value, minimum) < 0 || (exclusiveMinimum && compareDecimals(value, minimum) === 0))) {
        add('minimum', `Check ${field.label.toLowerCase()}`, `Enter a value ${exclusiveMinimum ? 'greater than' : 'at least'} ${minimum}${field.unit ? ` ${field.unit}` : ''}, or leave it unknown.`, 'validation', true);
      }
      if (maximum !== undefined && compareDecimals(value, maximum) > 0) {
        add('maximum', `Check ${field.label.toLowerCase()}`, `Enter a value no greater than ${maximum}${field.unit ? ` ${field.unit}` : ''}, or leave it unknown.`, 'validation', true);
      }
    }
    if (field.kind === 'select' && !field.options?.some((option) => option.value === value)) {
      add('option', `Check ${field.label.toLowerCase()}`, 'Choose a supported value, or leave the field unknown and record the unresolved term.', 'validation', true);
    }
    if (field.kind === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value)) {
      add('date', `Check ${field.label.toLowerCase()}`, 'Enter a valid calendar date.', 'validation', true);
    }
    const changed = value !== (field.originalValue ?? '').trim();
    if ((changed || !hasFieldEvidence(field)) && entry?.basis === 'extracted') {
      add('basis', `Explain the basis for ${field.label.toLowerCase()}`, 'Choose a manual correction or an assumption. The original extraction and its source remain unchanged.', 'review', true);
    }
    if ((changed || !hasFieldEvidence(field) || entry?.basis !== 'extracted') && !note) {
      add('note', `Add a note for ${field.label.toLowerCase()}`, 'Record the evidence for your correction, or the assumption and its limitation.', 'review', true);
    }
    if (!entry?.reviewed) {
      add('review', `Review ${field.label.toLowerCase()}`, 'Check this value and its basis, then mark this field reviewed yourself.', 'review', true);
    }
  }
  return issues;
}

/** Guided presentation never changes which fields the server requires for confirmation. */
export function reviewPresentation(field: ReviewField, draft: ReviewDraft, issues: ReviewIssue[]): 'cited' | 'unknown' | 'individual' | 'optional' {
  const entry = draft[field.id];
  if (!entry || field.reviewIndividually) return 'individual';
  const localIssues = issues.filter(issue => issue.fieldId === field.id);
  const value = entry.value.trim();
  if (!value) {
    const required = Boolean(field.requiredFor?.length || field.originalValue?.trim() || localIssues.some(issue => issue.blocksConfirmation));
    if (!required && !entry.note && !entry.reviewed) return 'optional';
    if (required) return 'unknown';
    return 'individual';
  }
  const page = field.source?.page;
  const cited = entry.basis === 'extracted' && value === field.originalValue?.trim()
    && hasFieldEvidence(field) && typeof page === 'number' && Number.isInteger(page) && page >= 1;
  return cited && !localIssues.some(issue => issue.kind === 'validation' || issue.kind === 'hard_failure'
    || issue.blocksConfirmation && issue.id !== `${field.id}-review`) ? 'cited' : 'individual';
}

/** Apply only the exact displayed entries, all at once; reject a stale/invalid batch entirely. */
export function applyReviewBatch(fields: ReviewField[], draft: ReviewDraft, issues: ReviewIssue[], action: ReviewBatchAction): ReviewDraft {
  if (!action.fields.length || action.fields.length > fields.length || new Set(action.fields.map(item => item.id)).size !== action.fields.length) return draft;
  const note = action.note?.trim() ?? '';
  if (action.kind === 'unknown' && (!note || note.length > 500)) return draft;
  for (const item of action.fields) {
    const field = fields.find(candidate => candidate.id === item.id), entry = draft[item.id];
    if (!field || !entry || entry.reviewed || entry.value !== item.expected.value || entry.basis !== item.expected.basis
      || entry.note !== item.expected.note || entry.reviewed !== item.expected.reviewed
      || reviewPresentation(field, draft, issues) !== action.kind) return draft;
    if (action.kind === 'unknown' && (entry.value.trim() || entry.note.trim())) return draft;
  }
  const result = { ...draft };
  for (const { id } of action.fields) result[id] = { ...draft[id], reviewed: true, ...(action.kind === 'unknown' ? { note } : {}) };
  return result;
}
